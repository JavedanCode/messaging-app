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

  io.on('connection', (socket) => {
    registerConversationSocket(socket);
  });

  return io;
}
