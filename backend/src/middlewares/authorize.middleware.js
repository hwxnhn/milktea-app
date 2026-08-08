/**
 * Middleware phân quyền (Role-Based Access Control)
 * @param {...String} allowedRoles - Danh sách vai trò được phép truy cập (vd: 'ADMIN', 'NHAN_VIEN')
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user đã được gán bởi middleware authenticate trước đó
    if (!req.user || !req.user.VAITRO) {
      return res.status(401).json({
        success: false,
        message: "Bạn chưa đăng nhập hoặc thông tin xác thực không hợp lệ.",
      });
    }

    if (!allowedRoles.includes(req.user.VAITRO)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện thao tác này.",
      });
    }

    return next();
  };
};