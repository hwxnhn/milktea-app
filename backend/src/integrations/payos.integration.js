import PayosModule from '@payos/node';
import dotenv from 'dotenv';

dotenv.config();

// Lấy đúng Constructor bất chấp kiểu Export ESM/CJS của thư viện
const PayOSConstructor = PayosModule.PayOS || PayosModule.default || PayosModule;

// Khởi tạo SDK PayOS v2+
const payOS = new PayOSConstructor({
  clientId: process.env.PAYOS_CLIENT_ID?.trim(),
  apiKey: process.env.PAYOS_API_KEY?.trim(),
  checksumKey: process.env.PAYOS_CHECKSUM_KEY?.trim(),
});

/**
 * Tạo link thanh toán VietQR với PayOS
 */
export const createPayOSPayment = async ({ orderId, amount, description }) => {
  // Lấy phần số từ mã đơn hàng (VD: DH001 -> 1)
  const numericOnly = String(orderId).replace(/\D/g, '');
  const numericOrderCode = numericOnly !== '' 
    ? Number(numericOnly) 
    : Number(Date.now().toString().slice(-6));

  const paymentData = {
    orderCode: numericOrderCode,
    amount: Math.round(Number(amount)),
    description: description || `Thanh toan don ${orderId}`,
    returnUrl: process.env.PAYOS_RETURN_URL || 'http://localhost:3000',
    cancelUrl: process.env.PAYOS_CANCEL_URL || 'http://localhost:3000',
  };

  return await payOS.paymentRequests.create(paymentData);
};

/**
 * Xác thực dữ liệu Webhook gửi về từ PayOS (kiểm tra chữ ký checksum)
 */
export const verifyPayOSWebhook = (webhookBody) => {
  return payOS.webhooks.verify(webhookBody);
};