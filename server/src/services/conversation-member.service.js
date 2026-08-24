import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/AppError.js';
import {
  emitConversationMemberAdded,
  emitConversationMemberRemoved,
  emitConversationMemberRoleUpdated,
  emitConversationUpdated,
} from '../sockets/conversation.socket.js';

import { requireConversationMember, conversationInclude } from './conversation.service.js';

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

export async function getConversationType(conversationId) {
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
    select: {
      type: true,
      createdById: true,
    },
  });

  if (!conversation) {
    throw new AppError('Conversation not found.', 404);
  }

  return conversation;
}

export async function requireAdmin(conversationId, userId) {
  const member = await requireConversationMember(conversationId, userId);

  if (member.role !== 'ADMIN') {
    throw new AppError('Only administrators can perform this action.', 403);
  }

  return member;
}

export async function addGroupMember({ conversationId, requesterId, userId }) {
  const conversation = await getConversationType(conversationId);

  if (conversation.type !== 'GROUP') {
    throw new AppError('Members can only be added to group conversations.', 400);
  }

  await requireAdmin(conversationId, requesterId);

  const userExists = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
    },
  });

  if (!userExists) {
    throw new AppError('User not found.', 404);
  }

  const existingMember = await prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (existingMember) {
    throw new AppError('User is already a member of this conversation.', 409);
  }

  const member = await prisma.conversationMember.create({
    data: {
      conversationId,
      userId,
      role: 'MEMBER',
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  const recipientUserIds = await getConversationMemberIds(conversationId);

  emitConversationMemberAdded(conversationId, member, recipientUserIds);

  return member;
}

export async function removeGroupMember({ conversationId, requesterId, userId }) {
  const conversation = await getConversationType(conversationId);

  if (conversation.type !== 'GROUP') {
    throw new AppError('Members can only be removed from group conversations.', 400);
  }

  await requireAdmin(conversationId, requesterId);

  if (conversation.createdById === userId) {
    throw new AppError('The group creator cannot be removed.', 403);
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
    throw new AppError('User is not a member of this conversation.', 404);
  }

  await prisma.conversationMember.delete({
    where: {
      id: member.id,
    },
  });

  const recipientUserIds = await getConversationMemberIds(conversationId);

  emitConversationMemberRemoved(conversationId, userId, recipientUserIds);
}

export async function leaveGroup({ conversationId, userId }) {
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
    select: {
      type: true,
      createdById: true,
    },
  });

  if (!conversation) {
    throw new AppError('Conversation not found.', 404);
  }

  if (conversation.type !== 'GROUP') {
    throw new AppError('You cannot leave a direct conversation.', 400);
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
    throw new AppError('You are not a member of this conversation.', 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.conversationMember.delete({
      where: {
        id: member.id,
      },
    });

    // User was the creator.
    // We need to transfer ownership.
    if (conversation.createdById === userId) {
      const nextOwner = await tx.conversationMember.findFirst({
        where: {
          conversationId,
        },
        orderBy: [
          {
            role: 'asc',
          },
          {
            joinedAt: 'asc',
          },
        ],
        select: {
          userId: true,
        },
      });

      await tx.conversation.update({
        where: {
          id: conversationId,
        },
        data: {
          createdById: nextOwner?.userId ?? null,
        },
      });

      // If there are still members,
      // make sure ownership holder is admin.
      if (nextOwner) {
        await tx.conversationMember.update({
          where: {
            conversationId_userId: {
              conversationId,
              userId: nextOwner.userId,
            },
          },
          data: {
            role: 'ADMIN',
          },
        });
      }
    }
  });

  const remainingMembers = await prisma.conversationMember.findMany({
    where: {
      conversationId,
    },
    select: {
      userId: true,
    },
  });

  const updatedConversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
    include: conversationInclude,
  });

  emitConversationUpdated(
    updatedConversation,
    remainingMembers.map((entry) => entry.userId),
  );
  emitConversationMemberRemoved(
    conversationId,
    userId,
    remainingMembers.map((entry) => entry.userId),
  );
}

export async function updateMemberRole({ conversationId, requesterId, userId, role }) {
  const conversation = await getConversationType(conversationId);

  if (conversation.type !== 'GROUP') {
    throw new AppError('Only group conversations support roles.', 400);
  }

  await requireAdmin(conversationId, requesterId);

  const member = await prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!member) {
    throw new AppError('User is not a member.', 404);
  }

  const updatedMember = await prisma.conversationMember.update({
    where: {
      id: member.id,
    },
    data: {
      role,
    },
  });

  const recipientUserIds = await getConversationMemberIds(conversationId);

  emitConversationMemberRoleUpdated(conversationId, updatedMember, recipientUserIds);

  return updatedMember;
}

export async function updateGroupName({ conversationId, requesterId, name }) {
  const conversation = await getConversationType(conversationId);

  if (conversation.type !== 'GROUP') {
    throw new AppError('Only groups have names.', 400);
  }

  await requireAdmin(conversationId, requesterId);

  const updatedConversation = await prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      name,
    },
    include: conversationInclude,
  });

  const recipientUserIds = await getConversationMemberIds(conversationId);

  emitConversationUpdated(updatedConversation, recipientUserIds);

  return updatedConversation;
}
