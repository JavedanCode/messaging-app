import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/AppError.js';
import {
  emitNewMessage,
  emitMessageUpdated,
  emitMessageDeleted,
} from '../sockets/message.socket.js';
import {
  deleteAttachment,
  getAttachmentUrl,
  uploadAttachment,
} from './attachment-storage.service.js';

import { requireConversationMember } from './conversation.service.js';

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

async function getConversationMemberIds(conversationId) {
  const members = await prisma.conversationMember.findMany({
    where: {
      conversationId,
    },
    select: {
      userId: true,
    },
  });

  return members.map((member) => member.userId);
}

export async function getMessageAttachmentUrl(conversationId, messageId, userId) {
  await requireConversationMember(conversationId, userId);

  const message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
    select: {
      conversationId: true,
      attachmentUrl: true,
      attachmentName: true,
    },
  });

  if (!message || message.conversationId !== conversationId) {
    throw new AppError('Message not found.', 404);
  }

  if (!message.attachmentUrl) {
    throw new AppError('Message does not have an attachment.', 404);
  }

  const url = await getAttachmentUrl(message.attachmentUrl, message.attachmentName || 'attachment');

  return url;
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

  const memberIds = await getConversationMemberIds(conversationId);

  emitNewMessage(message, memberIds);

  return message;
}

export async function updateMessage(conversationId, messageId, userId, data) {
  await requireConversationMember(conversationId, userId);

  const message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
    select: {
      id: true,
      conversationId: true,
      senderId: true,
      type: true,
    },
  });

  if (!message || message.conversationId !== conversationId) {
    throw new AppError('Message not found.', 404);
  }

  if (message.senderId !== userId) {
    throw new AppError('You can only edit your own messages.', 403);
  }

  if (message.type !== 'TEXT') {
    throw new AppError('Only text messages can be edited.', 400, 'MESSAGE_NOT_EDITABLE');
  }

  const updatedMessage = await prisma.message.update({
    where: {
      id: message.id,
    },
    data: {
      content: data.content,
    },
    include: messageInclude,
  });

  const memberIds = await getConversationMemberIds(conversationId);

  emitMessageUpdated(updatedMessage, memberIds);

  return updatedMessage;
}

export async function createAttachmentMessage(conversationId, senderId, file) {
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

  if (!file) {
    throw new AppError('Attachment file is required.', 400, 'FILE_REQUIRED');
  }

  const attachment = await uploadAttachment(file);

  const type = file.mimetype.startsWith('image/') ? 'IMAGE' : 'FILE';

  try {
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        type,
        attachmentUrl: attachment.key,
        attachmentName: attachment.originalName,
        attachmentMimeType: attachment.contentType,
        attachmentSize: attachment.size,
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

    const memberIds = await getConversationMemberIds(conversationId);

    emitNewMessage(message, memberIds);

    return message;
  } catch (error) {
    await deleteAttachment(attachment.key).catch(() => {});
    throw error;
  }
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

export async function deleteMessage(conversationId, messageId, userId) {
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

  const message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
    select: {
      id: true,
      conversationId: true,
      senderId: true,
      attachmentUrl: true,
    },
  });

  if (!message || message.conversationId !== conversationId) {
    throw new AppError('Message not found.', 404);
  }

  if (message.senderId !== userId) {
    throw new AppError('You can only delete your own messages.', 403);
  }

  if (message.attachmentUrl) {
    await deleteAttachment(message.attachmentUrl);
  }

  const memberIds = await getConversationMemberIds(conversationId);

  await prisma.message.delete({
    where: {
      id: message.id,
    },
  });

  emitMessageDeleted(conversationId, message.id, memberIds);
}
