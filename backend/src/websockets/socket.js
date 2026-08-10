import { Server } from "socket.io";

let io;

/**
 * Khởi tạo WebSocket Server từ HTTP Server
 */
export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[socket.io] Client connected: ${socket.id}`);

    // Xử lý sự kiện đăng ký room từ Client
    socket.on("JOIN_ROOM", (payload) => {
      if (!payload || typeof payload !== "object") return;

      const { role, MA_KH } = payload;

      if (role === "ADMIN") {
        socket.join("admin_room");
        console.log(`[socket.io] ${socket.id} joined room: admin_room`);
      } else if (role === "CUSTOMER" && MA_KH && typeof MA_KH === "string") {
        const roomName = `customer_${MA_KH}`;
        socket.join(roomName);
        console.log(`[socket.io] ${socket.id} joined room: ${roomName}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Lấy instance của Socket.IO Server để sử dụng ở nơi khác
 */
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io chưa được khởi tạo!");
  }
  return io;
};