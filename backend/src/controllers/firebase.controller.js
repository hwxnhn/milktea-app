import { 
  updateCustomerFCMToken, 
  sendTestNotificationToCustomer 
} from '../services/firebase.services.js';

export const saveFCMToken = async (req, res) => {
  try {
    const { MA_KH, fcmToken } = req.body;
    
    if (!MA_KH || !fcmToken) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin MA_KH hoặc fcmToken.",
      });
    }

    await updateCustomerFCMToken(MA_KH, fcmToken);

    return res.status(200).json({
      success: true,
      message: "Cập nhật FCM Token thành công.",
      data: null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lưu FCM Token.",
      data: { error: error.message },
    });
  }
};

export const sendTestNotification = async (req, res) => {
  try {
    const { MA_KH, title, body } = req.body;

    if (!MA_KH || !title || !body) {
      return res.status(400).json({
        success: false,
        message: "Thiếu dữ liệu MA_KH, title hoặc body.",
      });
    }

    await sendTestNotificationToCustomer(MA_KH, title, body);

    return res.status(200).json({
      success: true,
      message: "Gửi thông báo thành công.",
      data: { MA_KH, title },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Không thể gửi thông báo.",
      data: { error: error.message },
    });
  }
};