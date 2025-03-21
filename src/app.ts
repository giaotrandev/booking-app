import express, { Express } from 'express';
import cors from 'cors';
// import helmet from 'helmet';
import dotenv from 'dotenv';
dotenv.config();
import passport from "passport";
import authRoutes from './routes/authRoutes';
import bookingRoutes from './routes/bookingRoutes';

const app: Express = express();
// Middleware
// app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);

// Health check route
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'OK' });
});

export default app;