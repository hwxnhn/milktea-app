import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  MapPin,
  Lock,
  Headphones,
  LogOut,
  ChevronRight,
  Award,
  Clock,
  Truck,
  CheckCircle2,
  Coffee,
  ShoppingBag,
  Receipt,
  Edit2,
  X,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import axiosClient from '../../api/axiosClient';

export default function AccountPage() {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth() || {};
  const { getCartCount } = useCart() || { getCartCount: () => 0 };

  const [userInfo, setUserInfo] = useState({
    TEN: authUser?.TEN || '',
    SDT: authUser?.SDT || '',
    EMAIL: authUser?.EMAIL || '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ TEN: '', SDT: '' });
  const [loading, setLoading] = useState(false);

  // State đếm số lượng đơn hàng theo từng trạng thái
  const [orderCounts, setOrderCounts] = useState({
    CHO_XAC_NHAN: 0,
    PHA_CHE: 0,
    DANG_GIAO: 0,
    HOAN_THANH: 0,
  });

  // 1. Lấy dữ liệu profile mới nhất từ backend
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axiosClient.get('/users/profile');
        if (res.data?.success) {
          setUserInfo(res.data.data);
          setEditForm({ TEN: res.data.data.TEN || '', SDT: res.data.data.SDT || '' });
        }
      } catch (err) {
        console.error('Lỗi lấy profile:', err);
      }
    };

    fetchProfile();
  }, []);

  // 2. Lấy danh sách đơn hàng để tính số lượng theo từng trạng thái
  useEffect(() => {
    const fetchOrdersCount = async () => {
      try {
        const res = await axiosClient.get('/orders/my-orders');
        let orders = [];
        if (Array.isArray(res.data)) orders = res.data;
        else if (Array.isArray(res.data?.data)) orders = res.data.data;

        const counts = {
          CHO_XAC_NHAN: 0,
          PHA_CHE: 0,
          DANG_GIAO: 0,
          HOAN_THANH: 0,
        };

        orders.forEach((o) => {
          const status = (o.TRANG_THAI || '').toUpperCase();
          if (status.includes('CHỜ') || status.includes('CHO_XAC_NHAN') || status.includes('TẠO')) {
            counts.CHO_XAC_NHAN++;
          } else if (status.includes('PHA CHẾ') || status.includes('ĐANG PHA CHẾ') || status.includes('PHA_CHE')) {
            counts.PHA_CHE++;
          } else if (status.includes('GIAO') || status.includes('DANG_GIAO')) {
            counts.DANG_GIAO++;
          } else if (status.includes('HOÀN THÀNH') || status.includes('ĐÃ THANH TOÁN') || status.includes('HOAN_THANH')) {
            counts.HOAN_THANH++;
          }
        });

        setOrderCounts(counts);
      } catch (err) {
        console.error('Lỗi lấy số lượng đơn hàng:', err);
      }
    };

    fetchOrdersCount();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axiosClient.put('/users/profile', editForm);
      if (res.data?.success) {
        setUserInfo((prev) => ({ ...prev, ...editForm }));
        setIsEditing(false);
        alert('Cập nhật thông tin thành công!');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      logout?.();
      navigate('/login');
    }
  };

  // Hàm chuyển hướng sang trang OrderHistoryPage với filter tương ứng
  const handleGoToOrders = (statusTab = 'ALL') => {
    navigate('/orders', { state: { filterStatus: statusTab } });
  };

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] min-h-screen max-w-[390px] mx-auto relative flex flex-col shadow-2xl border border-gray-200">
      
      {/* HEADER */}
      <header className="fixed top-0 w-[390px] z-40 bg-[#f9f9f9] flex items-center justify-between px-4 h-14 border-b border-gray-200">
        <h1 className="text-lg font-bold text-[#873e23]">Tài khoản của tôi</h1>
      </header>

      {/* CONTENT */}
      <main className="pt-16 pb-20 px-4 flex-1 overflow-y-auto hide-scrollbar space-y-4">
        
        {/* CARD PROFILE */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-full bg-[#873e23]/10 text-[#873e23] flex items-center justify-center font-bold text-xl shrink-0 border border-[#873e23]/20">
              {userInfo.TEN?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 overflow-hidden">
              <h2 className="font-bold text-sm text-gray-800 line-clamp-1">
                {userInfo.TEN || 'Khách hàng'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {userInfo.SDT || userInfo.EMAIL || 'Chưa cập nhật SĐT'}
              </p>
              
              <div className="flex items-center gap-1.5 mt-1.5 bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full w-fit border border-amber-200/60">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[10px] font-bold">Thành viên Thân thiết</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 text-[#873e23] bg-[#873e23]/5 hover:bg-[#873e23]/10 rounded-xl transition"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          {/* FORM SỬA THÔNG TIN NHANH */}
          {isEditing && (
            <form onSubmit={handleUpdateProfile} className="pt-3 border-t border-gray-100 space-y-2.5 animate-in fade-in duration-200">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Họ và tên</label>
                <input
                  type="text"
                  value={editForm.TEN}
                  onChange={(e) => setEditForm({ ...editForm, TEN: e.target.value })}
                  className="w-full bg-[#f3f3f3] border border-gray-200 rounded-xl p-2 text-xs text-gray-800 mt-1 outline-none focus:border-[#873e23]"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Số điện thoại</label>
                <input
                  type="text"
                  value={editForm.SDT}
                  onChange={(e) => setEditForm({ ...editForm, SDT: e.target.value })}
                  className="w-full bg-[#f3f3f3] border border-gray-200 rounded-xl p-2 text-xs text-gray-800 mt-1 outline-none focus:border-[#873e23]"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl flex items-center justify-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-[#873e23] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" /> {loading ? 'Lưu...' : 'Lưu lại'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* LỐI TẮT ĐƠN HÀNG VỚI CÁC NÚT BỘ LỌC + BADGE SỐ LƯỢNG */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm space-y-2.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Đơn hàng của tôi</span>
            <button
              type="button"
              onClick={() => handleGoToOrders('ALL')}
              className="text-[#873e23] font-medium flex items-center text-[11px]"
            >
              Xem tất cả <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1 text-center">
            {/* Chờ xác nhận */}
            <button
              type="button"
              onClick={() => handleGoToOrders('CHO_XAC_NHAN')}
              className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl hover:bg-gray-50 transition relative"
            >
              <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center relative">
                <Clock className="w-5 h-5" />
                {orderCounts.CHO_XAC_NHAN > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {orderCounts.CHO_XAC_NHAN}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-600 font-medium">Chờ xác nhận</span>
            </button>

            {/* Pha chế */}
            <button
              type="button"
              onClick={() => handleGoToOrders('PHA_CHE')}
              className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl hover:bg-gray-50 transition relative"
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center relative">
                <Coffee className="w-5 h-5" />
                {orderCounts.PHA_CHE > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {orderCounts.PHA_CHE}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-600 font-medium">Pha chế</span>
            </button>

            {/* Đang giao */}
            <button
              type="button"
              onClick={() => handleGoToOrders('DANG_GIAO')}
              className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl hover:bg-gray-50 transition relative"
            >
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center relative">
                <Truck className="w-5 h-5" />
                {orderCounts.DANG_GIAO > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {orderCounts.DANG_GIAO}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-600 font-medium">Đang giao</span>
            </button>

            {/* Hoàn thành */}
            <button
              type="button"
              onClick={() => handleGoToOrders('HOAN_THANH')}
              className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl hover:bg-gray-50 transition relative"
            >
              <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center relative">
                <CheckCircle2 className="w-5 h-5" />
                {orderCounts.HOAN_THANH > 0 && (
                  <span className="absolute -top-1 -right-1 bg-green-600 text-white text-[9px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {orderCounts.HOAN_THANH}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-600 font-medium">Hoàn thành</span>
            </button>
          </div>
        </div>

        {/* MENU DANH SÁCH */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 text-xs">
          <button
            type="button"
            onClick={() => alert('Tính năng địa chỉ đang cập nhật!')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3 text-gray-700">
              <MapPin className="w-4 h-4 text-[#873e23]" />
              <span className="font-medium">Địa chỉ giao hàng đã lưu</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          <button
            type="button"
            onClick={() => alert('Tính năng đổi mật khẩu đang cập nhật!')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3 text-gray-700">
              <Lock className="w-4 h-4 text-[#873e23]" />
              <span className="font-medium">Đổi mật khẩu</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          <button
            type="button"
            onClick={() => alert('Hotline hỗ trợ: 1900 1234')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3 text-gray-700">
              <Headphones className="w-4 h-4 text-[#873e23]" />
              <span className="font-medium">Trung tâm hỗ trợ CSKH</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* NÚT ĐĂNG XUẤT */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full bg-red-50 hover:bg-red-100 text-red-600 p-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border border-red-100 transition active:scale-98"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất tài khoản</span>
        </button>

      </main>

      {/* BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 w-[390px] h-14 bg-[#f9f9f9] flex justify-around items-center px-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40 border-t border-gray-200">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex flex-col items-center justify-center text-[#51443a] px-4 py-1 hover:text-[#873e23] transition cursor-pointer"
        >
          <Coffee className="w-4 h-4" />
          <span className="text-[10px] font-medium mt-0.5">Menu</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex flex-col items-center justify-center text-[#51443a] px-4 py-1 hover:text-[#873e23] transition relative cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4" />
          <span className="text-[10px] font-medium mt-0.5">Cart</span>
          {getCartCount() > 0 && (
            <span className="absolute top-0 right-3 bg-[#FF8C00] text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
              {getCartCount()}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleGoToOrders('ALL')}
          className="flex flex-col items-center justify-center text-[#51443a] px-4 py-1 hover:text-[#873e23] transition cursor-pointer"
        >
          <Receipt className="w-4 h-4" />
          <span className="text-[10px] font-medium mt-0.5">Orders</span>
        </button>

        <button
          type="button"
          className="flex flex-col items-center justify-center bg-[#873e23] text-white rounded-xl px-4 py-1 active:scale-95 transition cursor-pointer"
        >
          <User className="w-4 h-4" />
          <span className="text-[10px] font-medium mt-0.5">Account</span>
        </button>
      </nav>

    </div>
  );
}