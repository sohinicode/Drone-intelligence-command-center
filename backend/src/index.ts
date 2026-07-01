import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { initDatabases, logger, isPostgresConnected, isMongoConnected, isRedisConnected } from './config/db';
import { initWebSocket } from './services/ws';
import { initQueues } from './services/queues';

// Routers
import authRouter from './routes/auth';
import projectsRouter from './routes/projects';
import uploadRouter from './routes/upload';
import reportsRouter from './routes/reports';
import chatRouter from './routes/chat';
import adminRouter from './routes/admin';
import notificationsRouter from './routes/notifications';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 1. Security Enhancements
app.use(helmet({
  crossOriginResourcePolicy: false, // allow images/files to load on frontend from this origin
}));

app.use(cors({
  origin: '*', // open for testing client instances
  credentials: true
}));

// Rate limiter for security (max 300 requests per 15 minutes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests from this IP. Please try again after 15 minutes.' }
});
app.use(globalLimiter);

// 2. Request Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Logger Integration (Morgan + Winston)
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// Static uploads server (for downloading reports / viewing drone images)
app.use('/uploads', express.static(uploadsDir));

// 4. API Endpoint Definitions
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notifications', notificationsRouter);

// 5. System Health Check Endpoint
app.get('/health', (req, res) => {
  const memory = process.memoryUsage();
  return res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date(),
    services: {
      postgresql: isPostgresConnected ? 'connected' : 'fallback_mode',
      mongodb: isMongoConnected ? 'connected' : 'fallback_mode',
      redis: isRedisConnected ? 'connected' : 'fallback_mode'
    },
    memory: {
      rss: `${(memory.rss / 1024 / 1024).toFixed(1)} MB`,
      heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(1)} MB`,
      heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(1)} MB`
    }
  });
});

// 6. Global Error Handler Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Unhandled Exception: ${err.message}`);
  return res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// 7. Bootstrapping Server Sequence
const startServer = async () => {
  try {
    // Connect to databases
    await initDatabases();
    
    // Connect to BullMQ queues
    initQueues();
    
    // Initialize WebSockets
    initWebSocket(server);

    server.listen(PORT, () => {
      logger.info(`================================================================`);
      logger.info(` DRONE INTELLIGENCE COMMAND CENTER SERVER RUNNING ON PORT ${PORT} `);
      logger.info(`================================================================`);
    });
  } catch (err: any) {
    logger.error(`Critical Server Boot Error: ${err.message}`);
    process.exit(1);
  }
};

export default app;
startServer();
// Trigger nodemon reload after port cleanup
