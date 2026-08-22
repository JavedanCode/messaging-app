import { requireConversationMember } from '../services/conversation.service.js';

function getConversationRoom(conversationId) {
  return `conversation:${conversationId}`;
}

export function registerConversationSocket(socket) {
  socket.on('conversation:join', async (conversationId, callback) => {
    try {
      await requireConversationMember(conversationId, socket.user.id);

      await socket.join(getConversationRoom(conversationId));

      return callback?.({
        success: true,
        conversationId,
      });
    } catch {
      return callback?.({
        success: false,
        message: 'You are not a member of this conversation.',
      });
    }
  });

  socket.on('conversation:leave', async (conversationId, callback) => {
    await socket.leave(getConversationRoom(conversationId));

    return callback?.({
      success: true,
      conversationId,
    });
  });

  socket.on('typing:start', async (conversationId) => {
    try {
      await requireConversationMember(conversationId, socket.user.id);

      socket.to(getConversationRoom(conversationId)).emit('typing:start', {
        conversationId,
        userId: socket.user.id,
      });
    } catch {
      // Ignore invalid typing events. The client does not need an
      // authorization error for a transient UI event.
    }
  });

  socket.on('typing:stop', async (conversationId) => {
    try {
      await requireConversationMember(conversationId, socket.user.id);

      socket.to(getConversationRoom(conversationId)).emit('typing:stop', {
        conversationId,
        userId: socket.user.id,
      });
    } catch {
      // Ignore invalid typing events.
    }
  });
}
