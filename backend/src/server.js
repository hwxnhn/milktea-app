import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import { initSocket } from "./websockets/socket.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

// Chuyển sang dùng http.createServer để tích hợp Socket.io
const server = http.createServer(app);

// Khởi tạo Socket Server
initSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port http://localhost:${PORT}`);
});