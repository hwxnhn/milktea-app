import express from 'express';
import { createPayment, payOSWebhook } from '../controllers/payment.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';

const router = express.Router();

/**
 * @route   POST /api/payments/payos/create
 * @desc    Tạo link thanh toán VietQR qua PayOS
 * @access  Private (Cần Token đăng nhập)
 */
router.post('/payos/create', authenticate, createPayment);

/**
 * @route   POST /api/payments/payos/webhook
 * @desc    Webhook nhận thông báo kết quả thanh toán từ PayOS Server
 * @access  Public (Nội bộ PayOS gọi sang, không dùng Auth Token)
 */
router.post('/payos/webhook', payOSWebhook);

export default router;