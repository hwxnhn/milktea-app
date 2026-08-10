import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

import MenuPage from './pages/customer/MenuPage';
import CheckoutPage from './pages/customer/CheckoutPage';
import OrderHistoryPage from './pages/customer/OrderHistoryPage';
import PaymentPage from './pages/customer/PaymentPage';
import AccountPage from './pages/customer/AccountPage';

// Import Admin Page & ProtectedRoute
import AdminDashboardPage from './pages/admin/AdminDashBoardPage';
import ProtectedRoute from './components/common/ProtectedRoute';

// Component Layout bọc riêng khung Mobile cho Khách hàng
const CustomerLayout = ({ children }) => {
  return (
    <div className="bg-[#e5e5e5] min-h-screen w-full flex justify-center items-start">
      <div className="w-full max-w-[390px] min-h-screen bg-[#f9f9f9] relative shadow-2xl overflow-hidden border-x border-gray-200">
        {children}
      </div>
    </div>
  );
};

function AppRoutes() {
  return (
    <Routes>
      {/* 1. TRANG KHÁCH HÀNG (BỌC TRONG CUSTOMERLAYOUT DẠNG MOBILE) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      <Route
        path="/"
        element={
          <CustomerLayout>
            <MenuPage />
          </CustomerLayout>
        }
      />
      <Route
        path="/menu"
        element={
          <CustomerLayout>
            <MenuPage />
          </CustomerLayout>
        }
      />

      {/* Route Đăng nhập Khách Hàng */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/checkout"
          element={
            <CustomerLayout>
              <CheckoutPage />
            </CustomerLayout>
          }
        />
        <Route
          path="/payment"
          element={
            <CustomerLayout>
              <PaymentPage />
            </CustomerLayout>
          }
        />
        <Route
          path="/orders"
          element={
            <CustomerLayout>
              <OrderHistoryPage />
            </CustomerLayout>
          }
        />
        <Route
          path="/account"
          element={
            <CustomerLayout>
              <AccountPage />
            </CustomerLayout>
          }
        />
        <Route
          path="/profile"
          element={
            <CustomerLayout>
              <AccountPage />
            </CustomerLayout>
          }
        />
      </Route>

      {/* 2. ✅ TRANG ADMIN QUẢN TRỊ (KHÔNG BỌC CUSTOMERLAYOUT -> BUNG FULL 100% MÀN HÌNH WEB) */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'NHAN_VIEN']} />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}