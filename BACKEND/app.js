import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import sanitizeBody from './middleware/sanitize.js';
import ApiError from './utils/ApiError.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import staffPortalRoutes from './routes/staffPortalRoutes.js';
import timeOffRoutes from './routes/timeOffRoutes.js';

const app = express();

// Render (and most hosts) sit behind a proxy; needed for correct client IPs in rate limiting.
app.set('trust proxy', 1);
app.disable('x-powered-by');

const allowedOrigins = new Set([...config.clientUrls, ...config.adminUrls]);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser tools (no Origin header) and the configured frontends.
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      callback(new ApiError(403, `Origin ${origin} is not allowed by CORS.`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(sanitizeBody);
if (config.nodeEnv !== 'test') app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// API responses contain personal data: never let browsers or proxies cache them.
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.get('/', (_req, res) => res.json({ name: 'Online Appointment System API', status: 'ok' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/staff-portal', staffPortalRoutes);
app.use('/api/time-off', timeOffRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
