import prisma from "../config/prisma.js";

// Gom message dùng chung vào 1 nơi (DRY), đồng bộ style với auth.controller.js
const MESSAGES = {
  MISSING_TEN_SP: "Tên sản phẩm là bắt buộc.",
  MISSING_DANH_MUC: "Danh mục là bắt buộc.",
  INVALID_GIA_BAN: "Giá bán phải lớn hơn 0.",
  PRODUCT_NOT_FOUND: "Không tìm thấy sản phẩm.",
  PRODUCT_NAME_EXISTS: "Tên sản phẩm đã tồn tại.",
  PRODUCT_IN_USE: "Sản phẩm đã được sử dụng trong đơn hàng, không thể xoá.",
  CREATE_SUCCESS: "Thêm sản phẩm thành công.",
  DELETE_SUCCESS: "Xoá sản phẩm thành công.",
  SERVER_ERROR: "Đã có lỗi xảy ra, vui lòng thử lại sau.",
};

const LIST_SELECT_FIELDS = {
  MA_SP: true,
  TEN_SP: true,
  GIA_BAN: true,
  DANH_MUC: true,
  HINH_ANH: true,
  TRANG_THAI_MON: true,
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MAX_MA_SP_RETRY = 5;

/**
 * Helper chuẩn hoá response lỗi client-facing (đồng bộ với auth.controller.js).
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
  console.error(`[product.controller] ${context}:`, error);

  return res.status(500).json({
    success: false,
    message: MESSAGES.SERVER_ERROR,
    ...(process.env.NODE_ENV === "development" && { error: error.message }),
  });
};

/**
 * Parse "true"/"false" từ query string thành Boolean thực sự.
 * Trả về undefined nếu giá trị không hợp lệ để bỏ qua filter đó.
 */
const parseBooleanQuery = (value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

/**
 * Sinh MA_SP dạng SP001, SP002... dựa trên giá trị số lớn nhất hiện có,
 * lấy qua raw SQL để tránh bug sort theo string (giống getNextMaKh trong
 * auth.controller.js).
 */
const getNextMaSp = async () => {
  const result = await prisma.$queryRaw`
    SELECT COALESCE(MAX(CAST(SUBSTRING("MA_SP" FROM 3) AS INTEGER)), 0) AS max_num
    FROM "SAN_PHAM"
  `;

  const maxNum = Number(result[0].max_num);
  const nextNumber = maxNum + 1;

  return `SP${String(nextNumber).padStart(3, "0")}`;
};

/**
 * Sinh MA_SP + insert, retry khi gặp race condition (P2002 trên PK MA_SP),
 * đồng bộ kỹ thuật với createCustomerWithRetry trong auth.controller.js.
 */
const createProductWithRetry = async (productData) => {
  for (let attempt = 0; attempt < MAX_MA_SP_RETRY; attempt++) {
    const maSp = await getNextMaSp();

    try {
      return await prisma.sAN_PHAM.create({
        data: {
          MA_SP: maSp,
          ...productData,
        },
      });
    } catch (error) {
      const isMaSpConflict =
        error.code === "P2002" && error.meta?.target?.includes("MA_SP");

      if (isMaSpConflict) {
        continue; // thử lại với mã mới
      }

      throw error;
    }
  }

  throw new Error("Không thể tạo mã sản phẩm sau nhiều lần thử.");
};

/**
 * Validate dữ liệu tạo sản phẩm. Trả về message lỗi đầu tiên gặp phải,
 * hoặc null nếu hợp lệ.
 */
const validateCreateInput = ({ TEN_SP, GIA_BAN, DANH_MUC }) => {
  if (!TEN_SP || !TEN_SP.trim()) {
    return MESSAGES.MISSING_TEN_SP;
  }

  if (!DANH_MUC || !DANH_MUC.trim()) {
    return MESSAGES.MISSING_DANH_MUC;
  }

  if (typeof GIA_BAN !== "number" || Number.isNaN(GIA_BAN) || GIA_BAN <= 0) {
    return MESSAGES.INVALID_GIA_BAN;
  }

  return null;
};

/**
 * Validate dữ liệu update (chỉ validate field nào thực sự được truyền).
 */
const validateUpdateInput = ({ TEN_SP, GIA_BAN, DANH_MUC }) => {
  if (TEN_SP !== undefined && !TEN_SP.trim()) {
    return MESSAGES.MISSING_TEN_SP;
  }

  if (DANH_MUC !== undefined && !DANH_MUC.trim()) {
    return MESSAGES.MISSING_DANH_MUC;
  }

  if (
    GIA_BAN !== undefined &&
    (typeof GIA_BAN !== "number" || Number.isNaN(GIA_BAN) || GIA_BAN <= 0)
  ) {
    return MESSAGES.INVALID_GIA_BAN;
  }

  return null;
};

export const getAllProducts = async (req, res) => {
  try {
    const { page, limit, search, category, status } = req.query;

    // Parse & chặn giá trị bất thường (page/limit âm, quá lớn...)
    const currentPage = Math.max(parseInt(page, 10) || DEFAULT_PAGE, 1);
    const pageSize = Math.min(
      Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );

    // Chỉ thêm điều kiện filter khi query param thực sự được truyền,
    // tránh where rỗng gây filter sai (vd: TRANG_THAI_MON: undefined vẫn ổn
    // với Prisma, nhưng viết tường minh cho dễ đọc).
    const where = {};

    if (search) {
      where.TEN_SP = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (category) {
      where.DANH_MUC = category;
    }

    const parsedStatus = parseBooleanQuery(status);
    if (parsedStatus !== undefined) {
      where.TRANG_THAI_MON = parsedStatus;
    }

    // Chạy song song đếm tổng + lấy dữ liệu trang hiện tại để giảm latency.
    const [total, products] = await Promise.all([
      prisma.sAN_PHAM.count({ where }),
      prisma.sAN_PHAM.findMany({
        where,
        select: LIST_SELECT_FIELDS,
        orderBy: { TEN_SP: "asc" },
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 0,
      },
    });
  } catch (error) {
    return sendServerError(res, error, "getAllProducts");
  }
};

export const getProductById = async (req, res) => {
  try {
    const { MA_SP } = req.params;

    const product = await prisma.sAN_PHAM.findUnique({
      where: { MA_SP },
      select: LIST_SELECT_FIELDS,
    });

    if (!product) {
      return sendError(res, 404, MESSAGES.PRODUCT_NOT_FOUND);
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    return sendServerError(res, error, "getProductById");
  }
};

export const createProduct = async (req, res) => {
  try {
    const { TEN_SP, GIA_BAN, DANH_MUC, HINH_ANH, TRANG_THAI_MON } = req.body;

    const validationError = validateCreateInput({ TEN_SP, GIA_BAN, DANH_MUC });
    if (validationError) {
      return sendError(res, 400, validationError);
    }

    const normalizedTenSp = TEN_SP.trim();
    const normalizedDanhMuc = DANH_MUC.trim();

    // Không cho phép trùng tên sản phẩm (case-insensitive để tránh
    // "Trà sữa" và "trà sữa" bị coi là 2 sản phẩm khác nhau).
    const existingProduct = await prisma.sAN_PHAM.findFirst({
      where: {
        TEN_SP: {
          equals: normalizedTenSp,
          mode: "insensitive",
        },
      },
      select: { MA_SP: true },
    });

    if (existingProduct) {
      return sendError(res, 409, MESSAGES.PRODUCT_NAME_EXISTS);
    }

    try {
      await createProductWithRetry({
        TEN_SP: normalizedTenSp,
        GIA_BAN,
        DANH_MUC: normalizedDanhMuc,
        HINH_ANH: HINH_ANH ?? null,
        TRANG_THAI_MON: TRANG_THAI_MON ?? true,
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
    return sendServerError(res, error, "createProduct");
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { MA_SP } = req.params;
    const { TEN_SP, GIA_BAN, DANH_MUC, HINH_ANH, TRANG_THAI_MON } = req.body;

    const existingProduct = await prisma.sAN_PHAM.findUnique({
      where: { MA_SP },
    });

    if (!existingProduct) {
      return sendError(res, 404, MESSAGES.PRODUCT_NOT_FOUND);
    }

    const validationError = validateUpdateInput({ TEN_SP, GIA_BAN, DANH_MUC });
    if (validationError) {
      return sendError(res, 400, validationError);
    }

    // Chỉ build field thực sự được truyền trong body, tránh ghi đè bằng
    // undefined/null ngoài ý muốn.
    const dataToUpdate = {};

    if (TEN_SP !== undefined) {
      const normalizedTenSp = TEN_SP.trim();

      // Không cho phép đổi sang tên đã tồn tại ở SẢN PHẨM KHÁC.
      const duplicateProduct = await prisma.sAN_PHAM.findFirst({
        where: {
          TEN_SP: {
            equals: normalizedTenSp,
            mode: "insensitive",
          },
          MA_SP: { not: MA_SP },
        },
        select: { MA_SP: true },
      });

      if (duplicateProduct) {
        return sendError(res, 409, MESSAGES.PRODUCT_NAME_EXISTS);
      }

      dataToUpdate.TEN_SP = normalizedTenSp;
    }

    if (GIA_BAN !== undefined) {
      dataToUpdate.GIA_BAN = GIA_BAN;
    }

    if (DANH_MUC !== undefined) {
      dataToUpdate.DANH_MUC = DANH_MUC.trim();
    }

    if (HINH_ANH !== undefined) {
      dataToUpdate.HINH_ANH = HINH_ANH;
    }

    if (TRANG_THAI_MON !== undefined) {
      dataToUpdate.TRANG_THAI_MON = TRANG_THAI_MON;
    }

    const updatedProduct = await prisma.sAN_PHAM.update({
      where: { MA_SP },
      data: dataToUpdate,
      select: LIST_SELECT_FIELDS,
    });

    return res.status(200).json({
      success: true,
      data: updatedProduct,
    });
  } catch (error) {
    return sendServerError(res, error, "updateProduct");
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { MA_SP } = req.params;

    const existingProduct = await prisma.sAN_PHAM.findUnique({
      where: { MA_SP },
      select: { MA_SP: true },
    });

    if (!existingProduct) {
      return sendError(res, 404, MESSAGES.PRODUCT_NOT_FOUND);
    }

    // Kiểm tra sản phẩm đã từng nằm trong đơn hàng chưa trước khi cho xoá,
    // tránh phá vỡ tính toàn vẹn dữ liệu lịch sử đơn hàng.
    const usageCount = await prisma.cHI_TIET_DON_HANG.count({
      where: { MA_SP },
    });

    if (usageCount > 0) {
      return sendError(res, 409, MESSAGES.PRODUCT_IN_USE);
    }

    await prisma.sAN_PHAM.delete({
      where: { MA_SP },
    });

    return res.status(200).json({
      success: true,
      message: MESSAGES.DELETE_SUCCESS,
    });
  } catch (error) {
    return sendServerError(res, error, "deleteProduct");
  }
};