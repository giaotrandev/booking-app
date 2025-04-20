// import 'module-alias/register';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { setupI18n, languageDetector } from '#middleware/i18nMiddleware';

dotenv.config();

import passport from 'passport';
import authRoutes from '#routes/authRoutes';
import bookingRoutes from '#routes/bookingRoutes';
import { languageMiddleware } from '#middleware/languageMiddleware';
import { mongooseErrorHandler } from '#middleware/mongooseErrorHandler';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(languageMiddleware);
app.use(languageDetector);
app.use(setupI18n());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);

// Health check route
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'OK' });
});

app.use(mongooseErrorHandler);

export default app;
