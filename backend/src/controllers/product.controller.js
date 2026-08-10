import prisma from "../config/prisma.js";

// Gom message dùng chung vào 1 nơi (DRY), đồng bộ style với auth.controller.js
const MESSAGES = {
  MISSING_TEN_SP: "Tên sản phẩm là bắt buộc.",
  MISSING_DANH_MUC: "Danh mục là bắt buộc.",
  INVALID_GIA_BAN: "Giá bán phải lớn hơn 0.",
  PRODUCT_NOT_FOUND: "Không tìm thấy sản phẩm.",
  PRODUCT_NAME_EXISTS: "Tên sản phẩm đã tồn tại.",
  PRODUCT_CODE_EXISTS: "Mã sản phẩm đã tồn tại.",
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

const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

const sendServerError = (res, error, context) => {
  console.error(`[product.controller] ${context}:`, error);

  return res.status(500).json({
    success: false,
    message: MESSAGES.SERVER_ERROR,
    ...(process.env.NODE_ENV === "development" && { error: error.message }),
  });
};

const parseBooleanQuery = (value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

/**
 * Sinh MA_SP tự động dạng SP001, SP002... khi client không truyền MA_SP
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

const createProductWithRetry = async (productData) => {
  for (let attempt = 0; attempt < MAX_MA_SP_RETRY; attempt++) {
    const maSp = productData.MA_SP || (await getNextMaSp());

    try {
      return await prisma.sAN_PHAM.create({
        data: {
          ...productData,
          MA_SP: maSp,
        },
      });
    } catch (error) {
      const isMaSpConflict =
        error.code === "P2002" && error.meta?.target?.includes("MA_SP");

      if (isMaSpConflict && !productData.MA_SP) {
        continue; // Chỉ retry nếu là mã tự sinh bị đụng độ
      }

      throw error;
    }
  }

  throw new Error("Không thể tạo mã sản phẩm sau nhiều lần thử.");
};

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

    const currentPage = Math.max(parseInt(page, 10) || DEFAULT_PAGE, 1);
    const pageSize = Math.min(
      Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );

    const where = {};

    if (search) {
      where.OR = [
        { TEN_SP: { contains: search, mode: "insensitive" } },
        { MA_SP: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.DANH_MUC = category;
    }

    const parsedStatus = parseBooleanQuery(status);
    if (parsedStatus !== undefined) {
      where.TRANG_THAI_MON = parsedStatus;
    }

    const [total, products] = await Promise.all([
      prisma.sAN_PHAM.count({ where }),
      prisma.sAN_PHAM.findMany({
        where,
        select: LIST_SELECT_FIELDS,
        orderBy: { MA_SP: "asc" },
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
    const { MA_SP, TEN_SP, GIA_BAN, DANH_MUC, HINH_ANH, TRANG_THAI_MON } = req.body;

    const numericPrice = Number(GIA_BAN);
    const validationError = validateCreateInput({ TEN_SP, GIA_BAN: numericPrice, DANH_MUC });
    if (validationError) {
      return sendError(res, 400, validationError);
    }

    const normalizedTenSp = TEN_SP.trim();
    const normalizedDanhMuc = DANH_MUC.trim();
    const normalizedMaSp = MA_SP ? MA_SP.trim() : undefined;

    // 1. Kiểm tra trùng MA_SP nếu người dùng nhập tay
    if (normalizedMaSp) {
      const existingCode = await prisma.sAN_PHAM.findUnique({
        where: { MA_SP: normalizedMaSp },
        select: { MA_SP: true },
      });
      if (existingCode) {
        return sendError(res, 409, MESSAGES.PRODUCT_CODE_EXISTS);
      }
    }

    // 2. Kiểm tra trùng TÊN SẢN PHẨM
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

    await createProductWithRetry({
      ...(normalizedMaSp && { MA_SP: normalizedMaSp }),
      TEN_SP: normalizedTenSp,
      GIA_BAN: numericPrice,
      DANH_MUC: normalizedDanhMuc,
      HINH_ANH: HINH_ANH ?? null,
      TRANG_THAI_MON: TRANG_THAI_MON ?? true,
    });

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

    const numericPrice = GIA_BAN !== undefined ? Number(GIA_BAN) : undefined;
    const validationError = validateUpdateInput({ TEN_SP, GIA_BAN: numericPrice, DANH_MUC });
    if (validationError) {
      return sendError(res, 400, validationError);
    }

    const dataToUpdate = {};

    if (TEN_SP !== undefined) {
      const normalizedTenSp = TEN_SP.trim();

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
      dataToUpdate.GIA_BAN = numericPrice;
    }

    if (DANH_MUC !== undefined) {
      dataToUpdate.DANH_MUC = DANH_MUC.trim();
    }

    if (HINH_ANH !== undefined) {
      dataToUpdate.HINH_ANH = HINH_ANH;
    }

    if (TRANG_THAI_MON !== undefined) {
      dataToUpdate.TRANG_THAI_MON = Boolean(TRANG_THAI_MON);
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

    // Kiểm tra sản phẩm đã từng nằm trong đơn hàng chưa
    const usageCount = await prisma.cHI_TIET_DON_HANG.count({
      where: { MA_SP },
    });

    if (usageCount > 0) {
      // Tự động chuyển sang Ngừng bán nếu đã từng được mua để bảo toàn dữ liệu lịch sử
      const updatedProduct = await prisma.sAN_PHAM.update({
        where: { MA_SP },
        data: { TRANG_THAI_MON: false },
        select: LIST_SELECT_FIELDS,
      });

      return res.status(200).json({
        success: true,
        message: "Sản phẩm đã có trong đơn hàng lịch sử. Đã chuyển trạng thái sang Ngừng bán.",
        data: updatedProduct,
      });
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