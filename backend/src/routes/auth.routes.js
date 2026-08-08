import express from "express";
import { register, login, getAllCustomers } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public routes (Không cần token)
router.post("/register", register);
router.post("/login", login);

// Protected routes (Cần token đăng nhập)
router.get("/customers", authenticate, getAllCustomers);

export default router;