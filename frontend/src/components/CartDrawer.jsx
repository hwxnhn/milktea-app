import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  AlertCircle,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function CartDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    getSubtotal,
  } = useCart();

  const [itemToDelete, setItemToDelete] = useState(null);
  const [swipeState, setSwipeState] = useState({ id: null, startX: 0, currentX: 0 });

  if (!isOpen) return null;

  const handleDecreaseQuantity = (item) => {
    if (item.quantity <= 1) {
      setItemToDelete(item);
    } else {
      updateQuantity(item.cartItemId, -1);
    }
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      removeFromCart(itemToDelete.cartItemId);
      setItemToDelete(null);
    }
  };

  const handleTouchStart = (e, id) => {
    setSwipeState({ id, startX: e.touches[0].clientX, currentX: 0 });
  };

  const handleTouchMove = (e, id) => {
    if (swipeState.id !== id) return;
    const diff = e.touches[0].clientX - swipeState.startX;
    if (diff < 0) {
      setSwipeState((prev) => ({ ...prev, currentX: Math.max(diff, -80) }));
    }
  };

  const handleTouchEnd = (id) => {
    if (swipeState.id !== id) return;
    if (swipeState.currentX < -40) {
      setSwipeState({ id, startX: 0, currentX: -80 });
    } else {
      setSwipeState({ id: null, startX: 0, currentX: 0 });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center">
      {/* Khung Mobile App 390px */}
      <div className="w-full max-w-[390px] h-full bg-[#f9f9f9] text-[#1a1c1c] flex flex-col relative shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <header className="fixed top-0 w-[390px] z-50 bg-[#f9f9f9] flex items-center justify-between px-4 h-14 border-b border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center active:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-6 h-6 text-[#873e23]" />
          </button>
          <h1 className="text-xl font-bold text-[#873e23]">Cart</h1>
          <button
            type="button"
            className="w-10 h-10 flex items-center justify-center active:opacity-70 transition-opacity"
          >
            <Bell className="w-5 h-5 text-[#873e23]" />
          </button>
        </header>

        {/* Danh sách món trong giỏ */}
        <main className="pt-16 pb-36 px-4 h-full overflow-y-auto hide-scrollbar">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm text-[#1a1c1c]">Order Summary</h2>
            <span className="text-xs text-gray-500 font-medium">
              {cartItems.length} Items
            </span>
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm mt-4">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500">Giỏ hàng của bạn đang trống</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-5 py-2 bg-[#873e23] text-white text-xs font-bold rounded-full hover:bg-[#004d00] transition"
              >
                Chọn món ngay
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item) => {
                const isSwiped = swipeState.id === item.cartItemId;
                const translateX = isSwiped ? swipeState.currentX : 0;

                const toppingsText = item.selectedToppings
                  ?.map((t) => t.TEN_TOPPING)
                  .join(', ');

                return (
                  <div
                    key={item.cartItemId}
                    className="relative overflow-hidden rounded-xl bg-red-600 group"
                  >
                    {/* Swipe Delete Button */}
                    <button
                      type="button"
                      onClick={() => setItemToDelete(item)}
                      className="absolute right-0 top-0 bottom-0 w-20 bg-red-600 text-white flex items-center justify-center font-bold text-xs"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>

                    {/* Card Món */}
                    <div
                      style={{ transform: `translateX(${translateX}px)` }}
                      onTouchStart={(e) => handleTouchStart(e, item.cartItemId)}
                      onTouchMove={(e) => handleTouchMove(e, item.cartItemId)}
                      onTouchEnd={() => handleTouchEnd(item.cartItemId)}
                      className="bg-white p-3 rounded-xl border border-gray-100 flex gap-3 relative z-10 transition-transform duration-200"
                    >
                      <img
                        src={
                          item.HINH_ANH ||
                          'https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=300'
                        }
                        alt={item.TEN_SP}
                        className="w-20 h-20 rounded-lg object-cover shrink-0"
                      />
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="font-semibold text-sm text-[#1a1c1c] line-clamp-1">
                              {item.TEN_SP}
                            </h3>
                            <span className="font-bold text-sm text-[#873e23]">
                              {Number(item.unitPrice * item.quantity).toLocaleString('vi-VN')} đ
                            </span>
                          </div>

                          {toppingsText && (
                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                              Topping: {toppingsText}
                            </p>
                          )}

                          {item.note && (
                            <p className="text-[10px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-1 line-clamp-1 font-medium w-fit border border-amber-200/60">
                              📝 {item.note}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleDecreaseQuantity(item)}
                              className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 active:bg-gray-100 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-bold text-xs">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.cartItemId, 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 active:bg-gray-100 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setItemToDelete(item)}
                            className="text-gray-400 hover:text-red-500 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Bottom Bar: Chỉ hiện Tổng tiền + Nút Place Order */}
        {cartItems.length > 0 && (
          <div className="fixed bottom-0 w-[390px] z-50 bg-[#f9f9f9] px-4 pt-3 pb-6 shadow-[0_-8px_16px_0_rgba(0,0,0,0.06)] border-t border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-sm text-[#1a1c1c]">Total Amount</span>
              <span className="font-extrabold text-lg text-[#873e23]">
                {getSubtotal().toLocaleString('vi-VN')} đ
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(user ? '/checkout' : '/login');
              }}
              className="w-full bg-[#FF8C00] hover:bg-[#e07b00] text-white h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md"
            >
              <span>Place Order</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* POPUP CONFIRMATION MODAL - ĐÃ XOÁ HÀNG "XÁC NHẬN XÓA" */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-[300px] shadow-2xl text-center flex flex-col items-center justify-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            
            <p className="text-xs text-gray-600 leading-relaxed px-1 my-1">
              Bạn có muốn xóa món <span className="font-bold text-red-600">"{itemToDelete.TEN_SP}"</span> khỏi giỏ hàng?
            </p>

            <div className="flex gap-2.5 w-full mt-5">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}