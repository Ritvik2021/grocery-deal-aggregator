import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { startCronJobs } from './cron';
import storesRouter from './routes/stores';
import dealsRouter from './routes/deals';
import adminRouter from './routes/admin';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/stores', storesRouter);
app.use('/api/deals', dealsRouter);
app.use('/api/admin', adminRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  startCronJobs();
});

export default app;
