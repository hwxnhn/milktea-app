import express from 'express';
import {
  getAllOrders,
  getMyOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder
} from '../controllers/order.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from "../middlewares/authorize.middleware.js";

const router = express.Router();

// Áp dụng middleware authenticate cho TẤT CẢ các route đơn hàng
router.use(authenticate);

// ✅ Route lấy đơn hàng CỦA CHÍNH KHÁCH HÀNG ĐANG ĐĂNG NHẬP
router.get('/my-orders', getMyOrders);

// Route của Admin / Nhân viên
router.get('/', authorize("NHAN_VIEN", "ADMIN"), getAllOrders);
router.get('/:MA_DH', getOrderById);
router.post('/', createOrder);

router.patch(
  "/:MA_DH/status",
  authorize("NHAN_VIEN", "ADMIN"),
  updateOrderStatus
);

router.delete("/:MA_DH", authorize("ADMIN"), deleteOrder);

export default router;