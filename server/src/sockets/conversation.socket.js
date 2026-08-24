import { getSocketServer } from './io.js';

import { requireConversationMember } from '../services/conversation.service.js';

function getUserRoom(userId) {
  return `user:${userId}`;
}

function getUserRooms(userIds) {
  return userIds.map(getUserRoom);
}

function getConversationRoom(conversationId) {
  return `conversation:${conversationId}`;
}

export function emitConversationUpdated(conversation, recipientUserIds = []) {
  const io = getSocketServer();

  if (!io || !conversation) {
    return;
  }

  io.to(getUserRooms(recipientUserIds)).emit('conversation:updated', {
    conversationId: conversation.id,
    conversation,
  });

  io.to(getConversationRoom(conversation.id)).emit('conversation:updated', {
    conversationId: conversation.id,
    conversation,
  });
}

export function emitConversationMemberAdded(conversationId, member, recipientUserIds = []) {
  const io = getSocketServer();

  if (!io || !member) {
    return;
  }

  const payload = {
    conversationId,
    member,
  };

  io.to(getUserRooms(recipientUserIds)).emit('conversation:member:added', payload);
  io.to(getConversationRoom(conversationId)).emit('conversation:member:added', payload);
}

export function emitConversationMemberRemoved(conversationId, userId, recipientUserIds = []) {
  const io = getSocketServer();

  if (!io) {
    return;
  }

  const payload = {
    conversationId,
    userId,
  };

  io.to(getUserRooms(recipientUserIds)).emit('conversation:member:removed', payload);
  io.to(getConversationRoom(conversationId)).emit('conversation:member:removed', payload);
}

export function emitConversationMemberRoleUpdated(conversationId, member, recipientUserIds = []) {
  const io = getSocketServer();

  if (!io || !member) {
    return;
  }

  const payload = {
    conversationId,
    member,
  };

  io.to(getUserRooms(recipientUserIds)).emit('conversation:member:role:updated', payload);
  io.to(getConversationRoom(conversationId)).emit('conversation:member:role:updated', payload);
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
