import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Truck,
  QrCode,
  AlertCircle,
  ChevronRight,
  ShoppingBag,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  
  const {
    cartItems,
    getSubtotal,
    getDeliveryFee,
    getTotalPrice,
    clearCart,
  } = useCart();

  const [address, setAddress] = useState(
    '245 Morning Dew Lane, Apartment 4B, Ho Chi Minh City'
  );
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      setError('Giỏ hàng của bạn đang trống!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const productsPayload = cartItems.map((item) => {
        const rawToppings = item.selectedToppings || item.toppings || item.TOPPINGS || [];
        const validToppingIds = rawToppings
          .map((t) => (typeof t === 'object' ? (t.MA_TOPPING || t.id || t.maTopping) : t))
          .filter((id) => typeof id === 'string' && id.trim() !== '');

        return {
          MA_SP: item.MA_SP || item.product?.MA_SP || item.id,
          SOLUONG: item.quantity,
          TOPPINGS: validToppingIds,
        };
      });

      const currentMaKh = user?.MA_KH || user?.id || user?.MA_ND;

      const orderData = {
        MA_KH: currentMaKh,
        PTTT: paymentMethod === 'TRANSFER' ? 'TRANSFER' : 'COD',
        DIA_CHI_GIAO_HANG: address,
        PHI_SHIP: getDeliveryFee(),
        products: productsPayload,
      };

      const res = await axiosClient.post('/orders', orderData);

      if (res.data?.success) {
        const createdMaDh = res.data.data?.MA_DH;

        if (paymentMethod === 'TRANSFER') {
          try {
            const paymentRes = await axiosClient.post('/payments/payos/create', {
              MA_DH: createdMaDh,
            });

            const payosData = paymentRes.data?.data;

            if (payosData) {
              clearCart();
              navigate('/payment', {
                state: {
                  orderId: createdMaDh,
                  amount: getTotalPrice() + getDeliveryFee(),
                  paymentData: payosData,
                },
              });
              return;
            } else {
              setError('Không nhận được thông tin thanh toán từ hệ thống PayOS.');
            }
          } catch (payErr) {
            console.error('❌ Lỗi gọi API PayOS:', payErr);
            setError(
              payErr.response?.data?.message ||
                'Đã tạo đơn thành công nhưng chưa lấy được mã QR.'
            );
          }
        } else {
          clearCart();
          alert(`🎉 Đặt hàng COD thành công! Mã đơn: ${createdMaDh}`);
          navigate('/orders');
        }
      }
    } catch (err) {
      console.error('❌ Lỗi tạo đơn hàng:', err);
      const errMsg =
        err.response?.data?.message || 'Đã có lỗi xảy ra khi tạo đơn hàng!';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] min-h-screen max-w-[390px] mx-auto relative flex flex-col shadow-2xl border border-gray-200">
      <header className="fixed top-0 w-[390px] z-40 bg-[#f9f9f9] flex items-center justify-between px-4 h-14 border-b border-gray-200">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center active:opacity-70 transition"
        >
          <ArrowLeft className="w-5 h-5 text-[#873e23]" />
        </button>
        <h1 className="text-lg font-bold text-[#873e23]">Thanh toán</h1>
        <div className="w-10"></div>
      </header>

      <main className="pt-16 pb-36 px-4 flex-1 overflow-y-auto hide-scrollbar space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#873e23]" />
              Địa chỉ nhận hàng
            </h2>
          </div>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            placeholder="Nhập địa chỉ nhận hàng..."
            className="w-full bg-[#f3f3f3] border border-gray-200 rounded-xl p-3 text-xs text-gray-800 outline-none focus:border-[#873e23] transition"
          />
        </section>

        <section className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-[#873e23]" />
              Đơn hàng ({cartItems.length} món)
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            {cartItems.map((item) => (
              <div key={item.cartItemId} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <img
                    src={
                      item.HINH_ANH ||
                      'https://images.unsplash.com/photo-1541658016709-82535e94bc69?q=80&w=200'
                    }
                    alt={item.TEN_SP}
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                  <div>
                    <h3 className="text-xs font-bold text-gray-800 line-clamp-1">
                      {item.TEN_SP}
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      x{item.quantity} • {item.size}
                    </p>
                    {item.note && (
                      <p className="text-[9px] text-amber-700 bg-amber-50 px-1 rounded w-fit mt-0.5">
                        {item.note}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs font-bold text-[#873e23] shrink-0">
                  {(item.unitPrice * item.quantity).toLocaleString('vi-VN')} đ
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Phương thức thanh toán
          </h2>

          <div className="space-y-2.5">
            <label
              onClick={() => setPaymentMethod('COD')}
              className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                paymentMethod === 'COD'
                  ? 'border-[#873e23] bg-green-50/50 shadow-xs'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-100 text-[#873e23] flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-xs text-gray-800">
                    Thanh toán khi nhận hàng (COD)
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Thanh toán bằng tiền mặt cho shipper khi giao
                  </p>
                </div>
              </div>
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'COD'}
                onChange={() => setPaymentMethod('COD')}
                className="w-4 h-4 text-[#873e23] focus:ring-[#873e23]"
              />
            </label>

            <label
              onClick={() => setPaymentMethod('TRANSFER')}
              className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                paymentMethod === 'TRANSFER'
                  ? 'border-[#873e23] bg-green-50/50 shadow-xs'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-100 text-[#FF8C00] flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                    Chuyển khoản QR (PayOS / VietQR)
                    <span className="text-[9px] font-extrabold bg-[#FF8C00] text-white px-1.5 py-0.2 rounded">
                      HOT
                    </span>
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Thanh toán tự động qua mã QR ngân hàng
                  </p>
                </div>
              </div>
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'TRANSFER'}
                onChange={() => setPaymentMethod('TRANSFER')}
                className="w-4 h-4 text-[#873e23] focus:ring-[#873e23]"
              />
            </label>
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 w-[390px] bg-white p-4 shadow-[0_-8px_16px_0_rgba(0,0,0,0.06)] border-t border-gray-100 z-50 space-y-3">
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-gray-500">
            <span>Tiền hàng</span>
            <span>{getSubtotal().toLocaleString('vi-VN')} đ</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Phí vận chuyển</span>
            <span>{getDeliveryFee().toLocaleString('vi-VN')} đ</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <span className="font-bold text-sm text-gray-800">Tổng thanh toán</span>
            <span className="font-extrabold text-base text-[#873e23]">
              {(getSubtotal() + getDeliveryFee()).toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={loading || cartItems.length === 0}
          onClick={handlePlaceOrder}
          className="w-full bg-[#FF8C00] hover:bg-[#e07b00] disabled:bg-gray-300 text-white py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer"
        >
          {loading ? (
            <span className="animate-pulse">Đang xử lý tạo đơn...</span>
          ) : (
            <>
              <span>
                {paymentMethod === 'TRANSFER'
                  ? 'Thanh toán ngay qua VietQR'
                  : 'Xác nhận đặt hàng (COD)'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}