import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/AppError.js';
import { emitNewMessage } from '../sockets/message.socket.js';

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

async function requireConversationMember(conversationId, userId) {
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
}

export async function createMessage(conversationId, senderId, data) {
  await requireConversationMember(conversationId, senderId);

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

  emitNewMessage(message);

  return message;
}

export async function createAttachmentMessage(conversationId, senderId, file) {
  await requireConversationMember(conversationId, senderId);

  if (!file) {
    throw new AppError('An attachment is required.', 400, 'ATTACHMENT_REQUIRED');
  }

  const type = file.mimetype.startsWith('image/') ? 'IMAGE' : 'FILE';

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      type,
      attachmentName: file.originalname,
      attachmentMimeType: file.mimetype,
      attachmentSize: file.size,
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

  emitNewMessage(message);

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
