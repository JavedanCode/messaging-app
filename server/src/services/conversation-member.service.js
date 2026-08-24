import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/AppError.js';

import { requireConversationMember, conversationInclude } from './conversation.service.js';

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

  return prisma.conversationMember.create({
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

  return prisma.conversationMember.update({
    where: {
      id: member.id,
    },
    data: {
      role,
    },
  });
}

export async function updateGroupName({ conversationId, requesterId, name }) {
  const conversation = await getConversationType(conversationId);

  if (conversation.type !== 'GROUP') {
    throw new AppError('Only groups have names.', 400);
  }

  await requireAdmin(conversationId, requesterId);

  return prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      name,
    },
    include: conversationInclude,
  });
}
