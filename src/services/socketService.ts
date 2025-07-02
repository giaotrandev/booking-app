// import { Server } from 'socket.io';
// import { Server as HttpServer } from 'http';
// import express from 'express';
// import jwt from 'jsonwebtoken';
// import { prisma } from '#config/db';
// import { initializeSocketConnection } from '#controllers/bookingControllerSocketInit';

// // Socket middleware to authenticate users
// const authenticateSocket = async (socket: any, next: (err?: Error) => void) => {
//   const token = socket.handshake.auth.token;

//   if (!token) {
//     return next(new Error('Authentication error: Token is required'));
//   }

//   try {
//     // Verify JWT token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };

//     // Attach user to socket
//     socket.userId = decoded.userId;

//     // Check if user exists
//     const user = await prisma.user.findUnique({
//       where: { id: decoded.userId },
//       select: { id: true, status: true },
//     });

//     if (!user || user.status === 'DISABLED') {
//       return next(new Error('Authentication error: User not found or disabled'));
//     }

//     return next();
//   } catch (error) {
//     return next(new Error('Authentication error: Invalid token'));
//   }
// };

// /**
//  * Initialize Socket.IO server
//  * This function accepts either an Express app or an HTTP server
//  */
// export const initializeSocketIO = (appOrServer: express.Application | HttpServer): Server => {
//   // Create or use the HTTP server
//   const httpServer = appOrServer instanceof HttpServer ? appOrServer : undefined;

//   // Create Socket.IO server
//   const io = httpServer
//     ? new Server(httpServer, {
//         cors: {
//           origin: process.env.CORS_ORIGIN?.split(',') || '*',
//           methods: ['GET', 'POST'],
//           credentials: true,
//         },
//         path: '/socket.io',
//       })
//     : new Server((appOrServer as express.Application).listen(0), {
//         // This server is not used, just needed for initialization
//         cors: {
//           origin: process.env.CORS_ORIGIN?.split(',') || '*',
//           methods: ['GET', 'POST'],
//           credentials: true,
//         },
//         path: '/socket.io',
//       });

//   // Apply authentication middleware
//   io.use(authenticateSocket);

//   // Initialize socket connection handlers
//   initializeSocketConnection(io);

//   return io;
// };

// socketService.ts
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '#config/db';
import { initializeSocketConnection } from '#controllers/bookingControllerSocketInit';

// Room prefixes to determine authentication requirements
const PUBLIC_ROOM_PREFIXES = [
  'public:trip', // public:trip:123 - anyone can join
  'public:booking', // public:booking:456 - anyone can join
  'public:general', // public:general:lobby - anyone can join
];

const PRIVATE_ROOM_PREFIXES = [
  'private:chat', // private:chat:trip:123 - requires auth
  'private:support', // private:support:user:456 - requires auth
  'private:admin', // private:admin:dashboard - requires auth
  'private:user', // private:user:789 - requires auth
];

// Events that don't require authentication (can work without token)
const PUBLIC_EVENTS = ['joinPublicRoom', 'leavePublicRoom', 'selectSeat', 'releaseSeat', 'getPublicData'];

// Events that require authentication
const PRIVATE_EVENTS = [
  'joinPrivateRoom',
  'leavePrivateRoom',
  'sendMessage',
  'sendPrivateMessage',
  'typing',
  'stopTyping',
  'getUserData',
];

// Helper function to check if room is public
const isPublicRoom = (roomName: string): boolean => {
  return PUBLIC_ROOM_PREFIXES.some((prefix) => roomName.startsWith(prefix));
};

// Helper function to check if room is private
const isPrivateRoom = (roomName: string): boolean => {
  return PRIVATE_ROOM_PREFIXES.some((prefix) => roomName.startsWith(prefix));
};

// Helper function to check if room is a system/default room (should be allowed)
const isSystemRoom = (roomName: string): boolean => {
  // Allow socket ID rooms (default rooms that Socket.IO creates)
  // These usually match the pattern of random characters/numbers
  const socketIdPattern = /^[a-zA-Z0-9_-]{20,}$/;
  return socketIdPattern.test(roomName);
};

// Socket middleware to conditionally authenticate users
const conditionalAuthenticateSocket = async (socket: any, next: (err?: Error) => void) => {
  const token = socket.handshake.auth.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, status: true, email: true, firstName: true, lastName: true, role: true },
      });

      if (user && user.status !== 'DISABLED') {
        socket.userId = decoded.userId;
        socket.user = user;
        socket.isAuthenticated = true;
        console.log(`Authenticated user connected: ${user.email} (${user.role})`);
      } else {
        socket.isAuthenticated = false;
        console.log('Invalid user or disabled account');
      }
    } catch (error) {
      socket.isAuthenticated = false;
      console.log('Invalid token provided');
    }
  } else {
    socket.isAuthenticated = false;
    console.log('No token provided - anonymous connection');
  }

  return next();
};

// Enhanced room join validation
const validateRoomAccess = (socket: any, roomName: string): { allowed: boolean; reason?: string } => {
  // Allow system/default rooms (Socket.IO internal rooms)
  if (isSystemRoom(roomName)) {
    return { allowed: true };
  }

  // Public rooms - anyone can join
  if (isPublicRoom(roomName)) {
    return { allowed: true };
  }

  // Private rooms - authentication required
  if (isPrivateRoom(roomName)) {
    if (!socket.isAuthenticated) {
      return { allowed: false, reason: 'Authentication required for private rooms' };
    }

    // Additional role-based checks for admin rooms
    if (roomName.startsWith('private:admin') && socket.user?.role !== 'ADMIN') {
      return { allowed: false, reason: 'Admin access required' };
    }

    // User-specific rooms validation
    if (roomName.startsWith('private:user')) {
      const userId = roomName.split(':')[2]; // private:user:123
      if (userId !== socket.userId && socket.user?.role !== 'ADMIN') {
        return { allowed: false, reason: 'Access denied to this user room' };
      }
    }

    return { allowed: true };
  }

  // Unknown room pattern - but don't block system rooms
  return { allowed: false, reason: 'Invalid room pattern' };
};

/**
 * Initialize Socket.IO server with prefix-based room authentication
 */
export const initializeSocketIO = (appOrServer: express.Application | HttpServer): Server => {
  // Create or use the HTTP server
  const httpServer = appOrServer instanceof HttpServer ? appOrServer : undefined;

  // Create Socket.IO server
  const io = httpServer
    ? new Server(httpServer, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST'],
          credentials: true,
        },
        path: '/socket.io',
      })
    : new Server((appOrServer as express.Application).listen(0), {
        cors: {
          origin: '*',
          methods: ['GET', 'POST'],
          credentials: true,
        },
        path: '/socket.io',
      });

  // Apply conditional authentication middleware
  io.use(conditionalAuthenticateSocket);

  // Enhanced middleware for room-based access control
  io.use((socket: any, next) => {
    // Override socket join method to add validation
    const originalJoin = socket.join.bind(socket);
    socket.join = function (roomName: string | string[]) {
      if (typeof roomName === 'string') {
        const validation = validateRoomAccess(socket, roomName);
        if (!validation.allowed) {
          console.log(`Room access denied for ${socket.id}: ${roomName} - ${validation.reason}`);
          socket.emit('roomAccessDenied', {
            room: roomName,
            reason: validation.reason,
          });
          return Promise.reject(new Error(validation.reason));
        }
      } else if (Array.isArray(roomName)) {
        // Handle array of room names
        for (const room of roomName) {
          const validation = validateRoomAccess(socket, room);
          if (!validation.allowed) {
            console.log(`Room access denied for ${socket.id}: ${room} - ${validation.reason}`);
            socket.emit('roomAccessDenied', {
              room: room,
              reason: validation.reason,
            });
            return Promise.reject(new Error(validation.reason));
          }
        }
      }
      return originalJoin(roomName);
    };

    return next();
  });

  // Override the event handler to add per-event authentication check
  const originalOn = io.on.bind(io);
  io.on = function (event: string, listener: (...args: any[]) => void) {
    if (event === 'connection') {
      return originalOn(event, (socket: any) => {
        console.log(`New client connected: ${socket.id} (authenticated: ${socket.isAuthenticated})`);

        // Wrap socket event listeners with authentication check
        const originalSocketOn = socket.on.bind(socket);
        socket.on = function (eventName: string, handler: (...args: any[]) => void) {
          const wrappedHandler = (...args: any[]) => {
            // Check if this event requires authentication
            if (PRIVATE_EVENTS.includes(eventName) && !socket.isAuthenticated) {
              console.log(`Authentication required for event: ${eventName} from socket ${socket.id}`);
              socket.emit('authenticationError', {
                event: eventName,
                message: 'Authentication required for this action',
              });
              return;
            }

            // Call the original handler
            return handler(...args);
          };

          return originalSocketOn(eventName, wrappedHandler);
        };

        // Call the original listener
        return listener(socket);
      });
    }
    return originalOn(event, listener);
  };

  // Initialize socket connection handlers
  initializeSocketConnection(io);

  console.log('Socket.IO server initialized with room-based authentication');
  return io;
};

// Helper functions for room name generation
export const createRoomName = {
  // Public rooms (no auth required)
  publicTrip: (tripId: string) => `public:trip:${tripId}`,
  publicBooking: (bookingId: string) => `public:booking:${bookingId}`,
  publicGeneral: (lobbyId: string = 'main') => `public:general:${lobbyId}`,

  // Private rooms (auth required)
  privateChatTrip: (tripId: string) => `private:chat:trip:${tripId}`,
  privateChatSupport: (userId: string) => `private:chat:support:${userId}`,
  privateUser: (userId: string) => `private:user:${userId}`,
  privateAdmin: (section: string = 'dashboard') => `private:admin:${section}`,
};

// Export room validation for use in other modules
export { isPublicRoom, isPrivateRoom, validateRoomAccess, isSystemRoom };
