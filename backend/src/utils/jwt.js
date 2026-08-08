import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Tạo JWT Token cho người dùng
 * @param {Object} payload - Dữ liệu đưa vào token ({ MA_KH, EMAIL, VAITRO })
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Giải mã và kiểm tra tính hợp lệ của Token
 * @param {String} token 
 */
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};