import { Server } from 'socket.io';

import { env } from '../config/env.js';
import { authenticateSocket } from './middleware.js';
import { registerConversationSocket } from './conversation.socket.js';
import { setSocketServer } from './io.js';

export function createSocketServer(server) {
  const io = new Server(server, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  setSocketServer(io);

  io.use(authenticateSocket);

  io.on('connection', async (socket) => {
    const userRoom = `user:${socket.user.id}`;

    await socket.join(userRoom);

    console.log(`Socket connected: ${socket.user.username}`);

    registerConversationSocket(socket);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user.username}`);
    });
  });

  return io;
}
