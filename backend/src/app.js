import express from 'express';
import cors from 'cors';

// Import các file routes
import authRoutes from './routes/auth.routes.js';
import orderRoutes from './routes/order.routes.js';
import productRoutes from './routes/product.routes.js';
import toppingRoutes from './routes/topping.routes.js';

const app = express();

// Middleware cơ bản
app.use(cors());
app.use(express.json()); // Bắt buộc phải có để đọc được req.body dạng JSON

// Gắn các routes vào các endpoint tương ứng
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/toppings', toppingRoutes);

export default app;