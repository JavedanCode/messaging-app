import { Server } from 'socket.io';

import { env } from '../config/env.js';
import { authenticateSocket } from './middleware.js';
import { registerConversationSocket } from './conversation.socket.js';
import { registerPresenceSocket } from './presence.socket.js';
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

  io.on('connection', (socket) => {
    const userRoom = `user:${socket.user.id}`;

    socket.join(userRoom);

    registerPresenceSocket(socket);

    registerConversationSocket(socket);

    console.log(`Socket connected: ${socket.user.username}`);
  });

  return io;
}
