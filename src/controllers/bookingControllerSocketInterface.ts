import { Server } from 'socket.io';

// Store the Socket.IO instance globally
let io: Server | null = null;

/**
 * Set the Socket.IO instance
 */
export const setSocketIOInstance = (socketIO: Server): void => {
  io = socketIO;
};

/**
 * Get the Socket.IO instance
 */
export const getSocketIOInstance = (): Server | null => {
  return io;
};

/**
 * Emit an event to all clients in a room
 */
export const emitToRoom = (room: string, event: string, data: any): void => {
  if (io) {
    io.to(room).emit(event, data);
  }
};

/**
 * Emit an event to all clients
 */
export const emitToAll = (event: string, data: any): void => {
  if (io) {
    io.emit(event, data);
  }
};

/**
 * Get all clients in a room
 */
export const getClientsInRoom = async (room: string): Promise<string[]> => {
  if (!io) return [];

  const sockets = await io.in(room).fetchSockets();
  return sockets.map((socket) => socket.id);
};
