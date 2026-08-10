import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';

/**
 * Lấy thông tin cá nhân của người dùng đang đăng nhập
 */
export const getProfile = async (req, res) => {
  try {
    const maKh = req.user?.MA_KH || req.user?.id;

    if (!maKh) {
      return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập.' });
    }

    const user = await prisma.kHACH_HANG.findUnique({
      where: { MA_KH: maKh },
      select: {
        MA_KH: true,
        TEN: true,
        SDT: true,
        EMAIL: true,
        VAITRO: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin người dùng.' });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('[user.controller] getProfile error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi lấy profile.' });
  }
};

/**
 * Cập nhật thông tin tên & số điện thoại
 */
export const updateProfile = async (req, res) => {
  try {
    const maKh = req.user?.MA_KH || req.user?.id;
    const { TEN, SDT } = req.body;

    if (!maKh) {
      return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập.' });
    }

    const updatedUser = await prisma.kHACH_HANG.update({
      where: { MA_KH: maKh },
      data: {
        ...(TEN !== undefined && { TEN }),
        ...(SDT !== undefined && { SDT }),
      },
      select: {
        MA_KH: true,
        TEN: true,
        SDT: true,
        EMAIL: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin thành công.',
      data: updatedUser,
    });
  } catch (error) {
    console.error('[user.controller] updateProfile error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật profile.' });
  }
};

/**
 * Đổi mật khẩu
 */
export const changePassword = async (req, res) => {
  try {
    const maKh = req.user?.MA_KH || req.user?.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ mật khẩu cũ và mới.' });
    }

    const user = await prisma.kHACH_HANG.findUnique({
      where: { MA_KH: maKh },
    });

    if (!user || !user.MAT_KHAU) {
      return res.status(400).json({ success: false, message: 'Tài khoản không hỗ trợ đổi mật khẩu (Đăng nhập qua Google/Facebook).' });
    }

    // Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, user.MAT_KHAU);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu cũ không chính xác.' });
    }

    // Mã hóa mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.kHACH_HANG.update({
      where: { MA_KH: maKh },
      data: { MAT_KHAU: hashedPassword },
    });

    return res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công.',
    });
  } catch (error) {
    console.error('[user.controller] changePassword error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi đổi mật khẩu.' });
  }
};