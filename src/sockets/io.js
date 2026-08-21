let io = null;

export function setSocketServer(socketServer) {
  io = socketServer;
}

export function getSocketServer() {
  return io;
}
