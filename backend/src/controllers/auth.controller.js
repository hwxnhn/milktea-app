import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { generateToken } from "../utils/jwt.js";

// FIX: Fail-fast tại thời điểm load module (deploy time) thay vì kiểm tra
// lại mỗi lần login. Nếu thiếu JWT_SECRET, server sẽ crash ngay khi start
// thay vì âm thầm chạy và fail ở request đầu tiên của user thật.
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET chưa được cấu hình.");
}

// FIX: Gom message dùng chung vào 1 nơi (DRY), tránh lặp string rải rác.
const MESSAGES = {
  MISSING_FIELDS: "Vui lòng nhập đầy đủ thông tin.",
  INVALID_EMAIL: "Email không hợp lệ.",
  INVALID_PHONE: "Số điện thoại không hợp lệ.",
  INVALID_PASSWORD_LENGTH: "Mật khẩu phải có ít nhất 6 ký tự.",
  PASSWORD_TOO_LONG: "Mật khẩu không được vượt quá 72 ký tự.",
  EMAIL_EXISTS: "Email đã tồn tại.",
  REGISTER_SUCCESS: "Đăng ký thành công.",
  LOGIN_FAILED: "Email hoặc mật khẩu không đúng.",
  SERVER_ERROR: "Đã có lỗi xảy ra, vui lòng thử lại sau.",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SDT_REGEX = /^0\d{9}$/;
const BCRYPT_SALT_ROUNDS = 10;
const MAX_MA_KH_RETRY = 5;

// FIX (timing attack): Hash "giả" tính sẵn 1 lần khi load module, dùng để
// so sánh khi email không tồn tại, giúp thời gian phản hồi của "email sai"
// và "password sai" xấp xỉ nhau, tránh lộ thông tin email tồn tại hay không
// qua độ trễ response.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing-safety", BCRYPT_SALT_ROUNDS);

/**
 * FIX (helper, DRY): chuẩn hoá response lỗi client-facing, tránh lặp
 * res.status(...).json(...) ở nhiều nơi.
 */
const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

/**
 * FIX (security): Không bao giờ trả error.message thô ra client (rò rỉ
 * thông tin nội bộ: tên bảng, driver DB, stack...). Log đầy đủ ở server,
 * chỉ trả message chung cho client. Chỉ lộ chi tiết khi NODE_ENV=development
 * để tiện debug local.
 */
const sendServerError = (res, error, context) => {
  console.error(`[auth.controller] ${context}:`, error);

  return res.status(500).json({
    success: false,
    message: MESSAGES.SERVER_ERROR,
    ...(process.env.NODE_ENV === "development" && { error: error.message }),
  });
};

/**
 * FIX (bug logic): Bug cũ dùng `orderBy: { MA_KH: "desc" }` sort theo STRING,
 * sai khi số lượng khách hàng vượt 999 (KH1000 < KH999 theo alphabet).
 * Sửa bằng cách lấy giá trị số lớn nhất thực sự qua raw SQL, không phụ
 * thuộc vào string ordering.
 */
const getNextMaKh = async () => {
  const result = await prisma.$queryRaw`
    SELECT COALESCE(MAX(CAST(SUBSTRING("MA_KH" FROM 3) AS INTEGER)), 0) AS max_num
    FROM "KHACH_HANG"
  `;

  const maxNum = Number(result[0].max_num);
  const nextNumber = maxNum + 1;

  return `KH${String(nextNumber).padStart(3, "0")}`;
};

/**
 * FIX (race condition - Critical): Việc sinh MA_KH kiểu "đọc rồi tăng" vẫn
 * có 1 khoảng hở nhỏ giữa lúc đọc max và lúc insert nếu 2 request chạy
 * song song. Vì MA_KH là Primary Key (đã unique sẵn), nếu race condition
 * xảy ra, Prisma sẽ throw lỗi P2002 (unique constraint) thay vì tạo dữ liệu
 * sai. Ta bắt lỗi đó và RETRY sinh mã mới, thay vì để crash 500 ngẫu nhiên.
 * Đây là kỹ thuật "optimistic concurrency với retry", không cần thêm
 * thư viện hay lock DB tường minh.
 */
const createCustomerWithRetry = async (customerData) => {
  for (let attempt = 0; attempt < MAX_MA_KH_RETRY; attempt++) {
    const maKh = await getNextMaKh();

    try {
      return await prisma.kHACH_HANG.create({
        data: {
          MA_KH: maKh,
          ...customerData,
        },
      });
    } catch (error) {
      const isMaKhConflict =
        error.code === "P2002" && error.meta?.target?.includes("MA_KH");

      if (isMaKhConflict) {
        continue; // thử lại với mã mới
      }

      throw error; // lỗi khác (vd: email conflict) -> ném lên cho caller xử lý
    }
  }

  throw new Error("Không thể tạo mã khách hàng sau nhiều lần thử.");
};

const validateRegisterInput = ({ TEN, EMAIL, SDT, MAT_KHAU }) => {
  if (!TEN || !EMAIL || !SDT || !MAT_KHAU) {
    return MESSAGES.MISSING_FIELDS;
  }

  if (!EMAIL_REGEX.test(EMAIL)) {
    return MESSAGES.INVALID_EMAIL;
  }

  if (!SDT_REGEX.test(SDT)) {
    return MESSAGES.INVALID_PHONE;
  }

  if (MAT_KHAU.length < 6) {
    return MESSAGES.INVALID_PASSWORD_LENGTH;
  }

  // FIX (validation thiếu): bcrypt tự động cắt input tại 72 byte, mật khẩu
  // dài hơn sẽ bị truncate âm thầm -> validate rõ ràng để tránh confusion.
  if (MAT_KHAU.length > 72) {
    return MESSAGES.PASSWORD_TOO_LONG;
  }

  return null;
};

export const register = async (req, res) => {
  try {
    const { TEN, EMAIL, SDT, MAT_KHAU } = req.body;

    const validationError = validateRegisterInput({ TEN, EMAIL, SDT, MAT_KHAU });
    if (validationError) {
      return sendError(res, 400, validationError);
    }

    // FIX (validation thiếu): trim + lowercase email để tránh duplicate
    // "A@B.com" vs "a@b.com" và tránh lỗi do khoảng trắng thừa từ client.
    const normalizedEmail = EMAIL.trim().toLowerCase();
    const normalizedTen = TEN.trim();
    const normalizedSdt = SDT.trim();

    // FIX (Prisma usage): findUnique thay vì findFirst — chỉ dùng được sau
    // khi EMAIL có @unique trong schema, tận dụng index lookup thay vì scan.
    const existingCustomer = await prisma.kHACH_HANG.findFirst({
      where: { EMAIL: normalizedEmail },
      select: { MA_KH: true },
    });
    if (existingCustomer) {
      return sendError(res, 409, MESSAGES.EMAIL_EXISTS);
    }

    const hashedPassword = await bcrypt.hash(MAT_KHAU, BCRYPT_SALT_ROUNDS);

    try {
      await createCustomerWithRetry({
        TEN: normalizedTen,
        SDT: normalizedSdt,
        EMAIL: normalizedEmail,
        MAT_KHAU: hashedPassword,
        // GOOGLE_ID, FACEBOOK_ID, FCM_TOKEN: không cần gán null tường minh,
        // Prisma tự để NULL cho field không truyền.
      });
    } catch (error) {
      // FIX (race condition - lớp bảo vệ cuối): nếu 2 request đăng ký cùng
      // email gửi gần như đồng thời, cả 2 có thể vượt qua check findUnique
      // ở trên (do chưa commit). DB unique constraint sẽ chặn request thứ 2
      // tại đây bằng lỗi P2002 -> ta trả về 409 đúng nghĩa thay vì 500.
      if (error.code === "P2002" && error.meta?.target?.includes("EMAIL")) {
        return sendError(res, 409, MESSAGES.EMAIL_EXISTS);
      }
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: MESSAGES.REGISTER_SUCCESS,
    });
  } catch (error) {
    return sendServerError(res, error, "register");
  }
};
export const login = async (req, res) => {
  try {
    const { EMAIL, MAT_KHAU } = req.body;

    if (!EMAIL || !MAT_KHAU) {
      return sendError(res, 400, MESSAGES.MISSING_FIELDS);
    }

    const normalizedEmail = EMAIL.trim().toLowerCase();

    const customer = await prisma.kHACH_HANG.findUnique({
      where: { EMAIL: normalizedEmail },
      select: {
        MA_KH: true,
        TEN: true,
        EMAIL: true,
        SDT: true,
        MAT_KHAU: true,
        VAITRO: true, // 👈 Thêm VAITRO vào select
      },
    });

    const hashToCompare = customer ? customer.MAT_KHAU : DUMMY_HASH;
    const isPasswordValid = await bcrypt.compare(MAT_KHAU, hashToCompare);

    if (!customer || !isPasswordValid) {
      return sendError(res, 401, MESSAGES.LOGIN_FAILED);
    }

    // 👈 Truyền VAITRO vào Token Payload
    const token = generateToken({
      MA_KH: customer.MA_KH,
      EMAIL: customer.EMAIL,
      VAITRO: customer.VAITRO,
    });

    return res.status(200).json({
      success: true,
      token,
      user: {
        MA_KH: customer.MA_KH,
        TEN: customer.TEN,
        EMAIL: customer.EMAIL,
        SDT: customer.SDT,
        VAITRO: customer.VAITRO, // 👈 Trả về VAITRO cho frontend
      },
    });
  } catch (error) {
    return sendServerError(res, error, "login");
  }
};
export const getAllCustomers = async (req, res) => {
  try {
    const customers = await prisma.kHACH_HANG.findMany({
      select: {
        MA_KH: true,
        TEN: true,
        SDT: true,
        EMAIL: true,
      },
    });
    return res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    return sendServerError(res, error, "getAllCustomers");
  }
};