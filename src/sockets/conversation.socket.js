import { requireConversationMember } from '../services/conversation.service.js';

function getConversationRoom(conversationId) {
  return `conversation:${conversationId}`;
}

export function registerConversationSocket(io, socket) {
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
}
