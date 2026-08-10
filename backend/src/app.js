import express from 'express';
import cors from 'cors';

// Import các file routes từ thư mục routes cùng cấp trong src/
import authRoutes from './routes/auth.routes.js';
import orderRoutes from './routes/order.routes.js';
import productRoutes from './routes/product.routes.js';
import toppingRoutes from './routes/topping.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import firebaseRoutes from './routes/firebase.routes.js';
import userRoutes from './routes/user.routes.js';
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Gắn các API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes); // 👈 Bắt buộc phải có dòng này!
app.use('/api/products', productRoutes);
app.use('/api/toppings', toppingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', firebaseRoutes);
app.use('/api/users', userRoutes);

export default app;