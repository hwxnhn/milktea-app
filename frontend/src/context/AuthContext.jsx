import { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Khởi tạo state trực tiếp từ localStorage (Tránh dùng useEffect gây re-render)
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('token') || null;
  });

  // Hàm lưu trạng thái đăng nhập
  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
  };

  // Hàm đăng xuất
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // Kiểm tra quyền Admin / Nhân viên
  const isAdminOrStaff = user?.VAITRO === 'ADMIN' || user?.VAITRO === 'NHAN_VIEN';

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdminOrStaff }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom Hook dùng để lấy Auth Context
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);