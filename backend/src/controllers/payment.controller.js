import { processPayOSPayment, handlePayOSWebhook } from '../services/payment.service.js';

export const createPayment = async (req, res) => {
  try {
    const { MA_DH } = req.body;
    if (!MA_DH) {
      return res.status(400).json({ success: false, message: 'Mã đơn hàng (MA_DH) là bắt buộc.' });
    }

    // Nhận full object dữ liệu từ Service
    const paymentData = await processPayOSPayment(MA_DH);

    // ✅ BẮN TẤT CẢ DỮ LIỆU ĐÓ VỀ VỚI FRONTEND
    return res.status(200).json({
      success: true,
      message: 'Khởi tạo dữ liệu VietQR thành công.',
      data: paymentData
    });
  } catch (error) {
    console.error('[payment.controller] createPayment error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Đã có lỗi xảy ra, vui lòng thử lại sau.'
    });
  }
};

export const payOSWebhook = async (req, res) => {
  try {
    if (req.body && Object.keys(req.body).length > 0) {
      await handlePayOSWebhook(req.body);
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('[payment.controller] payOSWebhook error:', error);
    return res.status(200).json({
      success: true,
      message: 'Webhook received'
    });
  }
};