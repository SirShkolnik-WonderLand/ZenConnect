import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '../../database/src/generated/prisma';

// Import routes
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import serviceRoutes from './routes/services';
import referralRoutes from './routes/referrals';
import uploadRoutes from './routes/uploads';
import auditRoutes from './routes/audit';
import mailchimpRoutes from './routes/mailchimp';
import userRoutes from './routes/users';
import settingsRoutes from './routes/settings';

const app = express();
const port = process.env.PORT || 3002;
const prisma = new PrismaClient();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/healthz', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/mailchimp', mailchimpRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`🚀 Backend server running on port ${port}`);
});

export default app;
