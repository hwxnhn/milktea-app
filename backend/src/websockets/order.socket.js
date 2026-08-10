import { getIO } from "./socket.js";

/**
 * Phát thông báo đơn hàng mới tới admin_room
 */
export const emitNewOrder = (orderData) => {
  try {
    const io = getIO();
    io.to("admin_room").emit("NEW_ORDER_CREATED", {
      success: true,
      message: "Có đơn hàng mới",
      data: orderData,
    });
  } catch (error) {
    console.error("[order.socket] emitNewOrder error:", error.message);
  }
};

/**
 * Phát cập nhật trạng thái đơn hàng tới customer_{MA_KH} và admin_room
 */
export const emitOrderStatusUpdate = (MA_KH, orderData) => {
  try {
    const io = getIO();
    const payload = {
      MA_DH: orderData.MA_DH,
      TRANG_THAI: orderData.TRANG_THAI,
      NGAY_CAP_NHAT: new Date().toISOString(),
    };

    if (MA_KH) {
      io.to(`customer_${MA_KH}`).emit("ORDER_STATUS_UPDATED", payload);
    }
    io.to("admin_room").emit("ORDER_STATUS_UPDATED", payload);
  } catch (error) {
    console.error("[order.socket] emitOrderStatusUpdate error:", error.message);
  }
};

/**
 * Phát thông báo hủy đơn tới customer_{MA_KH} và admin_room
 */
export const emitOrderCancelled = (MA_KH, orderData, lyDoHuy) => {
  try {
    const io = getIO();
    const payload = {
      MA_DH: orderData.MA_DH,
      LY_DO_HUY: lyDoHuy || "Đơn hàng đã bị hủy",
    };

    if (MA_KH) {
      io.to(`customer_${MA_KH}`).emit("ORDER_CANCELLED", payload);
    }
    io.to("admin_room").emit("ORDER_CANCELLED", payload);
  } catch (error) {
    console.error("[order.socket] emitOrderCancelled error:", error.message);
  }
};