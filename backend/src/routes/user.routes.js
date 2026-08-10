import express from 'express';
import { getProfile, updateProfile, changePassword } from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js'; // Hoặc đường dẫn file auth middleware của m

const router = express.Router();


router.use(authenticate);

// Route lấy thông tin cá nhân
router.get('/profile', getProfile);

// Route cập nhật tên / số điện thoại
router.put('/profile', updateProfile);

// Route đổi mật khẩu
router.put('/change-password', changePassword);

export default router;