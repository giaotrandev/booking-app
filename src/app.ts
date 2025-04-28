import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

import passport from 'passport';
import authRoutes from '#routes/authRoutes';
import { setupI18n, languageDetector } from '#middlewares/i18nMiddleware';
import { languageMiddleware } from '#middlewares/languageMiddleware';
import { prismaErrorHandler } from '#middlewares/prismaErrorHandler';
import { sendServerError } from '#utils/apiResponse';
import { authenticateToken } from '#middlewares/authMiddleware';
import { validatePermissions } from '#middlewares/permissionMiddleware';

import { apiSpecification } from '#docs/openapi';
import setupSecurityMiddleware from '#middlewares/setupSecurityMiddleware';

const app: Express = express();
const nonce = crypto.randomBytes(16).toString('base64');

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", `'nonce-${nonce}'`, 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'http://localhost:3000',
          'http://localhost:5000',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5000',
          '*',
        ],
      },
    },
  })
);
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000', 'http://127.0.0.1:5000', '*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(languageMiddleware);
app.use(languageDetector);
app.use(setupI18n());
app.use(cookieParser());

// Routes
app.get('/api/docs', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>API Documentation</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { margin: 0; }
        </style>
      </head>
      <body>
        <script 
          nonce="${nonce}"
          id="api-reference"
          data-url="/openapi.json"
          src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/dist/browser/standalone.min.js"
        ></script>
      </body>
    </html>
  `);
});

// Serve OpenAPI JSON
app.get('/openapi.json', (req: Request, res: Response) => {
  res.json(apiSpecification);
});

app.use('/api/auth', authRoutes);
// app.use('/api/bookings', bookingRoutes);

// Health check route
app.get('/api/health', authenticateToken, validatePermissions(['BOOKING_READ_SELF']), (_, res) => {
  res.status(200).json({ status: 'OK' });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  prismaErrorHandler(err, req, res, next);
});

// Fallback for unhandled errors
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  if (!res.headersSent) {
    sendServerError(res, 'common.serverError', null, language);
  }
});

// Not Found Handler
app.use((req: Request, res: Response) => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';
  sendServerError(res, 'common.notFound', null, language);
});

export default app;
