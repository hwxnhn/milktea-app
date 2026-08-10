import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, token } = useAuth();

  // 1. Kiểm tra đã đăng nhập chưa
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // 2. RÀNG BUỘC PHÂN QUYỀN: Nếu yêu cầu Role mà user không đáp ứng -> Đá về trang chủ
  if (allowedRoles && !allowedRoles.includes(user.VAITRO)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}