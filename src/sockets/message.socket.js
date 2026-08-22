import { getSocketServer } from './io.js';

function getConversationRoom(conversationId) {
  return `conversation:${conversationId}`;
}

export function emitNewMessage(message) {
  const io = getSocketServer();

  if (!io) {
    return;
  }

  io.to(getConversationRoom(message.conversationId)).emit('message:new', message);
}

export function emitMessageUpdated(message) {
  const io = getSocketServer();

  if (!io) {
    return;
  }

  io.to(getConversationRoom(message.conversationId)).emit('message:updated', message);
}

export function emitMessageDeleted(conversationId, messageId) {
  const io = getSocketServer();

  if (!io) {
    return;
  }

  io.to(getConversationRoom(conversationId)).emit('message:deleted', {
    messageId,
    conversationId,
  });
}
