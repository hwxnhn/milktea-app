import { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

export default function ToppingModal({ product, onClose, onAddToCart }) {
  const [quantity, setQuantity] = useState(1);
  const [toppings, setToppings] = useState([]);
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lấy danh sách Topping từ API /api/toppings
    axiosClient.get('/toppings')
      .then((res) => {
        if (res.success) setToppings(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleTopping = (topping) => {
    setSelectedToppings((prev) =>
      prev.some((t) => t.MA_TOPPING === topping.MA_TOPPING)
        ? prev.filter((t) => t.MA_TOPPING !== topping.MA_TOPPING)
        : [...prev, topping]
    );
  };

  const calculateTotal = () => {
    const toppingPrice = selectedToppings.reduce((sum, t) => sum + Number(t.GIA_TOPPING), 0);
    return (Number(product.GIA_BAN) + toppingPrice) * quantity;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <div className="flex gap-4 mb-4">
          <img 
            src={product.HINH_ANH || 'https://via.placeholder.com/100'} 
            alt={product.TEN_SP} 
            className="w-20 h-20 object-cover rounded-xl"
          />
          <div>
            <h3 className="font-bold text-lg text-gray-800">{product.TEN_SP}</h3>
            <p className="text-amber-600 font-bold">{Number(product.GIA_BAN).toLocaleString()} đ</p>
          </div>
        </div>

        {/* Chọn Topping */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-700 mb-2">Chọn Topping kèm theo:</h4>
          {loading ? (
            <p className="text-sm text-gray-400">Đang tải topping...</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {toppings.map((top) => {
                const isSelected = selectedToppings.some((t) => t.MA_TOPPING === top.MA_TOPPING);
                return (
                  <div
                    key={top.MA_TOPPING}
                    onClick={() => toggleTopping(top)}
                    className={`flex justify-between items-center p-2.5 rounded-xl border cursor-pointer transition ${
                      isSelected ? 'border-amber-600 bg-amber-50' : 'border-gray-200'
                    }`}
                  >
                    <span className="text-sm font-medium">{top.TEN_TOPPING}</span>
                    <span className="text-xs text-amber-700 font-semibold">
                      +{Number(top.GIA_TOPPING).toLocaleString()} đ
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bội số lượng & Thêm vào giỏ */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3 bg-gray-100 px-3 py-1.5 rounded-xl">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-gray-600">
              <Minus size={16} />
            </button>
            <span className="font-bold">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} className="text-gray-600">
              <Plus size={16} />
            </button>
          </div>

          <button
            onClick={() => {
              onAddToCart(product, quantity, selectedToppings);
              onClose();
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition"
          >
            Thêm • {calculateTotal().toLocaleString()} đ
          </button>
        </div>
      </div>
    </div>
  );
}