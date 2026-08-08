import { verifyToken } from "../utils/jwt.js";

/**
 * Middleware xác thực Bearer Token từ Header Request
 */
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Bạn chưa đăng nhập hoặc Token không hợp lệ.",
      });
    }

    // Lấy chuỗi token phía sau chữ "Bearer "
    const token = authHeader.split(" ")[1];

    try {
      const decoded = verifyToken(token);
      // Gán dữ liệu giải mã vào req.user (chứa MA_KH, EMAIL)
      req.user = decoded;
      return next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Token đã hết hạn hoặc không hợp lệ.",
      });
    }
  } catch (error) {
    console.error("[auth.middleware] authenticate:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi xác thực token.",
    });
  }
};