import { Server as SocketServer } from 'socket.io';
import { Server } from 'http';
import { IBooking } from '../models/bookingModel';

let io: SocketServer;

// Initialize socket.io
export const initSocket = (server: Server): void => {
  io = new SocketServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
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
export const emitBookingUpdate = (booking: IBooking): void => {
  if (io) {
    io.to(booking.userId.toString()).emit('bookingUpdate', booking);
    // Also emit to admin room for monitoring
    io.to('admin').emit('bookingUpdate', booking);
  }
};

// Get socket.io instance
export const getIO = (): SocketServer => {
  return io;
};