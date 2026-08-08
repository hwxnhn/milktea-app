import express from 'express';
import {
  getAllOrders,
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

router.get('/', getAllOrders);
router.get('/:MA_DH', getOrderById);
router.post('/', createOrder);


router.patch(
  "/:MA_DH/status",
  authorize("NHAN_VIEN", "ADMIN"),
  updateOrderStatus
);

router.delete("/:MA_DH", authorize("ADMIN"), deleteOrder);

export default router;