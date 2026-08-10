import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import dotenv from 'dotenv';

dotenv.config();

// Khởi tạo Firebase Admin App bằng Modular API
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Replace xử lý lỗi xuống dòng trong chuỗi private_key từ .env
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

/**
 * Gửi thông báo tới 1 thiết bị cụ thể
 */
export const sendFCMNotification = async ({ token, title, body, data = {} }) => {
  try {
    const message = {
      token,
      notification: { title, body },
      data, 
    };
    // Sử dụng getMessaging() thay vì admin.messaging()
    const response = await getMessaging().send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error(`[FCM Error] Lỗi gửi thông báo cho token ${token}:`, error.message);
    if (error.code === 'messaging/registration-token-not-registered' || error.code === 'messaging/invalid-registration-token') {
      return { success: false, error: 'TOKEN_INVALID' };
    }
    return { success: false, error: error.message };
  }
};

/**
 * Gửi thông báo tới nhiều thiết bị cùng lúc (Multicast)
 */
export const sendFCMMulticast = async ({ tokens, title, body, data = {} }) => {
  try {
    if (!tokens || tokens.length === 0) return { success: false, error: 'NO_TOKENS' };
    
    const message = {
      tokens,
      notification: { title, body },
      data,
    };
    // Sử dụng getMessaging() thay vì admin.messaging()
    const response = await getMessaging().sendEachForMulticast(message);
    return { success: true, ...response };
  } catch (error) {
    console.error('[FCM Multicast Error]:', error.message);
    return { success: false, error: error.message };
  }
};