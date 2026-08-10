import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, Bell, Coffee, Receipt, User, ArrowLeft } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

import ProductCard from '../../components/ProductCard';
import CategoryFilter from '../../components/CategoryFilter';
import ProductModal from '../../components/ProductModal';
import CartDrawer from '../../components/CartDrawer';

import { useCart } from '../../context/CartContext';


export default function MenuPage() {
  const navigate = useNavigate();
  const { getCartCount, addToCart } = useCart();


  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All', 'Trà', 'Trà Sữa']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const fetchInitialCategories = async () => {
      try {
        const res = await axiosClient.get('/products');
        let data = [];
        if (Array.isArray(res.data)) data = res.data;
        else if (Array.isArray(res.data?.data)) data = res.data.data;
        else if (Array.isArray(res.data?.products)) data = res.data.products;

        if (data.length > 0) {
          const uniqueCats = [
            'All',
            ...new Set(
              data.map((p) => p.DANH_MUC || p.category || p.categoryName).filter(Boolean)
            ),
          ];
          setCategories(uniqueCats);
        }
      } catch (err) {
        console.error('Lỗi lấy danh mục ban đầu:', err);
      }
    };

    fetchInitialCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (activeCategory !== 'All' && activeCategory !== 'Tất cả') {
          params.category = activeCategory;
        }

        const res = await axiosClient.get('/products', { params });

        let fetchedData = [];
        if (Array.isArray(res.data)) {
          fetchedData = res.data;
        } else if (Array.isArray(res.data?.data)) {
          fetchedData = res.data.data;
        } else if (Array.isArray(res.data?.products)) {
          fetchedData = res.data.products;
        }

        setProducts(fetchedData);
      } catch (err) {
        console.error('Lỗi lấy dữ liệu sản phẩm:', err);
        setError(`Lỗi kết nối DB: ${err.message || 'Không thể lấy dữ liệu'}`);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeCategory]);

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] min-h-screen max-w-[390px] mx-auto relative overflow-hidden flex flex-col shadow-2xl border border-gray-200">
      
      {/* Header */}
      <header className="absolute top-0 w-full z-40 bg-[#f9f9f9] flex items-center justify-between px-4 h-14 border-b border-[#d5c3b6]/20">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="text-[#873e23] active:opacity-70 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-[#873e23]">Milk Tea Express</h1>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="text-[#873e23] p-2 hover:opacity-80 transition">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-14 pb-20 overflow-y-auto hide-scrollbar">
        <div className="sticky top-0 z-30 bg-[#f9f9f9]/95 backdrop-blur-md pb-2">
          <div className="px-4 pt-3">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#837469]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your favorite drink..."
                className="w-full bg-[#f3f3f3] border border-[#d5c3b6] rounded-xl pl-11 pr-4 h-11 text-xs focus:border-[#873e23] outline-none transition-all"
              />
            </div>
          </div>

          {/* Thanh lọc danh mục */}
          <CategoryFilter
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={(cat) => setActiveCategory(cat)}
          />
        </div>

        {/* Banner Khuyến Mãi */}
        <section className="px-4 pt-3">
          <div className="relative w-full h-36 rounded-2xl overflow-hidden shadow-sm">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=800')`,
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent flex flex-col justify-center px-5">
              <span className="text-white text-[10px] font-bold bg-[#773e00] w-fit px-2 py-0.5 rounded mb-1">
                HOT DEAL
              </span>
              <h2 className="text-white font-bold text-lg leading-tight">
                Brown Sugar Boba<br />20% OFF Today
              </h2>
            </div>
          </div>
        </section>

        {/* Danh Sách Món */}
        <section className="px-4 pt-4 space-y-3">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs text-center border border-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-xl"></div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-[#837469]">Chưa có món nào thuộc danh mục này.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {products.map((product, idx) => (
                <ProductCard
                  key={product.MA_SP || product._id || product.id || idx}
                  product={product}
                  onSelect={(p) => setSelectedProduct(p)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Nút Cart Nổi */}
      {getCartCount() > 0 && (
        <div className="fixed bottom-16 right-4 z-40 max-w-[390px]">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="bg-[#FF8C00] text-white rounded-full px-5 h-12 shadow-xl flex items-center gap-2 active:scale-95 transition-transform hover:bg-[#e07b00]"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-xs font-bold">View Cart ({getCartCount()})</span>
          </button>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 w-full h-14 bg-[#f9f9f9] flex justify-around items-center px-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40 border-t border-gray-200">
        <button
          type="button"
          className="flex flex-col items-center justify-center bg-[#873e23] text-white rounded-xl px-4 py-1 active:scale-95 transition"
        >
          <Coffee className="w-4 h-4" />
          <span className="text-[10px] font-medium mt-0.5">Menu</span>
        </button>

        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center justify-center text-[#51443a] px-4 py-1 hover:text-[#873e23] transition relative"
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
          onClick={() => navigate('/orders')}
          className="flex flex-col items-center justify-center text-[#51443a] px-4 py-1 hover:text-[#873e23] transition"
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

      {/* Modals */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
        />
      )}

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}