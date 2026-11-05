import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';

import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import articleRoutes from './routes/article.routes.js';
import cartRoutes from './routes/cart.routes.js';
import orderRoutes from './routes/order.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import stylistRoutes from './routes/stylist.routes.js';
import seoRoutes from './routes/seo.routes.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';

export const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(
  cors({
    origin: clientOrigin.split(',').map((s) => s.trim()),
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

// استاتیک برای تصاویر placeholder
const publicDir = path.resolve(path.join(process.cwd(), 'public'));
if (fs.existsSync(publicDir)) {
  app.use('/static', express.static(publicDir));
}

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'CAVERO API آماده است', timestamp: new Date().toISOString() });
});

// robots.txt و sitemap.xml (ریشه دامنه)
app.use('/', seoRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stylist', stylistRoutes);

app.use(notFound);
app.use(errorHandler);