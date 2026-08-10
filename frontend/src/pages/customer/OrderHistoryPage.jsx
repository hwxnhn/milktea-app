import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Coffee, Receipt, ShoppingBag, User } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useCart } from '../../context/CartContext';

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getCartCount } = useCart() || { getCartCount: () => 0 };

  // 1. Mảng Tabs Trạng thái đồng bộ 100% với Backend Database
  const tabs = [
    { id: '', label: 'Tất cả' },
    { id: 'CHỜ XÁC NHẬN', label: 'Chờ xác nhận' },
    { id: 'ĐÃ XÁC NHẬN', label: 'Đã xác nhận' },
    { id: 'ĐANG PHA CHẾ', label: 'Đang pha chế' },
    { id: 'ĐANG GIAO', label: 'Đang giao' },
    { id: 'HOÀN THÀNH', label: 'Hoàn thành' },
    { id: 'HỦY', label: 'Đã hủy' },
  ];

  // Khởi tạo tab từ location.state hoặc mặc định là '' (Tất cả)
  const [activeTab, setActiveTab] = useState(location.state?.filterStatus || '');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lấy danh sách đơn hàng từ API
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await axiosClient.get('/orders/my-orders');
        let data = [];
        if (Array.isArray(res.data)) data = res.data;
        else if (Array.isArray(res.data?.data)) data = res.data.data;
        setOrders(data);
      } catch (err) {
        console.error('Lỗi lấy lịch sử đơn hàng:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // 2. Logic Lọc chuẩn xác theo activeTab
  const filteredOrders = orders.filter((o) => {
    if (!activeTab) return true; // Trống = Tất cả

    const orderStatus = (o.TRANG_THAI || '').toUpperCase();
    const targetTab = activeTab.toUpperCase();

    // Trường hợp tab HỦY (nhận cả HỦY và ĐÃ HỦY)
    if (targetTab === 'HỦY' || targetTab === 'ĐÃ HỦY') {
      return orderStatus.includes('HỦY');
    }

    return orderStatus === targetTab;
  });

  // 3. Render Badge trạng thái đúng màu đẹp mắt
  const renderStatusBadge = (status) => {
    const st = (status || '').toUpperCase();

    if (st.includes('CHỜ')) {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">CHỜ XÁC NHẬN</span>;
    }
    if (st.includes('ĐÃ XÁC NHẬN')) {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">ĐÃ XÁC NHẬN</span>;
    }
    if (st.includes('PHA CHẾ')) {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">ĐANG PHA CHẾ</span>;
    }
    if (st.includes('GIAO')) {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">ĐANG GIAO</span>;
    }
    if (st.includes('HOÀN THÀNH')) {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">HOÀN THÀNH</span>;
    }
    if (st.includes('HỦY')) {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">HỦY</span>;
    }

    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{status}</span>;
  };

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] min-h-screen max-w-[390px] mx-auto relative flex flex-col shadow-2xl border border-gray-200">
      
      {/* Header */}
      <header className="fixed top-0 w-[390px] z-40 bg-[#f9f9f9] flex items-center justify-between px-4 h-14 border-b border-gray-200">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center text-[#873e23] active:opacity-70 transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-[#873e23]">Lịch sử đơn hàng</h1>
        <div className="w-9"></div>
      </header>

      {/* Main Content */}
      <main className="pt-14 pb-20 flex-1 overflow-y-auto hide-scrollbar">
        
        {/* Thanh Tab lọc trạng thái */}
        <div className="sticky top-0 z-30 bg-[#f9f9f9]/95 backdrop-blur-md px-3 py-2 border-b border-gray-100">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#873e23] text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Danh sách đơn hàng */}
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-gray-200 animate-pulse rounded-2xl"></div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-xs text-gray-500">Không có đơn hàng nào thuộc trạng thái này.</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.MA_DH}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2 text-xs"
              >
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <span className="font-bold text-gray-800">#{order.MA_DH}</span>
                  {renderStatusBadge(order.TRANG_THAI)}
                </div>

                <div className="text-gray-500 text-[11px] space-y-1">
                  <p>Ngày đặt: {order.NGAY_DAT ? new Date(order.NGAY_DAT).toLocaleString('vi-VN') : 'Mới đây'}</p>
                  <p className="line-clamp-1">Địa chỉ: {order.DIA_CHI_GIAO_HANG || 'Nhận tại cửa hàng'}</p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-100 font-bold">
                  <span className="text-gray-600">Tổng tiền:</span>
                  <span className="text-[#873e23] text-sm">
                    {Number(order.TONG_TIEN || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

      </main>

      {/* Bottom Navigation */}
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
          className="flex flex-col items-center justify-center bg-[#873e23] text-white rounded-xl px-4 py-1 active:scale-95 transition cursor-pointer"
        >
          <Receipt className="w-4 h-4" />
          <span className="text-[10px] font-medium mt-0.5">Orders</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/account')}
          className="flex flex-col items-center justify-center text-[#51443a] px-4 py-1 hover:text-[#873e23] transition cursor-pointer"
        >
          <User className="w-4 h-4" />
          <span className="text-[10px] font-medium mt-0.5">Account</span>
        </button>
      </nav>

    </div>
  );
}