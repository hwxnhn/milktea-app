import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  DollarSign,
  Coffee,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Clock,
  LayoutDashboard,
  Receipt,
  Bell,
  Search,
  X,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [activeMenu, setActiveMenu] = useState('dashboard');
  
  // Dashboard Stats State
  const [stats, setStats] = useState({
    totalOrdersToday: 0,
    totalRevenueToday: 0,
    totalProductsActive: 0,
    pendingOrdersCount: 0,
  });

  // Orders State
  const [orders, setOrders] = useState([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotalPages, setOrderTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Products State
  const [products, setProducts] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('');

  // Modal State cho Thêm / Sửa Sản phẩm
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productFormData, setProductFormData] = useState({
    MA_SP: '',
    TEN_SP: '',
    DANH_MUC: 'Trà sữa',
    GIA_BAN: '',
    HINH_ANH: '',
    TRANG_THAI_MON: true,
  });

  // 1. Fetch & Calculate Dashboard Stats
  const fetchStats = useCallback(async () => {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        axiosClient.get('/orders?limit=1000'),
        axiosClient.get('/products?limit=1000'),
      ]);

      const orderList = ordersRes.data?.data || ordersRes.data || [];
      const productList = productsRes.data?.data || productsRes.data || [];

      // Lấy ngày hôm nay (YYYY-MM-DD)
      const todayStr = new Date().toISOString().split('T')[0];

      // Lọc các đơn đặt trong NGÀY HÔM NAY và trạng thái HOÀN THÀNH
      const completedTodayOrders = orderList.filter((o) => {
        const orderDateStr = o.NGAY_DAT ? new Date(o.NGAY_DAT).toISOString().split('T')[0] : '';
        const statusUpper = (o.TRANG_THAI || '').toUpperCase();
        return orderDateStr === todayStr && statusUpper === 'HOÀN THÀNH';
      });

      // Tổng doanh thu trong ngày (chỉ tính đơn HOÀN THÀNH ngày hôm nay)
      const totalRevenueToday = completedTodayOrders.reduce(
        (sum, o) => sum + Number(o.TONG_TIEN || 0),
        0
      );

      // Số đơn cần duyệt (Tất cả các đơn có trạng thái CHỜ)
      const pendingCount = orderList.filter((o) =>
        (o.TRANG_THAI || '').toUpperCase().includes('CHỜ')
      ).length;

      // Số sản phẩm đang mở bán (TRANG_THAI_MON = true)
      const activeProductsCount = productList.filter((p) => p.TRANG_THAI_MON === true).length;

      setStats({
        totalOrdersToday: completedTodayOrders.length,
        totalRevenueToday,
        totalProductsActive: activeProductsCount,
        pendingOrdersCount: pendingCount,
      });
    } catch (err) {
      console.error('Lỗi lấy thống kê Dashboard:', err);
    }
  }, []);

  // 2. Fetch Order List
  const fetchOrders = useCallback(async () => {
    setOrderLoading(true);
    try {
      const params = {
        page: orderPage,
        limit: 10,
        search: orderSearch,
        status: orderStatusFilter,
      };
      const res = await axiosClient.get('/orders', { params });
      setOrders(res.data?.data || []);
      setOrderTotalPages(res.data?.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Lỗi lấy danh sách đơn hàng:', err);
    } finally {
      setOrderLoading(false);
    }
  }, [orderPage, orderSearch, orderStatusFilter]);

  // 3. Fetch Product List
  const fetchProducts = useCallback(async () => {
    setProductLoading(true);
    try {
      const params = {
        search: productSearch,
        status: productStatusFilter,
      };
      const res = await axiosClient.get('/products', { params });
      setProducts(res.data?.data || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách sản phẩm:', err);
    } finally {
      setProductLoading(false);
    }
  }, [productSearch, productStatusFilter]);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!isMounted) return;
      await fetchStats();
      if (activeMenu === 'orders') {
        await fetchOrders();
      }
      if (activeMenu === 'products') {
        await fetchProducts();
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [activeMenu, fetchStats, fetchOrders, fetchProducts]);

  // Điều hướng từ Card "Đơn cần duyệt" sang Tab "Quản lý đơn hàng" ở mục "CHỜ XÁC NHẬN"
  const handlePendingCardClick = () => {
    setOrderStatusFilter('CHỜ XÁC NHẬN');
    setOrderPage(1);
    setActiveMenu('orders');
  };

  const handleUpdateStatus = async (maDh, newStatus) => {
    try {
      await axiosClient.patch(`/orders/${maDh}/status`, { TRANG_THAI: newStatus });
      fetchOrders();
      fetchStats();
      if (selectedOrder) setSelectedOrder((prev) => ({ ...prev, TRANG_THAI: newStatus }));
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi cập nhật trạng thái đơn hàng!');
    }
  };

  const handleToggleProductStatus = async (maSp, currentStatus) => {
    const updatedStatus = !currentStatus;

    setProducts((prevProducts) =>
      prevProducts.map((p) =>
        p.MA_SP === maSp ? { ...p, TRANG_THAI_MON: updatedStatus } : p
      )
    );

    try {
      await axiosClient.put(`/products/${maSp}`, {
        TRANG_THAI_MON: updatedStatus,
      });
      fetchStats();
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái sản phẩm:', err);
      setProducts((prevProducts) =>
        prevProducts.map((p) =>
          p.MA_SP === maSp ? { ...p, TRANG_THAI_MON: currentStatus } : p
        )
      );
      alert(err.response?.data?.message || 'Lỗi cập nhật trạng thái sản phẩm!');
    }
  };

  const handleDeleteProduct = async (maSp) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm ${maSp}?`)) return;
    try {
      const res = await axiosClient.delete(`/products/${maSp}`);
      alert(res.data?.message || 'Thao tác thành công!');
      fetchProducts();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi xóa sản phẩm!');
    }
  };

  const handleOpenProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductFormData({
        MA_SP: product.MA_SP || '',
        TEN_SP: product.TEN_SP || '',
        DANH_MUC: product.DANH_MUC || 'Trà sữa',
        GIA_BAN: product.GIA_BAN || '',
        HINH_ANH: product.HINH_ANH || '',
        TRANG_THAI_MON: product.TRANG_THAI_MON ?? true,
      });
    } else {
      setEditingProduct(null);
      setProductFormData({
        MA_SP: '',
        TEN_SP: '',
        DANH_MUC: 'Trà sữa',
        GIA_BAN: '',
        HINH_ANH: '',
        TRANG_THAI_MON: true,
      });
    }
    setShowProductModal(true);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();

    if (!productFormData.TEN_SP.trim()) {
      alert('Tên sản phẩm không được để trống!');
      return;
    }

    const price = Number(productFormData.GIA_BAN);
    if (isNaN(price) || price < 0) {
      alert('Giá bán phải là số hợp lệ và lớn hơn hoặc bằng 0!');
      return;
    }

    try {
      if (editingProduct) {
        await axiosClient.put(`/products/${editingProduct.MA_SP}`, {
          TEN_SP: productFormData.TEN_SP,
          DANH_MUC: productFormData.DANH_MUC,
          GIA_BAN: price,
          HINH_ANH: productFormData.HINH_ANH,
          TRANG_THAI_MON: Boolean(productFormData.TRANG_THAI_MON),
        });
        alert('Cập nhật sản phẩm thành công!');
      } else {
        await axiosClient.post('/products', {
          MA_SP: productFormData.MA_SP.trim() || undefined,
          TEN_SP: productFormData.TEN_SP,
          DANH_MUC: productFormData.DANH_MUC,
          GIA_BAN: price,
          HINH_ANH: productFormData.HINH_ANH,
          TRANG_THAI_MON: Boolean(productFormData.TRANG_THAI_MON),
        });
        alert('Thêm sản phẩm thành công!');
      }
      setShowProductModal(false);
      fetchProducts();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi lưu dữ liệu sản phẩm!');
    }
  };

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi trang Quản trị?')) {
      logout?.();
      navigate('/login');
    }
  };

  return (
    <div className="flex w-screen h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden fixed inset-0 z-50">
      
      {/* 1. SIDEBAR */}
      <aside className="w-64 bg-[#873e23] text-white flex flex-col justify-between shadow-xl shrink-0 h-full">
        <div>
          <div className="h-16 flex items-center gap-3 px-6 border-b border-white/10">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Coffee className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight tracking-wide">Milk Tea Express</h1>
              <span className="text-[10px] text-amber-200/80 uppercase font-semibold">Management System</span>
            </div>
          </div>

          <nav className="p-4 space-y-1.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveMenu('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeMenu === 'dashboard'
                  ? 'bg-white/15 text-white shadow-inner font-bold border-l-4 border-amber-400'
                  : 'text-amber-100/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Tổng quan Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveMenu('orders'); setOrderStatusFilter(''); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeMenu === 'orders'
                  ? 'bg-white/15 text-white shadow-inner font-bold border-l-4 border-amber-400'
                  : 'text-amber-100/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Receipt className="w-4 h-4" />
                <span>Quản lý Đơn hàng</span>
              </div>
              {stats.pendingOrdersCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {stats.pendingOrdersCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveMenu('products')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                activeMenu === 'products'
                  ? 'bg-white/15 text-white shadow-inner font-bold border-l-4 border-amber-400'
                  : 'text-amber-100/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Coffee className="w-4 h-4" />
              <span>Quản lý Menu / Sản phẩm</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between bg-black/10 p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-xs shrink-0">
                A
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">Le Huu Nhan</p>
                <p className="text-[10px] text-amber-200/60 uppercase font-extrabold">ADMIN</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-amber-200 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4 w-96">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={activeMenu === 'products' ? productSearch : orderSearch}
                onChange={(e) => activeMenu === 'products' ? setProductSearch(e.target.value) : setOrderSearch(e.target.value)}
                placeholder="Tìm kiếm mã đơn, tên khách, số điện thoại..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 h-9 text-xs outline-none focus:border-[#873e23] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button type="button" className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-700">
                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Hệ thống hoạt động
              </p>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 h-0 overflow-y-auto p-8">
          
          {/* TAB 1: DASHBOARD (CHỈ HIỂN THỊ 4 CARD ZOOM TO Ở GIỮA) */}
          {activeMenu === 'dashboard' && (
            <div className="h-full flex flex-col justify-center items-center max-w-5xl mx-auto py-10">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-slate-800">Tổng quan tình hình hôm nay</h2>
                <p className="text-xs text-slate-400 mt-1">Dữ liệu thống kê doanh thu và đơn hàng tự động cập nhật</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                {/* Card 1: Tổng doanh thu hôm nay */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-md hover:shadow-xl transition-all duration-300 flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                    <DollarSign className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Theo ngày</span>
                    <p className="text-xs font-bold text-slate-400 uppercase mt-2">Tổng Doanh Thu</p>
                    <h3 className="text-2xl font-black text-slate-800 mt-1">
                      {stats.totalRevenueToday.toLocaleString('vi-VN')} đ
                    </h3>
                  </div>
                </div>

                {/* Card 2: Tổng đơn hàng hoàn thành hôm nay */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-md hover:shadow-xl transition-all duration-300 flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <ShoppingBag className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Theo ngày</span>
                    <p className="text-xs font-bold text-slate-400 uppercase mt-2">Tổng Đơn Hàng Hoàn Thành</p>
                    <h3 className="text-2xl font-black text-slate-800 mt-1">
                      {stats.totalOrdersToday} đơn
                    </h3>
                  </div>
                </div>

                {/* Card 3: Đơn cần duyệt (Bấm vào nhảy sang Quản lý đơn hàng) */}
                <div
                  onClick={handlePendingCardClick}
                  className="bg-white p-8 rounded-3xl border border-amber-200/80 shadow-md hover:shadow-xl hover:border-amber-400 transition-all duration-300 flex items-center gap-6 cursor-pointer group relative overflow-hidden"
                >
                  <div className="w-20 h-20 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 group-hover:scale-105 transition-transform">
                    <Clock className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full uppercase tracking-wider">Cần xử lý</span>
                    <p className="text-xs font-bold text-slate-400 uppercase mt-2">Đơn Cần Duyệt</p>
                    <h3 className="text-2xl font-black text-amber-600 mt-1">
                      {stats.pendingOrdersCount} đơn
                    </h3>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-300 absolute right-6 group-hover:translate-x-1 transition-transform" />
                </div>

                {/* Card 4: Sản phẩm Menu (Đang mở bán) */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-md hover:shadow-xl transition-all duration-300 flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                    <Coffee className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Đang mở bán</span>
                    <p className="text-xs font-bold text-slate-400 uppercase mt-2">Sản Phẩm Menu</p>
                    <h3 className="text-2xl font-black text-slate-800 mt-1">
                      {stats.totalProductsActive} món
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BẢNG QUẢN LÝ ĐƠN HÀNG */}
          {activeMenu === 'orders' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-8">
              <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Quản Lý Đơn Hàng</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Danh sách các đơn hàng từ hệ thống</p>
                </div>

                {/* Lọc Trạng thái */}
                <div className="flex gap-2">
                  {['', 'CHỜ XÁC NHẬN', 'ĐÃ XÁC NHẬN', 'ĐANG PHA CHẾ', 'ĐANG GIAO', 'HOÀN THÀNH', 'HỦY'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => { setOrderStatusFilter(st); setOrderPage(1); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        orderStatusFilter === st
                          ? 'bg-[#873e23] text-white border-[#873e23]'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st || 'Tất cả'}
                    </button>
                  ))}
                </div>
              </div>

              {orderLoading ? (
                <div className="p-8 space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-xl"></div>)}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80">
                          <th className="py-3.5 px-6">Mã Đơn</th>
                          <th className="py-3.5 px-6">Khách Hàng</th>
                          <th className="py-3.5 px-6">SĐT</th>
                          <th className="py-3.5 px-6">Thời Gian</th>
                          <th className="py-3.5 px-6">Phương Thức</th>
                          <th className="py-3.5 px-6">Tổng Tiền</th>
                          <th className="py-3.5 px-6">Trạng Thái</th>
                          <th className="py-3.5 px-6 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {orders.map((order) => (
                          <tr key={order.MA_DH} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 px-6 font-bold text-slate-800">#{order.MA_DH}</td>
                            <td className="py-4 px-6 text-slate-700 font-semibold">{order.KHACH_HANG?.TEN || 'An Khang'}</td>
                            <td className="py-4 px-6 text-slate-500">{order.KHACH_HANG?.SDT || '---'}</td>
                            <td className="py-4 px-6 text-slate-500">{order.NGAY_DAT ? new Date(order.NGAY_DAT).toLocaleString('vi-VN') : '---'}</td>
                            <td className="py-4 px-6 font-bold text-slate-600">{order.PTTT || 'VietQR'}</td>
                            <td className="py-4 px-6 font-bold text-[#873e23] text-sm">{Number(order.TONG_TIEN || 0).toLocaleString('vi-VN')} đ</td>
                            <td className="py-4 px-6">
                              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {order.TRANG_THAI || 'CHỜ XÁC NHẬN'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => setSelectedOrder(order)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer"
                              >
                                Chi tiết
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* PHÂN TRANG */}
                  <div className="p-4 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-600">
                    <span>Trang {orderPage} / {orderTotalPages}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={orderPage <= 1}
                        onClick={() => setOrderPage((p) => Math.max(p - 1, 1))}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Trước
                      </button>
                      <button
                        type="button"
                        disabled={orderPage >= orderTotalPages}
                        onClick={() => setOrderPage((p) => Math.min(p + 1, orderTotalPages))}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                      >
                        Sau <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: QUẢN LÝ SẢN PHẨM */}
          {activeMenu === 'products' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-8">
              <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Quản Lý Sản Phẩm</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Danh sách các món trong Menu</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    {[
                      { label: 'Tất cả', val: '' },
                      { label: 'Đang bán', val: 'true' },
                      { label: 'Ngừng bán', val: 'false' },
                    ].map((st) => (
                      <button
                        key={st.val}
                        type="button"
                        onClick={() => setProductStatusFilter(st.val)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          productStatusFilter === st.val
                            ? 'bg-[#873e23] text-white border-[#873e23]'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenProductModal()}
                    className="bg-[#873e23] hover:bg-[#6e321c] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Thêm món mới
                  </button>
                </div>
              </div>

              {productLoading ? (
                <div className="p-8 space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-xl"></div>)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/80">
                        <th className="py-3.5 px-6">Mã SP</th>
                        <th className="py-3.5 px-6">Tên Sản Phẩm</th>
                        <th className="py-3.5 px-6">Danh Mục</th>
                        <th className="py-3.5 px-6">Giá Bán</th>
                        <th className="py-3.5 px-6">Trạng Thái</th>
                        <th className="py-3.5 px-6 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {products.map((p) => (
                        <tr key={p.MA_SP} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-6 font-bold text-slate-800">{p.MA_SP}</td>
                          <td className="py-4 px-6 font-semibold text-slate-800">{p.TEN_SP}</td>
                          <td className="py-4 px-6 text-slate-500">{p.DANH_MUC || '---'}</td>
                          <td className="py-4 px-6 font-bold text-[#873e23]">{Number(p.GIA_BAN || 0).toLocaleString('vi-VN')} đ</td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${p.TRANG_THAI_MON ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                              {p.TRANG_THAI_MON ? 'Đang bán' : 'Ngừng bán'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleOpenProductModal(p)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 font-bold rounded-lg text-[11px] text-slate-700 cursor-pointer"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleProductStatus(p.MA_SP, p.TRANG_THAI_MON)}
                              className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold rounded-lg text-[11px] cursor-pointer"
                            >
                              {p.TRANG_THAI_MON ? 'Ẩn' : 'Hiện'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p.MA_SP)}
                              className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-lg text-[11px] cursor-pointer"
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* MODAL XEM CHI TIẾT & CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-[#873e23]">Chi tiết đơn hàng #{selectedOrder.MA_DH}</h3>
              <button type="button" onClick={() => setSelectedOrder(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-bold">Khách hàng:</p>
                <p className="font-semibold">{selectedOrder.KHACH_HANG?.TEN || '---'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-bold">Số điện thoại:</p>
                <p className="font-semibold">{selectedOrder.KHACH_HANG?.SDT || '---'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-400 font-bold">Địa chỉ giao hàng:</p>
                <p className="font-semibold">{selectedOrder.DIA_CHI_GIAO_HANG || 'Nhận tại cửa hàng'}</p>
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="font-bold text-xs mb-2">Sản phẩm đã đặt:</p>
              <div className="space-y-2">
                {selectedOrder.CHI_TIET_DON_HANG?.map((item) => (
                  <div key={item.MA_CHI_TIET} className="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-xl">
                    <div>
                      <p className="font-bold text-slate-800">{item.SAN_PHAM?.TEN_SP}</p>
                      <p className="text-[10px] text-slate-400">Số lượng: x{item.SOLUONG}</p>
                    </div>
                    <p className="font-bold text-[#873e23]">{Number(item.THANHTIEN || 0).toLocaleString('vi-VN')} đ</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-3 flex justify-between items-center font-bold text-sm">
              <span>Tổng tiền đơn hàng:</span>
              <span className="text-[#873e23] text-base">{Number(selectedOrder.TONG_TIEN || 0).toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="border-t pt-4 space-y-2">
              <p className="font-bold text-xs">Cập nhật trạng thái mới:</p>
              <div className="flex flex-wrap gap-2">
                {['CHỜ XÁC NHẬN', 'ĐÃ XÁC NHẬN', 'ĐANG PHA CHẾ', 'ĐANG GIAO', 'HOÀN THÀNH', 'HỦY'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.MA_DH, st)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-[#873e23] hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA SẢN PHẨM */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleProductSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-[#873e23]">
                {editingProduct ? `Sửa sản phẩm #${editingProduct.MA_SP}` : 'Thêm sản phẩm mới'}
              </h3>
              <button type="button" onClick={() => setShowProductModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {!editingProduct && (
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Mã sản phẩm (Tùy chọn):</label>
                  <input
                    type="text"
                    value={productFormData.MA_SP}
                    onChange={(e) => setProductFormData({ ...productFormData, MA_SP: e.target.value })}
                    placeholder="Ví dụ: TS001 (Nếu để trống tự sinh)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#873e23]"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-600 mb-1">Tên sản phẩm (*):</label>
                <input
                  type="text"
                  required
                  value={productFormData.TEN_SP}
                  onChange={(e) => setProductFormData({ ...productFormData, TEN_SP: e.target.value })}
                  placeholder="Nhập tên món ăn/thức uống"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#873e23]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Danh mục (*):</label>
                <input
                  type="text"
                  required
                  value={productFormData.DANH_MUC}
                  onChange={(e) => setProductFormData({ ...productFormData, DANH_MUC: e.target.value })}
                  placeholder="Ví dụ: Trà sữa, Topping..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#873e23]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Giá bán (VNĐ) (*):</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={productFormData.GIA_BAN}
                  onChange={(e) => setProductFormData({ ...productFormData, GIA_BAN: e.target.value })}
                  placeholder="Ví dụ: 35000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#873e23]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Link Hình ảnh URL:</label>
                <input
                  type="text"
                  value={productFormData.HINH_ANH}
                  onChange={(e) => setProductFormData({ ...productFormData, HINH_ANH: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#873e23]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="trangThaiMon"
                  checked={productFormData.TRANG_THAI_MON}
                  onChange={(e) => setProductFormData({ ...productFormData, TRANG_THAI_MON: e.target.checked })}
                  className="w-4 h-4 accent-[#873e23]"
                />
                <label htmlFor="trangThaiMon" className="font-bold text-slate-700 cursor-pointer">
                  Đang mở bán sản phẩm này
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#873e23] hover:bg-[#6e321c] text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                {editingProduct ? 'Cập nhật' : 'Tạo món mới'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}