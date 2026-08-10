import prisma from "../config/prisma.js";
import { emitNewOrder, emitOrderStatusUpdate, emitOrderCancelled } from "../websockets/order.socket.js";

// Gom message dùng chung vào 1 nơi (DRY), đồng bộ style với auth/product/topping.controller.js
const MESSAGES = {
  MISSING_MA_KH: "Mã khách hàng là bắt buộc.",
  CUSTOMER_NOT_FOUND: "Không tìm thấy khách hàng.",
  MISSING_PTTT: "Phương thức thanh toán là bắt buộc.",
  MISSING_DIA_CHI: "Địa chỉ giao hàng là bắt buộc.",
  MISSING_PRODUCTS: "Đơn hàng phải có ít nhất một sản phẩm.",
  INVALID_PRODUCT_ITEM: "Thông tin sản phẩm trong đơn hàng không hợp lệ.",
  INVALID_SOLUONG: "Số lượng sản phẩm phải là số nguyên lớn hơn 0.",
  INVALID_TOPPING_LIST: "Danh sách topping không hợp lệ.",
  PRODUCT_NOT_FOUND: "Một hoặc nhiều sản phẩm trong đơn hàng không tồn tại.",
  TOPPING_NOT_FOUND: "Một hoặc nhiều topping trong đơn hàng không tồn tại.",
  ORDER_NOT_FOUND: "Không tìm thấy đơn hàng.",
  MISSING_TRANG_THAI: "Trạng thái đơn hàng là bắt buộc.",
  INVALID_TRANG_THAI: "Trạng thái đơn hàng không hợp lệ.",
  CANCEL_NOT_ALLOWED: "Không thể hủy đơn hàng đã hoàn thành.",
  CREATE_SUCCESS: "Tạo đơn hàng thành công.",
  DELETE_SUCCESS: "Xóa đơn hàng thành công.",
  SERVER_ERROR: "Đã có lỗi xảy ra, vui lòng thử lại sau.",
};

// Đồng bộ với danh sách trạng thái mô tả trong schema gốc.
const ORDER_STATUSES = [
  "CHỜ XÁC NHẬN",
  "ĐÃ XÁC NHẬN",
  "ĐANG PHA CHẾ",
  "ĐANG GIAO",
  "HOÀN THÀNH",
  "HỦY",
  "ĐÃ HỦY",
];
const DEFAULT_ORDER_STATUS = "CHỜ XÁC NHẬN";

// Select field an toàn cho KHACH_HANG khi include vào đơn hàng — tuyệt đối
// không select MAT_KHAU/GOOGLE_ID/FACEBOOK_ID/FCM_TOKEN.
const CUSTOMER_SAFE_SELECT = {
  MA_KH: true,
  TEN: true,
  SDT: true,
  EMAIL: true,
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MAX_ORDER_RETRY = 5;

/**
 * Helper chuẩn hoá response lỗi client-facing (đồng bộ với các controller khác).
 */
const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

/**
 * Không trả error.message thô ra client, log đầy đủ ở server.
 * Chỉ lộ chi tiết khi NODE_ENV=development để tiện debug local.
 */
const sendServerError = (res, error, context) => {
  console.error(`[order.controller] ${context}:`, error);

  return res.status(500).json({
    success: false,
    message: MESSAGES.SERVER_ERROR,
    ...(process.env.NODE_ENV === "development" && { error: error.message }),
  });
};

/**
 * Sinh MA_DH dạng DH001, DH002... dựa trên giá trị số lớn nhất hiện có.
 */
const getNextMaDh = async (client) => {
  const result = await client.$queryRaw`
    SELECT COALESCE(MAX(CAST(SUBSTRING("MA_DH" FROM 3) AS INTEGER)), 0) AS max_num
    FROM "DON_HANG"
  `;

  const maxNum = Number(result[0].max_num);
  return `DH${String(maxNum + 1).padStart(3, "0")}`;
};

/**
 * Lấy số thứ tự lớn nhất hiện có của MA_CHI_TIET (chỉ phần số).
 */
const getNextChiTietBaseNumber = async (client) => {
  const result = await client.$queryRaw`
    SELECT COALESCE(MAX(CAST(SUBSTRING("MA_CHI_TIET" FROM 3) AS INTEGER)), 0) AS max_num
    FROM "CHI_TIET_DON_HANG"
  `;

  return Number(result[0].max_num);
};

/**
 * Validate dữ liệu tạo đơn hàng ở mức cấu trúc.
 */
const validateCreateOrderInput = ({ MA_KH, PTTT, DIA_CHI_GIAO_HANG, products }) => {
  if (!MA_KH || typeof MA_KH !== "string") {
    return MESSAGES.MISSING_MA_KH;
  }

  if (!PTTT || typeof PTTT !== "string") {
    return MESSAGES.MISSING_PTTT;
  }

  if (!DIA_CHI_GIAO_HANG || typeof DIA_CHI_GIAO_HANG !== "string") {
    return MESSAGES.MISSING_DIA_CHI;
  }

  if (!Array.isArray(products) || products.length === 0) {
    return MESSAGES.MISSING_PRODUCTS;
  }

  for (const item of products) {
    if (!item || typeof item.MA_SP !== "string" || !item.MA_SP.trim()) {
      return MESSAGES.INVALID_PRODUCT_ITEM;
    }

    if (!Number.isInteger(item.SOLUONG) || item.SOLUONG <= 0) {
      return MESSAGES.INVALID_SOLUONG;
    }

    if (item.TOPPINGS !== undefined) {
      const isValidToppingList =
        Array.isArray(item.TOPPINGS) &&
        item.TOPPINGS.every((id) => typeof id === "string" && id.trim());

      if (!isValidToppingList) {
        return MESSAGES.INVALID_TOPPING_LIST;
      }
    }
  }

  return null;
};

/**
 * Thực hiện toàn bộ việc tạo đơn hàng trong 1 Prisma Transaction + Retry logic.
 */
const createOrderWithRetry = async ({
  MA_KH,
  PTTT,
  DIA_CHI_GIAO_HANG,
  LATITUDE,
  LONGITUDE,
  PHI_SHIP,
  TONG_TIEN,
  orderItems,
}) => {
  for (let attempt = 0; attempt < MAX_ORDER_RETRY; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const maDh = await getNextMaDh(tx);
        let nextChiTietNumber = (await getNextChiTietBaseNumber(tx)) + 1;

        await tx.dON_HANG.create({
          data: {
            MA_DH: maDh,
            MA_KH,
            PTTT,
            DIA_CHI_GIAO_HANG,
            LATITUDE: LATITUDE ?? null,
            LONGITUDE: LONGITUDE ?? null,
            PHI_SHIP: PHI_SHIP ?? 0,
            TONG_TIEN,
            TRANG_THAI: DEFAULT_ORDER_STATUS,
          },
        });

        for (const item of orderItems) {
          const maChiTiet = `CT${String(nextChiTietNumber).padStart(3, "0")}`;
          nextChiTietNumber += 1;

          await tx.cHI_TIET_DON_HANG.create({
            data: {
              MA_CHI_TIET: maChiTiet,
              MA_DH: maDh,
              MA_SP: item.MA_SP,
              SOLUONG: item.SOLUONG,
              THANHTIEN: item.THANHTIEN,
            },
          });

          if (item.toppingIds.length > 0) {
            await tx.tHEM_TOPPING.createMany({
              data: item.toppingIds.map((maTopping) => ({
                MA_CHI_TIET: maChiTiet,
                MA_TOPPING: maTopping,
              })),
            });
          }
        }

        return maDh;
      });
    } catch (error) {
      const isCodeConflict =
        error.code === "P2002" &&
        (error.meta?.target?.includes("MA_DH") ||
          error.meta?.target?.includes("MA_CHI_TIET"));

      if (isCodeConflict) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Không thể tạo đơn hàng sau nhiều lần thử.");
};

export const getAllOrders = async (req, res) => {
  try {
    const { page, limit, status, search, pttt, startDate, endDate, minAmount, maxAmount } = req.query;

    const currentPage = Math.max(parseInt(page, 10) || DEFAULT_PAGE, 1);
    const pageSize = Math.min(
      Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );

    const where = {};

    // 1.2 Tìm kiếm theo MA_DH, TEN khách hàng, SDT khách hàng
    if (search && search.trim() !== "") {
      const keyword = search.trim();
      where.OR = [
        { MA_DH: { contains: keyword, mode: "insensitive" } },
        { KHACH_HANG: { TEN: { contains: keyword, mode: "insensitive" } } },
        { KHACH_HANG: { SDT: { contains: keyword, mode: "insensitive" } } },
      ];
    }

    // 1.3 Lọc theo trạng thái đơn hàng
    if (status) {
      where.TRANG_THAI = status;
    }

    // Lọc theo phương thức thanh toán
    if (pttt) {
      where.PTTT = pttt;
    }

    // Lọc theo khoảng thời gian
    if (startDate || endDate) {
      where.NGAY_DAT = {};
      if (startDate) where.NGAY_DAT.gte = new Date(startDate);
      if (endDate) where.NGAY_DAT.lte = new Date(endDate);
    }

    // Lọc theo khoảng giá/tổng tiền
    if (minAmount || maxAmount) {
      where.TONG_TIEN = {};
      if (minAmount) where.TONG_TIEN.gte = parseFloat(minAmount);
      if (maxAmount) where.TONG_TIEN.lte = parseFloat(maxAmount);
    }

    const [total, orders] = await Promise.all([
      prisma.dON_HANG.count({ where }),
      prisma.dON_HANG.findMany({
        where,
        orderBy: { NGAY_DAT: "desc" },
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
        include: {
          KHACH_HANG: {
            select: CUSTOMER_SAFE_SELECT,
          },
          CHI_TIET_DON_HANG: {
            include: {
              SAN_PHAM: true,
              THEM_TOPPING: {
                include: { TOPPING: true },
              },
            },
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 0,
      },
    });
  } catch (error) {
    return sendServerError(res, error, "getAllOrders");
  }
};

/**
 * Lấy danh sách đơn hàng CỦA TÔI (Khách hàng đang đăng nhập)
 */
export const getMyOrders = async (req, res) => {
  try {
    const maKh = req.user?.MA_KH || req.user?.id;

    if (!maKh) {
      return res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
    }

    const orders = await prisma.dON_HANG.findMany({
      where: { MA_KH: maKh },
      orderBy: { NGAY_DAT: "desc" },
      include: {
        CHI_TIET_DON_HANG: {
          include: {
            SAN_PHAM: true,
            THEM_TOPPING: {
              include: {
                TOPPING: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    return sendServerError(res, error, "getMyOrders");
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { MA_DH } = req.params;

    const order = await prisma.dON_HANG.findUnique({
      where: { MA_DH },
      include: {
        KHACH_HANG: {
          select: CUSTOMER_SAFE_SELECT,
        },
        CHI_TIET_DON_HANG: {
          include: {
            SAN_PHAM: true,
            THEM_TOPPING: {
              include: {
                TOPPING: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return sendError(res, 404, MESSAGES.ORDER_NOT_FOUND);
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    return sendServerError(res, error, "getOrderById");
  }
};

export const createOrder = async (req, res) => {
  try {
    const MA_KH = req.user?.MA_KH || req.body.MA_KH;

    const {
      PTTT,
      DIA_CHI_GIAO_HANG,
      LATITUDE,
      LONGITUDE,
      PHI_SHIP,
      products,
    } = req.body;

    const validationError = validateCreateOrderInput({
      MA_KH,
      PTTT,
      DIA_CHI_GIAO_HANG,
      products,
    });
    if (validationError) {
      return sendError(res, 400, validationError);
    }

    // Kiểm tra khách hàng tồn tại.
    const existingCustomer = await prisma.kHACH_HANG.findUnique({
      where: { MA_KH },
      select: { MA_KH: true },
    });

    if (!existingCustomer) {
      return sendError(res, 404, MESSAGES.CUSTOMER_NOT_FOUND);
    }

    // Gom danh sách MA_SP / MA_TOPPING duy nhất.
    const uniqueProductIds = [...new Set(products.map((item) => item.MA_SP))];
    const uniqueToppingIds = [
      ...new Set(products.flatMap((item) => item.TOPPINGS ?? [])),
    ];

    const [foundProducts, foundToppings] = await Promise.all([
      prisma.sAN_PHAM.findMany({
        where: { MA_SP: { in: uniqueProductIds } },
        select: { MA_SP: true, GIA_BAN: true },
      }),
      uniqueToppingIds.length > 0
        ? prisma.tOPPING.findMany({
            where: { MA_TOPPING: { in: uniqueToppingIds } },
            select: { MA_TOPPING: true, GIA_TOPPING: true },
          })
        : Promise.resolve([]),
    ]);

    if (foundProducts.length !== uniqueProductIds.length) {
      return sendError(res, 404, MESSAGES.PRODUCT_NOT_FOUND);
    }

    if (foundToppings.length !== uniqueToppingIds.length) {
      return sendError(res, 404, MESSAGES.TOPPING_NOT_FOUND);
    }

    const productPriceMap = new Map(
      foundProducts.map((product) => [product.MA_SP, Number(product.GIA_BAN)])
    );
    const toppingPriceMap = new Map(
      foundToppings.map((topping) => [topping.MA_TOPPING, Number(topping.GIA_TOPPING)])
    );

    // Tính THANHTIEN từng dòng sản phẩm (An toàn với fallback || 0)
    const orderItems = products.map((item) => {
      const toppingIds = item.TOPPINGS ?? [];
      const toppingsTotal = toppingIds.reduce(
        (sum, maTopping) => sum + (toppingPriceMap.get(maTopping) || 0),
        0
      );
      const unitPrice = (productPriceMap.get(item.MA_SP) || 0) + toppingsTotal;

      return {
        MA_SP: item.MA_SP,
        SOLUONG: item.SOLUONG,
        THANHTIEN: unitPrice * item.SOLUONG,
        toppingIds,
      };
    });

    const tongTien =
      orderItems.reduce((sum, item) => sum + item.THANHTIEN, 0) +
      (PHI_SHIP ?? 0);

    const createdMaDh = await createOrderWithRetry({
      MA_KH,
      PTTT,
      DIA_CHI_GIAO_HANG,
      LATITUDE,
      LONGITUDE,
      PHI_SHIP,
      TONG_TIEN: tongTien,
      orderItems,
    });

    // --- BẮN WEBSOCKET TỰ ĐỘNG KHI TẠO ĐƠN THÀNH CÔNG ---
    try {
      const fullOrder = await prisma.dON_HANG.findUnique({
        where: { MA_DH: createdMaDh },
        include: {
          KHACH_HANG: {
            select: CUSTOMER_SAFE_SELECT,
          },
          CHI_TIET_DON_HANG: {
            include: {
              SAN_PHAM: true,
              THEM_TOPPING: {
                include: { TOPPING: true },
              },
            },
          },
        },
      });

      if (fullOrder) {
        emitNewOrder(fullOrder);
      }
    } catch (socketError) {
      console.error("[order.controller] Socket emit error on createOrder:", socketError);
    }

    // Trả về kèm MA_DH tạo mới để client tiện xử lý UI/chuyển màn hình
    return res.status(201).json({
      success: true,
      message: MESSAGES.CREATE_SUCCESS,
      data: {
        MA_DH: createdMaDh,
      },
    });
  } catch (error) {
    return sendServerError(res, error, "createOrder");
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { MA_DH } = req.params;
    const { TRANG_THAI, LY_DO_HUY } = req.body;

    const existingOrder = await prisma.dON_HANG.findUnique({
      where: { MA_DH },
      select: { MA_DH: true, MA_KH: true, TRANG_THAI: true },
    });

    if (!existingOrder) {
      return sendError(res, 404, MESSAGES.ORDER_NOT_FOUND);
    }

    if (!TRANG_THAI || typeof TRANG_THAI !== "string") {
      return sendError(res, 400, MESSAGES.MISSING_TRANG_THAI);
    }

    if (!ORDER_STATUSES.includes(TRANG_THAI)) {
      return sendError(res, 400, MESSAGES.INVALID_TRANG_THAI);
    }

    // 1.6 Kiểm tra quy tắc không cho phép hủy đơn đã HOÀN THÀNH
    if (existingOrder.TRANG_THAI === "HOÀN THÀNH" && (TRANG_THAI === "HỦY" || TRANG_THAI === "ĐÃ HỦY")) {
      return sendError(res, 400, MESSAGES.CANCEL_NOT_ALLOWED);
    }

    const updatedOrder = await prisma.dON_HANG.update({
      where: { MA_DH },
      data: { TRANG_THAI },
    });

    // --- BẮN WEBSOCKET TỰ ĐỘNG KHI CẬP NHẬT TRẠNG THÁI ---
    try {
      if (TRANG_THAI === "HỦY" || TRANG_THAI === "ĐÃ HỦY") {
        emitOrderCancelled(updatedOrder.MA_KH, updatedOrder, LY_DO_HUY);
      } else {
        emitOrderStatusUpdate(updatedOrder.MA_KH, updatedOrder);
      }
    } catch (socketError) {
      console.error("[order.controller] Socket emit error on updateOrderStatus:", socketError);
    }

    return res.status(200).json({
      success: true,
      data: updatedOrder,
    });
  } catch (error) {
    return sendServerError(res, error, "updateOrderStatus");
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const { MA_DH } = req.params;

    const existingOrder = await prisma.dON_HANG.findUnique({
      where: { MA_DH },
      select: { MA_DH: true },
    });

    if (!existingOrder) {
      return sendError(res, 404, MESSAGES.ORDER_NOT_FOUND);
    }

    await prisma.$transaction(async (tx) => {
      await tx.tHEM_TOPPING.deleteMany({
        where: { CHI_TIET_DON_HANG: { MA_DH } },
      });

      await tx.cHI_TIET_DON_HANG.deleteMany({
        where: { MA_DH },
      });

      await tx.dON_HANG.delete({
        where: { MA_DH },
      });
    });

    return res.status(200).json({
      success: true,
      message: MESSAGES.DELETE_SUCCESS,
    });
  } catch (error) {
    return sendServerError(res, error, "deleteOrder");
  }
};