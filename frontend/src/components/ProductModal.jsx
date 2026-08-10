import { useState, useEffect } from 'react';
import { X, Plus, Minus, MessageSquare } from 'lucide-react';
import axiosClient from '../api/axiosClient';

export default function ProductModal({ product, onClose, onAddToCart }) {
  const [quantity, setQuantity] = useState(1);
  const [toppings, setToppings] = useState([]); // State chứa topping từ DB
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);

  // 🚀 Gọi API lấy danh sách Topping thật từ bảng "TOPPING" trong DB Postgres
  useEffect(() => {
    let isMounted = true;

    axiosClient
      .get('/toppings')
      .then((res) => {
        if (!isMounted) return;
        // Backend topping.controller trả về { success: true, data: [...] }
        const data = res.data?.data || res.data || [];
        setToppings(data);
      })
      .catch((err) => console.error('❌ Lỗi lấy toppings từ DB:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleTopping = (topping) => {
    setSelectedToppings((prev) => {
      const exists = prev.some((t) => t.MA_TOPPING === topping.MA_TOPPING);
      if (exists) {
        return prev.filter((t) => t.MA_TOPPING !== topping.MA_TOPPING);
      }
      return [...prev, topping];
    });
  };

  const basePrice = Number(product?.GIA_BAN || product?.price || 0);
  const toppingTotal = selectedToppings.reduce(
    (sum, t) => sum + Number(t.GIA_TOPPING || 0),
    0
  );
  const totalPrice = (basePrice + toppingTotal) * quantity;

  const handleAdd = () => {
    onAddToCart(product, {
      quantity,
      selectedToppings,
      note,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="w-full max-w-[360px] bg-white rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Nội dung cuộn */}
        <div className="overflow-y-auto p-4 space-y-4">
          {/* Ảnh sản phẩm */}
          <div className="w-full h-48 rounded-xl overflow-hidden bg-gray-100">
            <img
              src={
                product?.HINH_ANH ||
                'https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=400'
              }
              alt={product?.TEN_SP}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Tên & Giá gốc */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 leading-snug">
              {product?.TEN_SP}
            </h2>
            <p className="text-sm font-bold text-[#873e23] mt-1">
              {basePrice.toLocaleString('vi-VN')} đ
            </p>
          </div>

          <hr className="border-gray-100" />

          {/* Danh sách Topping load động từ bảng TOPPING */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Thêm Topping
            </h3>
            {loading ? (
              <p className="text-xs text-gray-400 py-2">Đang tải danh sách topping...</p>
            ) : toppings.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">Chưa có topping nào trong DB.</p>
            ) : (
              <div className="space-y-2">
                {toppings.map((topping) => {
                  const isChecked = selectedToppings.some(
                    (t) => t.MA_TOPPING === topping.MA_TOPPING
                  );
                  return (
                    <label
                      key={topping.MA_TOPPING}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-[#873e23] bg-green-50/50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTopping(topping)}
                          className="w-4 h-4 rounded text-[#873e23] focus:ring-[#873e23]"
                        />
                        <span className="text-xs font-semibold text-gray-700">
                          {topping.TEN_TOPPING}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[#873e23]">
                        +{Number(topping.GIA_TOPPING).toLocaleString('vi-VN')} đ
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            <hr className="border-gray-100 mt-4" />
          </div>

          {/* Ô Nhập Ghi Chú Món */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
              <h3 className="text-xs font-bold text-gray-600">
                Ghi chú cho món này (Ví dụ: Ít đá, 50% đường...):
              </h3>
            </div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập yêu cầu riêng của bạn..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 outline-none focus:border-[#873e23] transition-colors"
            />
          </div>

          {/* Bộ tăng giảm số lượng */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-gray-600">Số lượng:</span>
            <div className="flex items-center gap-3 bg-gray-100 px-3 py-1.5 rounded-full">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-gray-700 shadow-sm active:scale-95"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-sm font-bold w-4 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-gray-700 shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Nút Thêm vào giỏ */}
        <div className="p-4 bg-white border-t border-gray-100">
          <button
            type="button"
            onClick={handleAdd}
            className="w-full bg-[#FF8C00] hover:bg-[#e07b00] text-white py-3 rounded-xl font-bold text-xs flex items-center justify-between px-4 shadow-lg active:scale-98 transition-all"
          >
            <span>Thêm vào giỏ hàng</span>
            <span>{totalPrice.toLocaleString('vi-VN')} đ</span>
          </button>
        </div>
      </div>
    </div>
  );
}