import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '#config/db';
import { initializeSocketConnection } from '#controllers/bookingControllerSocketInit';

// Socket middleware to authenticate users
const authenticateSocket = async (socket: any, next: (err?: Error) => void) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: Token is required'));
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };

    // Attach user to socket
    socket.userId = decoded.userId;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, status: true },
    });

    if (!user || user.status === 'DISABLED') {
      return next(new Error('Authentication error: User not found or disabled'));
    }

    return next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid token'));
  }
};

/**
 * Initialize Socket.IO server
 * This function accepts either an Express app or an HTTP server
 */
export const initializeSocketIO = (appOrServer: express.Application | HttpServer): Server => {
  // Create or use the HTTP server
  const httpServer = appOrServer instanceof HttpServer ? appOrServer : undefined;

  // Create Socket.IO server
  const io = httpServer
    ? new Server(httpServer, {
        cors: {
          origin: process.env.CORS_ORIGIN?.split(',') || '*',
          methods: ['GET', 'POST'],
          credentials: true,
        },
        path: '/socket.io',
      })
    : new Server((appOrServer as express.Application).listen(0), {
        // This server is not used, just needed for initialization
        cors: {
          origin: process.env.CORS_ORIGIN?.split(',') || '*',
          methods: ['GET', 'POST'],
          credentials: true,
        },
        path: '/socket.io',
      });

  // Apply authentication middleware
  io.use(authenticateSocket);

  // Initialize socket connection handlers
  initializeSocketConnection(io);

  return io;
};
