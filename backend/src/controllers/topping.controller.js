import prisma from "../config/prisma.js";

// Gom message dùng chung vào 1 nơi (DRY), đồng bộ style với auth.controller.js / product.controller.js
const MESSAGES = {
  MISSING_TEN_TOPPING: "Tên topping là bắt buộc.",
  INVALID_GIA_TOPPING: "Giá topping phải lớn hơn 0.",
  TOPPING_NOT_FOUND: "Không tìm thấy topping.",
  TOPPING_NAME_EXISTS: "Tên topping đã tồn tại.",
  TOPPING_IN_USE: "Topping đã được sử dụng trong đơn hàng, không thể xoá.",
  CREATE_SUCCESS: "Thêm topping thành công.",
  DELETE_SUCCESS: "Xoá topping thành công.",
  SERVER_ERROR: "Đã có lỗi xảy ra, vui lòng thử lại sau.",
};

const LIST_SELECT_FIELDS = {
  MA_TOPPING: true,
  TEN_TOPPING: true,
  GIA_TOPPING: true,
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MAX_MA_TOPPING_RETRY = 5;

/**
 * Helper chuẩn hoá response lỗi client-facing (đồng bộ với auth.controller.js / product.controller.js).
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
  console.error(`[topping.controller] ${context}:`, error);

  return res.status(500).json({
    success: false,
    message: MESSAGES.SERVER_ERROR,
    ...(process.env.NODE_ENV === "development" && { error: error.message }),
  });
};

/**
 * Sinh MA_TOPPING dạng TP001, TP002... dựa trên giá trị số lớn nhất hiện có,
 * lấy qua raw SQL để tránh bug sort theo string (giống getNextMaKh /
 * getNextMaSp).
 */
const getNextMaTopping = async () => {
  const result = await prisma.$queryRaw`
    SELECT COALESCE(MAX(CAST(SUBSTRING("MA_TOPPING" FROM 3) AS INTEGER)), 0) AS max_num
    FROM "TOPPING"
  `;

  const maxNum = Number(result[0].max_num);
  const nextNumber = maxNum + 1;

  return `TP${String(nextNumber).padStart(3, "0")}`;
};

/**
 * Sinh MA_TOPPING + insert, retry khi gặp race condition (P2002 trên PK
 * MA_TOPPING), đồng bộ kỹ thuật với createCustomerWithRetry /
 * createProductWithRetry.
 */
const createToppingWithRetry = async (toppingData) => {
  for (let attempt = 0; attempt < MAX_MA_TOPPING_RETRY; attempt++) {
    const maTopping = await getNextMaTopping();

    try {
      return await prisma.tOPPING.create({
        data: {
          MA_TOPPING: maTopping,
          ...toppingData,
        },
      });
    } catch (error) {
      const isMaToppingConflict =
        error.code === "P2002" && error.meta?.target?.includes("MA_TOPPING");

      if (isMaToppingConflict) {
        continue; // thử lại với mã mới
      }

      throw error;
    }
  }

  throw new Error("Không thể tạo mã topping sau nhiều lần thử.");
};

/**
 * Validate dữ liệu tạo topping. Trả về message lỗi đầu tiên gặp phải,
 * hoặc null nếu hợp lệ.
 */
const validateCreateInput = ({ TEN_TOPPING, GIA_TOPPING }) => {
  if (!TEN_TOPPING || !TEN_TOPPING.trim()) {
    return MESSAGES.MISSING_TEN_TOPPING;
  }

  if (
    typeof GIA_TOPPING !== "number" ||
    Number.isNaN(GIA_TOPPING) ||
    GIA_TOPPING <= 0
  ) {
    return MESSAGES.INVALID_GIA_TOPPING;
  }

  return null;
};

/**
 * Validate dữ liệu update (chỉ validate field nào thực sự được truyền).
 */
const validateUpdateInput = ({ TEN_TOPPING, GIA_TOPPING }) => {
  if (TEN_TOPPING !== undefined && !TEN_TOPPING.trim()) {
    return MESSAGES.MISSING_TEN_TOPPING;
  }

  if (
    GIA_TOPPING !== undefined &&
    (typeof GIA_TOPPING !== "number" ||
      Number.isNaN(GIA_TOPPING) ||
      GIA_TOPPING <= 0)
  ) {
    return MESSAGES.INVALID_GIA_TOPPING;
  }

  return null;
};

export const getAllToppings = async (req, res) => {
  try {
    const { page, limit, search } = req.query;

    // Parse & chặn giá trị bất thường (page/limit âm, quá lớn...)
    const currentPage = Math.max(parseInt(page, 10) || DEFAULT_PAGE, 1);
    const pageSize = Math.min(
      Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );

    // Chỉ thêm điều kiện filter khi query param thực sự được truyền.
    const where = {};

    if (search) {
      where.TEN_TOPPING = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Chạy song song đếm tổng + lấy dữ liệu trang hiện tại để giảm latency.
    const [total, toppings] = await Promise.all([
      prisma.tOPPING.count({ where }),
      prisma.tOPPING.findMany({
        where,
        select: LIST_SELECT_FIELDS,
        orderBy: { TEN_TOPPING: "asc" },
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: toppings,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 0,
      },
    });
  } catch (error) {
    return sendServerError(res, error, "getAllToppings");
  }
};

export const getToppingById = async (req, res) => {
  try {
    const { MA_TOPPING } = req.params;

    const topping = await prisma.tOPPING.findUnique({
      where: { MA_TOPPING },
      select: LIST_SELECT_FIELDS,
    });

    if (!topping) {
      return sendError(res, 404, MESSAGES.TOPPING_NOT_FOUND);
    }

    return res.status(200).json({
      success: true,
      data: topping,
    });
  } catch (error) {
    return sendServerError(res, error, "getToppingById");
  }
};

export const createTopping = async (req, res) => {
  try {
    const { TEN_TOPPING, GIA_TOPPING } = req.body;

    const validationError = validateCreateInput({ TEN_TOPPING, GIA_TOPPING });
    if (validationError) {
      return sendError(res, 400, validationError);
    }

    const normalizedTenTopping = TEN_TOPPING.trim();

    // Không cho phép trùng tên topping (case-insensitive để tránh
    // "Trân châu" và "trân châu" bị coi là 2 topping khác nhau).
    const existingTopping = await prisma.tOPPING.findFirst({
      where: {
        TEN_TOPPING: {
          equals: normalizedTenTopping,
          mode: "insensitive",
        },
      },
      select: { MA_TOPPING: true },
    });

    if (existingTopping) {
      return sendError(res, 409, MESSAGES.TOPPING_NAME_EXISTS);
    }

    try {
      await createToppingWithRetry({
        TEN_TOPPING: normalizedTenTopping,
        GIA_TOPPING,
      });
    } catch (error) {
      // Không trả lỗi Prisma trực tiếp cho client, xử lý qua catch chung.
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: MESSAGES.CREATE_SUCCESS,
    });
  } catch (error) {
    return sendServerError(res, error, "createTopping");
  }
};

export const updateTopping = async (req, res) => {
  try {
    const { MA_TOPPING } = req.params;
    const { TEN_TOPPING, GIA_TOPPING } = req.body;

    const existingTopping = await prisma.tOPPING.findUnique({
      where: { MA_TOPPING },
    });

    if (!existingTopping) {
      return sendError(res, 404, MESSAGES.TOPPING_NOT_FOUND);
    }

    const validationError = validateUpdateInput({ TEN_TOPPING, GIA_TOPPING });
    if (validationError) {
      return sendError(res, 400, validationError);
    }

    // Chỉ build field thực sự được truyền trong body, tránh ghi đè bằng
    // undefined/null ngoài ý muốn.
    const dataToUpdate = {};

    if (TEN_TOPPING !== undefined) {
      const normalizedTenTopping = TEN_TOPPING.trim();

      // Không cho phép đổi sang tên đã tồn tại ở TOPPING KHÁC.
      const duplicateTopping = await prisma.tOPPING.findFirst({
        where: {
          TEN_TOPPING: {
            equals: normalizedTenTopping,
            mode: "insensitive",
          },
          MA_TOPPING: { not: MA_TOPPING },
        },
        select: { MA_TOPPING: true },
      });

      if (duplicateTopping) {
        return sendError(res, 409, MESSAGES.TOPPING_NAME_EXISTS);
      }

      dataToUpdate.TEN_TOPPING = normalizedTenTopping;
    }

    if (GIA_TOPPING !== undefined) {
      dataToUpdate.GIA_TOPPING = GIA_TOPPING;
    }

    const updatedTopping = await prisma.tOPPING.update({
      where: { MA_TOPPING },
      data: dataToUpdate,
      select: LIST_SELECT_FIELDS,
    });

    return res.status(200).json({
      success: true,
      data: updatedTopping,
    });
  } catch (error) {
    return sendServerError(res, error, "updateTopping");
  }
};

export const deleteTopping = async (req, res) => {
  try {
    const { MA_TOPPING } = req.params;

    const existingTopping = await prisma.tOPPING.findUnique({
      where: { MA_TOPPING },
      select: { MA_TOPPING: true },
    });

    if (!existingTopping) {
      return sendError(res, 404, MESSAGES.TOPPING_NOT_FOUND);
    }

    // Kiểm tra topping đã từng được thêm vào đơn hàng chưa (qua bảng trung
    // gian THEM_TOPPING) trước khi cho xoá, tránh phá vỡ tính toàn vẹn dữ
    // liệu lịch sử đơn hàng.
    const usageCount = await prisma.tHEM_TOPPING.count({
      where: { MA_TOPPING },
    });

    if (usageCount > 0) {
      return sendError(res, 409, MESSAGES.TOPPING_IN_USE);
    }

    await prisma.tOPPING.delete({
      where: { MA_TOPPING },
    });

    return res.status(200).json({
      success: true,
      message: MESSAGES.DELETE_SUCCESS,
    });
  } catch (error) {
    return sendServerError(res, error, "deleteTopping");
  }
};