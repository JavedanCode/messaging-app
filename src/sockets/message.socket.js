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
