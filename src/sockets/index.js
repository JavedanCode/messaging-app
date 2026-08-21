import { Server } from 'socket.io';

import { env } from '../config/env.js';
import { authenticateSocket } from './middleware.js';
import { registerConversationSocket } from './conversation.socket.js';

export function createSocketServer(server) {
  const io = new Server(server, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    registerConversationSocket(io, socket);
  });

  return io;
}
