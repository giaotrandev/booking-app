import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

import passport from 'passport';
import { setupI18n, languageDetector } from '#middlewares/i18nMiddleware';
import { languageMiddleware } from '#middlewares/languageMiddleware';
import { prismaErrorHandler } from '#middlewares/prismaErrorHandler';
import { sendServerError } from '#utils/apiResponse';
import { authenticateToken } from '#middlewares/authMiddleware';
import { validatePermissions } from '#middlewares/permissionMiddleware';

import { apiSpecification } from '#docs/openapi';

import authRoutes from '#routes/authRoutes';
import geoRoutes from '#routes/geoRoutes';
import userRoutes from '#routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
import permissionRoutes from './routes/permissionRoutes';

const app: Express = express();
const nonce = crypto.randomBytes(16).toString('base64');

const port = process.env.PORT || 5000;

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
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(languageMiddleware);
app.use(languageDetector);
app.use(setupI18n());
app.use(cookieParser());

// Routes
app.get('/', (req: Request, res: Response) => {
  res.redirect('/api/docs');
});
app.get('/api/docs', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Booking App API Documentation</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico">
        <style>
          body { margin: 0; }
        </style>
      </head>
      <body>
        <script 
          nonce="${nonce}"
          id="api-reference"
          data-url="/openapi.json"
          data-theme="dark"
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
app.use('/api/geo', geoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);

// Health check route
app.get('/api/health', authenticateToken, validatePermissions(['BOOKING_READ_SELF']), (_, res) => {
  res.status(200).json({ status: 'OK' });
});

function getRoutes(app: express.Express) {
  const routes: { method: string; path: string }[] = [];

  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      // Route gốc
      const route = middleware.route;
      const methods = Object.keys(route.methods);
      methods.forEach((method) => {
        routes.push({ method: method.toUpperCase(), path: route.path });
      });
    } else if (middleware.name === 'router' && middleware.handle.stack) {
      // Router con (sử dụng express.Router)
      middleware.handle.stack.forEach((handler: any) => {
        const route = handler.route;
        if (route) {
          const methods = Object.keys(route.methods);
          methods.forEach((method) => {
            routes.push({ method: method.toUpperCase(), path: route.path });
          });
        }
      });
    }
  });

  return routes;
}

// Endpoint hiển thị route
app.get('/routes', (req: Request, res: Response) => {
  const routes = getRoutes(app);
  res.json(routes);
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
