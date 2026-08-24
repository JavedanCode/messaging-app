import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/AppError.js';

function createDirectKey(userIdA, userIdB) {
  return [userIdA, userIdB].sort().join(':');
}

export const conversationInclude = {
  members: {
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
  },
  createdBy: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  },
};

export async function findConversationById(conversationId) {
  return prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
    include: conversationInclude,
  });
}

export async function findConversationMember(conversationId, userId) {
  return prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });
}

export async function requireConversationMember(conversationId, userId) {
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

  const member = await findConversationMember(conversationId, userId);

  if (!member) {
    throw new AppError('You are not a member of this conversation.', 403);
  }

  return member;
}

async function ensureUsersExist(userIds) {
  const uniqueUserIds = [...new Set(userIds)];

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: uniqueUserIds,
      },
    },
    select: {
      id: true,
    },
  });

  if (users.length !== uniqueUserIds.length) {
    throw new AppError('One or more users do not exist.', 400);
  }

  return users;
}

export async function createDirectConversation(userId, otherUserId) {
  if (userId === otherUserId) {
    throw new AppError('You cannot create a direct conversation with yourself.', 400);
  }

  await ensureUsersExist([userId, otherUserId]);

  const directKey = createDirectKey(userId, otherUserId);

  const existingConversation = await prisma.conversation.findUnique({
    where: {
      directKey,
    },
    include: conversationInclude,
  });

  if (existingConversation) {
    return existingConversation;
  }

  return prisma.conversation.create({
    data: {
      type: 'DIRECT',
      directKey,
      createdById: userId,
      members: {
        create: [
          {
            userId,
            role: 'MEMBER',
          },
          {
            userId: otherUserId,
            role: 'MEMBER',
          },
        ],
      },
    },
    include: conversationInclude,
  });
}

export async function createGroupConversation(userId, name, userIds) {
  const memberIds = [...new Set([userId, ...userIds])];

  await ensureUsersExist(memberIds);

  return prisma.conversation.create({
    data: {
      type: 'GROUP',
      name,
      createdById: userId,
      members: {
        create: memberIds.map((memberId) => ({
          userId: memberId,
          role: memberId === userId ? 'ADMIN' : 'MEMBER',
        })),
      },
    },
    include: conversationInclude,
  });
}

export async function createConversation(userId, data) {
  if (data.type === 'DIRECT') {
    return createDirectConversation(userId, data.userId);
  }

  return createGroupConversation(userId, data.name, data.userIds);
}

export async function getUserConversations(userId) {
  const conversations = await prisma.conversation.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },

    include: {
      members: {
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
      },

      createdBy: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },

      messages: {
        take: 1,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },

    orderBy: [
      {
        lastMessageAt: 'desc',
      },
      {
        createdAt: 'desc',
      },
    ],
  });

  return conversations.map(({ messages, ...conversation }) => ({
    ...conversation,
    lastMessage: messages[0] ?? null,
  }));
}

export async function getConversationById(conversationId, userId) {
  const conversation = await findConversationById(conversationId);

  if (!conversation) {
    throw new AppError('Conversation not found.', 404);
  }

  await requireConversationMember(conversationId, userId);

  return conversation;
}

export async function deleteConversation(conversationId, userId) {
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

  const member = await requireConversationMember(conversationId, userId);

  if (
    conversation.type === 'GROUP' &&
    conversation.createdById !== userId &&
    member.role !== 'ADMIN'
  ) {
    throw new AppError('Only a conversation administrator can delete this conversation.', 403);
  }

  await prisma.conversation.delete({
    where: {
      id: conversationId,
    },
  });
}
