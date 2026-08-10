import prisma from '../config/prisma.js';
import { createPayOSPayment, verifyPayOSWebhook } from '../integrations/payos.integration.js';

/**
 * Tạo link & dữ liệu thanh toán VietQR cho đơn hàng
 */
export const processPayOSPayment = async (orderId) => {
  const order = await prisma.dON_HANG.findUnique({
    where: { MA_DH: orderId }
  });

  if (!order) {
    throw new Error('Không tìm thấy đơn hàng để thanh toán.');
  }

  const amount = Number(order.TONG_TIEN);
  const description = `Thanh toan don ${orderId}`;

  // Gọi PayOS SDK
  const paymentResult = await createPayOSPayment({
    orderId,
    amount,
    description
  });

  // ✅ TRẢ VỀ TOÀN BỘ OBJECT KẾT QUẢ CỦA PAYOS (Bao gồm qrCode, accountNumber, accountName, bin...)
  return paymentResult;
};

/**
 * Xử lý Webhook tự động từ PayOS
 */
export const handlePayOSWebhook = async (webhookBody) => {
  // 1. Xác thực chữ ký dữ liệu từ PayOS
  const verifiedData = verifyPayOSWebhook(webhookBody);

  // 2. Chỉ xử lý khi mã trạng thái thành công ('00')
  if (webhookBody.code === '00' && verifiedData) {
    const orderCode = verifiedData.orderCode;
    const description = verifiedData.description || '';
    
    // Tách mã đơn hàng dạng "DH..." từ description
    const match = description.match(/DH\d+/i);
    let targetOrderId = match ? match[0].toUpperCase() : null;

    if (!targetOrderId && orderCode) {
      targetOrderId = `DH${String(orderCode).padStart(3, '0')}`;
    }

    if (targetOrderId) {
      await prisma.dON_HANG.update({
        where: { MA_DH: targetOrderId },
        data: {
          TRANG_THAI: 'ĐÃ THANH TOÁN',
          PTTT: 'VIETQR',
          MA_GIAO_DICH_CONG: String(verifiedData.reference || verifiedData.paymentLinkId)
        }
      });
      console.log(`[PayOS Webhook] Cập nhật thành công đơn hàng: ${targetOrderId}`);
    }
  }

  return true;
};