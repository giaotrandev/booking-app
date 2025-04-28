import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';

// CSP Configuration Function
const getContentSecurityPolicy = () => {
  return {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: [
        "'self'",
        'http://localhost:3000', // Your API server
        'http://localhost:5000', // Your frontend if needed
        'ws://localhost:3000', // Websocket connections
        'ws://localhost:5000', // Websocket connections
      ],
      frameSrc: ["'self'"],
    },
  };
};

// CORS Configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000', 'http://127.0.0.1:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

export const setupSecurityMiddleware = (app: Express) => {
  // Helmet for security headers
  app.use(
    helmet({
      contentSecurityPolicy: getContentSecurityPolicy(),
    })
  );

  // CORS with flexible options
  app.use(cors(corsOptions));

  // Redirect root to docs
  app.get('/', (req: Request, res: Response) => {
    res.redirect('/api/docs');
  });

  // Optional: Logging middleware for debugging CSP
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Report-To',
      JSON.stringify({
        group: 'csp-endpoint',
        max_age: 10886400,
        endpoints: [{ url: '/csp-report-endpoint' }],
      })
    );
    res.setHeader('Content-Security-Policy-Report-Only', "default-src 'self'; report-uri /csp-report-endpoint");
    next();
  });

  // Optional CSP Reporting Endpoint
  app.post('/csp-report-endpoint', express.json(), (req: Request, res: Response) => {
    console.log('CSP Violation:', JSON.stringify(req.body, null, 2));
    res.status(204).end();
  });
};

export default setupSecurityMiddleware;
