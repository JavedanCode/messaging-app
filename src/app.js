import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import passport from 'passport';
import { configurePassport } from './config/passport.js';

import authRoutes from './routes/auth.routes.js';
import userRouter from './routes/user.routes.js';

import { errorHandler } from './middleware/error-handler.js';

import { env } from './config/env.js';

const app = express();

// Apply security-related HTTP headers before handling application requests.
app.use(helmet());

// Allow the configured frontend to make credentialed cross-origin requests.
// Credentials are required because authentication tokens are stored in cookies.
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(compression());
app.use(morgan('dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

configurePassport();
app.use(passport.initialize());

app.use('/auth', authRoutes);
app.use('/users', userRouter);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running.',
  });
});

// Error handling middleware must be registered after all routes and other middleware
// so it can receive errors forwarded through Express's middleware chain.
app.use(errorHandler);

export default app;
