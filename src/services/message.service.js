import { prisma } from '../db/prisma.js';

import { AppError } from '../errors/AppError.js';

const messageInclude = {
  sender: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  },
};

export async function createMessage(conversationId, senderId, data) {
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
    select: {
      id: true,
    },
  });

  if (!conversation) {
    throw new AppError('Conversation not found.', 404);
  }

  const member = await prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId: senderId,
      },
    },
  });

  if (!member) {
    throw new AppError('You are not a member of this conversation.', 403);
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      type: 'TEXT',
      content: data.content,
    },
    include: messageInclude,
  });

  await prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      lastMessageAt: message.createdAt,
    },
  });

  return message;
}

export async function getConversationMessages(conversationId, userId, limit = 50) {
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
    select: {
      id: true,
    },
  });

  if (!conversation) {
    throw new AppError('Conversation not found.', 404);
  }

  const member = await prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!member) {
    throw new AppError('You are not a member of this conversation.', 403);
  }

  return prisma.message.findMany({
    where: {
      conversationId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    include: messageInclude,
  });
}
