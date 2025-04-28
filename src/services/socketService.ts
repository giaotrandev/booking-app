import { Server as SocketServer } from 'socket.io';
import { Server } from 'http';
import { Request, Response } from 'express';
import { Booking } from '@prisma/client';
import { prisma } from '#src/config/db';

let io: SocketServer;

// Initialize socket.io
export const initSocket = (server: Server): void => {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*', // More secure
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join a room based on user id
    socket.on('joinRoom', (userId: string) => {
      socket.join(userId);
      console.log(`User ${socket.id} joined room: ${userId}`);
    });

    // Leave a room
    socket.on('leaveRoom', (userId: string) => {
      socket.leave(userId);
      console.log(`User ${socket.id} left room: ${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

// Emit booking update to all clients in the user's room
export const emitBookingUpdate = (booking: Booking): void => {
  if (io) {
    io.to(booking.userId.toString()).emit('bookingUpdate', booking);
    // Also emit to admin room for monitoring
    io.to('admin').emit('bookingUpdate', booking);
  }
};

// Test emit API route
export const testSocketEmit = async (req: Request, res: Response) => {
  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        success: false,
        message: 'User ID and message are required',
      });
    }

    // Validate user exists (optional but recommended)
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Emit message to specific user's room
    if (io) {
      io.to(userId).emit('testMessage', {
        message,
        timestamp: new Date(),
      });

      return res.status(200).json({
        success: true,
        message: 'Message emitted successfully',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Socket.IO not initialized',
    });
  } catch (error) {
    console.error('Socket emit error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get socket.io instance
export const getIO = (): SocketServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};
