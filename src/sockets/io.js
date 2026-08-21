let io;

export function setSocketServer(socketServer) {
  io = socketServer;
}

export function getSocketServer() {
  if (!io) {
    throw new Error('Socket.IO server has not been initialized.');
  }

  return io;
}
