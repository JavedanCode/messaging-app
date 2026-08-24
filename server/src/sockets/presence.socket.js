import { getSocketServer } from './io.js';

import { getFriendUserIds } from '../services/presence.service.js';

const onlineUsers = new Map();
export function registerPresenceSocket(socket) {
  const userId = socket.user.id;

  const currentConnections = onlineUsers.get(userId) ?? 0;

  onlineUsers.set(userId, currentConnections + 1);

  if (currentConnections === 0) {
    emitUserOnline(userId);
  }

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${userId}`);

    handleDisconnect(userId);
  });
}

function handleDisconnect(userId) {
  console.log(`Handling disconnect: ${userId}`);

  const connections = onlineUsers.get(userId);

  if (!connections) {
    console.log('No connection found');
    return;
  }

  if (connections > 1) {
    onlineUsers.set(userId, connections - 1);

    console.log(`Remaining connections: ${connections - 1}`);

    return;
  }

  onlineUsers.delete(userId);

  console.log('User went offline');

  emitUserOffline(userId).catch(() => {});
}

export function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

async function emitUserOnline(userId) {
  const io = getSocketServer();

  if (!io) {
    return;
  }

  const friendIds = await getFriendUserIds(userId);

  if (!friendIds.length) {
    return;
  }

  io.to(friendIds.map((id) => `user:${id}`)).emit('presence:online', {
    userId,
  });
}

async function emitUserOffline(userId) {
  const io = getSocketServer();

  if (!io) {
    return;
  }

  const friendIds = await getFriendUserIds(userId);

  if (!friendIds.length) {
    return;
  }

  io.to(friendIds.map((id) => `user:${id}`)).emit('presence:offline', {
    userId,
  });
}

export function resetOnlineUsers() {
  onlineUsers.clear();
}
