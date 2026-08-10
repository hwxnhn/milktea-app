import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Copy, QrCode, ShieldCheck } from 'lucide-react';

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { orderId, amount, paymentData } = location.state || {};

  if (!orderId) {
    return (
      <div className="bg-[#f9f9f9] min-h-screen max-w-[390px] mx-auto p-6 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-gray-500 mb-4">Không tìm thấy thông tin thanh toán đơn hàng.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-5 py-2.5 bg-[#2596be] text-white rounded-xl text-xs font-bold"
        >
          Quay về Trang chủ
        </button>
      </div>
    );
  }

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    alert('Đã sao chép!');
  };

  const transferAmount = paymentData?.amount || amount || 0;
  const description = paymentData?.description || `Thanh toan don ${orderId}`;
  const accountNumber = paymentData?.accountNumber || '';
  const accountName = paymentData?.accountName || '';
  const bin = paymentData?.bin || '970422'; // Default MBBank

  // Tạo URL lấy đúng tấm ảnh VietQR PRO có logo Napas + Logo Ngân hàng chuẩn đét
  const vietQrImageUrl = accountNumber
    ? `https://img.vietqr.io/image/${bin}-${accountNumber}-compact2.png?amount=${transferAmount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`
    : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentData?.qrCode || paymentData?.checkoutUrl || '')}`;

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] min-h-screen max-w-[390px] mx-auto relative flex flex-col shadow-2xl border border-gray-200">
      {/* Header */}
      <header className="fixed top-0 w-[390px] z-40 bg-[#f9f9f9] flex items-center justify-between px-4 h-14 border-b border-gray-200">
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="w-10 h-10 flex items-center justify-center active:opacity-70 transition"
        >
          <ArrowLeft className="w-5 h-5 text-[#2596be]" />
        </button>
        <h1 className="text-lg font-bold text-[#2596be]">Thanh toán VietQR</h1>
        <div className="w-10"></div>
      </header>

      {/* Content */}
      <main className="pt-16 pb-24 px-4 flex-1 overflow-y-auto hide-scrollbar space-y-4">
        
        {/* KHUNG MÃ VIETQR PRO */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#FF8C00] bg-orange-50 py-1 px-3 rounded-full w-fit mx-auto">
            <QrCode className="w-4 h-4" />
            <span>Quét mã VietQR bằng App Ngân hàng</span>
          </div>

          {/* Ô Vuông chỉ chứa tấm hình VietQR PRO */}
          <div className="w-64 h-auto mx-auto border-2 border-dashed border-gray-200 rounded-2xl p-2 bg-white flex items-center justify-center shadow-inner">
            <img
              src={vietQrImageUrl}
              alt="Mã VietQR Thanh Toán"
              className="w-full h-auto object-contain rounded-lg"
            />
          </div>

          <p className="text-[11px] text-gray-400">
            Mở App ngân hàng (MBBank, Vietcombank,...) và chọn quét QR
          </p>
        </div>

        {/* Thông tin chuyển khoản chi tiết */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3 text-xs">
          <h2 className="font-bold text-gray-700 text-[11px] uppercase tracking-wider">
            THÔNG TIN CHUYỂN KHOẢN
          </h2>

          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <span className="text-gray-500">Mã đơn hàng:</span>
            <div className="flex items-center gap-1 font-bold text-gray-800">
              <span>{orderId}</span>
              <button type="button" onClick={() => handleCopy(orderId)} className="text-[#2596be]">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {accountName && (
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-500">Chủ tài khoản:</span>
              <span className="font-bold text-gray-800 uppercase">{accountName}</span>
            </div>
          )}

          {accountNumber && (
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-500">Số tài khoản:</span>
              <div className="flex items-center gap-1 font-bold text-gray-800">
                <span>{accountNumber}</span>
                <button type="button" onClick={() => handleCopy(accountNumber)} className="text-[#2596be]">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <span className="text-gray-500">Số tiền cần thanh toán:</span>
            <div className="flex items-center gap-1 font-extrabold text-[#2596be] text-sm">
              <span>{Number(transferAmount).toLocaleString('vi-VN')} đ</span>
              <button type="button" onClick={() => handleCopy(transferAmount.toString())} className="text-[#2596be]">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-start">
            <span className="text-gray-500">Nội dung chuyển khoản:</span>
            <div className="flex items-center gap-1 font-bold text-[#FF8C00]">
              <span className="bg-orange-50 px-1.5 py-0.5 rounded text-[11px]">{description}</span>
              <button
                type="button"
                onClick={() => handleCopy(description)}
                className="text-[#FF8C00]"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Thông báo tự động */}
        <div className="p-3 bg-cyan-50 border border-cyan-200 text-[#2596be] rounded-xl text-[11px] flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 shrink-0 text-[#2596be]" />
          <span>Đơn hàng sẽ tự động xác nhận ngay khi hệ thống nhận được tiền chuyển khoản!</span>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 w-[390px] bg-white p-4 shadow-[0_-8px_16px_0_rgba(0,0,0,0.06)] border-t border-gray-100 z-50">
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="w-full bg-[#2596be] text-white py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Tôi đã chuyển khoản xong</span>
        </button>
      </div>
    </div>
  );
}