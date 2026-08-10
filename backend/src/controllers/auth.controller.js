import bcrypt from 'bcryptjs';
import axios from 'axios';
import prisma from '../config/prisma.js';
import { generateToken } from '../utils/jwt.js';

// Hàm hỗ trợ tự động sinh mã khách hàng (MA_KH) dạng KH001, KH002...
const generateNewMaKh = async () => {
  const result = await prisma.$queryRaw`
    SELECT COALESCE(MAX(CAST(SUBSTRING("MA_KH" FROM 3) AS INTEGER)), 0) AS max_num
    FROM "KHACH_HANG"
  `;
  const nextNumber = Number(result[0].max_num) + 1;
  return `KH${String(nextNumber).padStart(3, "0")}`;
};

/**
 * 1. Đăng ký tài khoản mới bằng EMAIL và MAT_KHAU truyền thống
 */
export const register = async (req, res) => {
  try {
    const { TEN, SDT, EMAIL, MAT_KHAU } = req.body;

    if (!EMAIL || !MAT_KHAU) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ email và mật khẩu.",
      });
    }

    const existingUser = await prisma.kHACH_HANG.findUnique({
      where: { EMAIL: EMAIL.trim().toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email này đã được sử dụng.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(MAT_KHAU, salt);
    const newMaKh = await generateNewMaKh();

    const newCustomer = await prisma.kHACH_HANG.create({
      data: {
        MA_KH: newMaKh,
        TEN: TEN || "Khách hàng mới",
        SDT: SDT || null,
        EMAIL: EMAIL.trim().toLowerCase(),
        MAT_KHAU: hashedPassword,
        VAITRO: "KHACH_HANG",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản thành công.",
      user: {
        MA_KH: newCustomer.MA_KH,
        TEN: newCustomer.TEN,
        EMAIL: newCustomer.EMAIL,
        VAITRO: newCustomer.VAITRO,
      },
    });
  } catch (error) {
    console.error("[auth.controller] register error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi đăng ký.",
    });
  }
};

/**
 * 2. Đăng nhập bằng EMAIL và MAT_KHAU vừa đăng ký
 */
export const loginWithEmail = async (req, res) => {
  try {
    const { EMAIL, MAT_KHAU } = req.body;

    if (!EMAIL || !MAT_KHAU) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp email và mật khẩu.",
      });
    }

    const customer = await prisma.kHACH_HANG.findUnique({
      where: { EMAIL: EMAIL.trim().toLowerCase() },
    });

    if (!customer || !customer.MAT_KHAU) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác.",
      });
    }

    const isMatch = await bcrypt.compare(MAT_KHAU, customer.MAT_KHAU);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác.",
      });
    }

    const token = generateToken({
      MA_KH: customer.MA_KH,
      EMAIL: customer.EMAIL,
      VAITRO: customer.VAITRO,
    });

    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công.",
      token,
      user: {
        MA_KH: customer.MA_KH,
        TEN: customer.TEN,
        EMAIL: customer.EMAIL,
        VAITRO: customer.VAITRO,
      },
    });
  } catch (error) {
    console.error("[auth.controller] loginWithEmail error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi đăng nhập.",
    });
  }
};

/**
 * 3. Đăng nhập / Đăng ký bằng Google OAuth 2.0
 */
export const loginWithGoogle = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: "Thiếu idToken từ Google." });
    }

    const googleResponse = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );
    const { sub: googleId, email, name } = googleResponse.data;

    if (!email) {
      return res.status(400).json({ success: false, message: "Không thể lấy email từ Google." });
    }

    let customer = await prisma.kHACH_HANG.findUnique({
      where: { EMAIL: email },
    });

    if (customer) {
      if (!customer.GOOGLE_ID) {
        customer = await prisma.kHACH_HANG.update({
          where: { EMAIL: email },
          data: { GOOGLE_ID: googleId },
        });
      }
    } else {
      const newMaKh = await generateNewMaKh();
      customer = await prisma.kHACH_HANG.create({
        data: {
          MA_KH: newMaKh,
          TEN: name || "Khách hàng Google",
          EMAIL: email,
          GOOGLE_ID: googleId,
          VAITRO: "KHACH_HANG",
        },
      });
    }

    const token = generateToken({
      MA_KH: customer.MA_KH,
      EMAIL: customer.EMAIL,
      VAITRO: customer.VAITRO,
    });

    return res.status(200).json({
      success: true,
      message: "Đăng nhập Google thành công.",
      token,
      user: {
        MA_KH: customer.MA_KH,
        TEN: customer.TEN,
        EMAIL: customer.EMAIL,
        VAITRO: customer.VAITRO,
      },
    });
  } catch (error) {
    console.error("[auth.controller] loginWithGoogle error:", error.response?.data || error.message);
    return res.status(500).json({ success: false, message: "Lỗi xác thực Google." });
  }
};

/**
 * 4. Đăng nhập / Đăng ký bằng Facebook Login
 */
export const loginWithFacebook = async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ success: false, message: "Thiếu accessToken từ Facebook." });
    }

    const fbResponse = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`
    );
    const { id: facebookId, email, name } = fbResponse.data;

    if (!email) {
      return res.status(400).json({ success: false, message: "Tài khoản Facebook chưa cung cấp email." });
    }

    let customer = await prisma.kHACH_HANG.findUnique({
      where: { EMAIL: email },
    });

    if (customer) {
      if (!customer.FACEBOOK_ID) {
        customer = await prisma.kHACH_HANG.update({
          where: { EMAIL: email },
          data: { FACEBOOK_ID: facebookId },
        });
      }
    } else {
      const newMaKh = await generateNewMaKh();
      customer = await prisma.kHACH_HANG.create({
        data: {
          MA_KH: newMaKh,
          TEN: name || "Khách hàng Facebook",
          EMAIL: email,
          FACEBOOK_ID: facebookId,
          VAITRO: "KHACH_HANG",
        },
      });
    }

    const token = generateToken({
      MA_KH: customer.MA_KH,
      EMAIL: customer.EMAIL,
      VAITRO: customer.VAITRO,
    });

    return res.status(200).json({
      success: true,
      message: "Đăng nhập Facebook thành công.",
      token,
      user: {
        MA_KH: customer.MA_KH,
        TEN: customer.TEN,
        EMAIL: customer.EMAIL,
        VAITRO: customer.VAITRO,
      },
    });
  } catch (error) {
    console.error("[auth.controller] loginWithFacebook error:", error.response?.data || error.message);
    return res.status(500).json({ success: false, message: "Lỗi xác thực Facebook." });
  }
};