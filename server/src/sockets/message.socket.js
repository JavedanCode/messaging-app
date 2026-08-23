import { getSocketServer } from './io.js';

function getUserRoom(userId) {
  return `user:${userId}`;
}

function getUserRooms(userIds) {
  return userIds.map(getUserRoom);
}

export function emitNewMessage(message, recipientUserIds) {
  const io = getSocketServer();

  if (!io || !recipientUserIds?.length) {
    return;
  }

  io.to(getUserRooms(recipientUserIds)).emit('message:new', message);
}

export function emitMessageUpdated(message, recipientUserIds) {
  const io = getSocketServer();

  if (!io || !recipientUserIds?.length) {
    return;
  }

  io.to(getUserRooms(recipientUserIds)).emit('message:updated', message);
}

export function emitMessageDeleted(conversationId, messageId, recipientUserIds) {
  const io = getSocketServer();

  if (!io || !recipientUserIds?.length) {
    return;
  }

  io.to(getUserRooms(recipientUserIds)).emit('message:deleted', {
    messageId,
    conversationId,
  });
}
