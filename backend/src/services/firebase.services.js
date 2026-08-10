import prisma from '../config/prisma.js';
import { sendFCMNotification } from '../integrations/firebase.integrations.js';

/**
 * Cập nhật/Lưu FCM Token cho khách hàng
 */
export const updateCustomerFCMToken = async (MA_KH, fcmToken) => {
  // Update bảng KHACH_HANG trong DB
  const updatedCustomer = await prisma.kHACH_HANG.update({
    where: { MA_KH },
    data: { FCM_TOKEN: fcmToken },
  });
  return updatedCustomer;
};

/**
 * Gửi thông báo khi đơn hàng đổi trạng thái
 */
export const notifyOrderStatusChange = async (MA_DH, newStatus) => {
  // Query bảng DON_HANG lấy thông tin đơn và FCM_TOKEN của KHACH_HANG
  const order = await prisma.dON_HANG.findUnique({
    where: { MA_DH },
    include: { KHACH_HANG: true },
  });

  if (!order || !order.KHACH_HANG || !order.KHACH_HANG.FCM_TOKEN) {
    // Không có thông tin hoặc khách hàng chưa có token -> Bỏ qua
    return false; 
  }

  const token = order.KHACH_HANG.FCM_TOKEN;
  const title = `Cập nhật đơn hàng #${MA_DH}`;
  const body = `Đơn hàng của bạn đã chuyển sang trạng thái: ${newStatus}`;
  
  const result = await sendFCMNotification({
    token,
    title,
    body,
    data: { orderId: String(MA_DH), status: String(newStatus) },
  });

  // Nếu token hỏng (khách xóa app), ta có thể xóa token trong DB để dọn dẹp
  if (!result.success && result.error === 'TOKEN_INVALID') {
    await prisma.kHACH_HANG.update({
      where: { MA_KH: order.MA_KH },
      data: { FCM_TOKEN: null },
    });
  }

  return result.success;
};

/**
 * Gửi thông báo test thủ công cho 1 khách hàng cụ thể
 */
export const sendTestNotificationToCustomer = async (MA_KH, title, body) => {
  const customer = await prisma.kHACH_HANG.findUnique({
    where: { MA_KH },
    select: { FCM_TOKEN: true },
  });

  if (!customer || !customer.FCM_TOKEN) {
    throw new Error('Khách hàng không tồn tại hoặc chưa lưu FCM Token.');
  }

  const result = await sendFCMNotification({
    token: customer.FCM_TOKEN,
    title,
    body,
  });

  if (!result.success) throw new Error(result.error);
  return result;
};