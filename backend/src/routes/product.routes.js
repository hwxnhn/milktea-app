import express from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";

const router = express.Router();

// Public route: Ai cũng xem được sản phẩm
router.get("/", getAllProducts);
router.get("/:MA_SP", getProductById);

// 🔒 Tạo/sửa sản phẩm: Cần đăng nhập + Role ADMIN hoặc NHAN_VIEN
router.post(
  "/",
  authenticate,
  authorize("ADMIN", "NHAN_VIEN"),
  createProduct
);

router.put(
  "/:MA_SP",
  authenticate,
  authorize("ADMIN", "NHAN_VIEN"),
  updateProduct
);

// 🔒 Xóa sản phẩm: Cần đăng nhập + Role ADMIN
router.delete(
  "/:MA_SP",
  authenticate,
  authorize("ADMIN"),
  deleteProduct
);

export default router;