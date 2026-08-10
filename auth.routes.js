import express from 'express';
import { 
  register, 
  loginWithEmail, 
  loginWithGoogle, 
  loginWithFacebook 
} from '../controllers/auth.controller.js';

const router = express.Router();

// 1. Endpoint Đăng ký thông thường
router.post('/register', register);

// 2. Endpoint Đăng nhập bằng Email vừa đăng ký
router.post('/login', loginWithEmail);

// 3. Endpoint Đăng nhập bằng Google
router.post('/google', loginWithGoogle);

// 4. Endpoint Đăng nhập bằng Facebook
router.post('/facebook', loginWithFacebook);

export default router;