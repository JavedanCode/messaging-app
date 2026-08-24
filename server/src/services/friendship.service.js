import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/AppError.js';
import {
  emitFriendRequestAccepted,
  emitFriendRequestCreated,
  emitFriendRequestRejected,
  emitFriendRemoved,
} from '../sockets/friendship.socket.js';

function createFriendshipKey(userIdA, userIdB) {
  return [userIdA, userIdB].sort().join(':');
}

const userSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
};

async function ensureUserExists(userId) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  }
}

async function findFriendshipBetweenUsers(userId, otherUserId) {
  const friendshipKey = createFriendshipKey(userId, otherUserId);

  return prisma.friendship.findUnique({
    where: {
      friendshipKey,
    },
  });
}

export async function sendFriendRequest(requesterId, receiverId) {
  if (requesterId === receiverId) {
    throw new AppError(
      'You cannot send a friend request to yourself.',
      400,
      'INVALID_FRIEND_REQUEST',
    );
  }

  await ensureUserExists(receiverId);

  const existingFriendship = await findFriendshipBetweenUsers(requesterId, receiverId);

  if (existingFriendship) {
    throw new AppError('A friendship relationship already exists.', 409, 'FRIENDSHIP_EXISTS');
  }

  const friendship = await prisma.friendship.create({
    data: {
      requesterId,
      receiverId,
      friendshipKey: createFriendshipKey(requesterId, receiverId),
      status: 'PENDING',
    },
    include: {
      requester: {
        select: userSelect,
      },
      receiver: {
        select: userSelect,
      },
    },
  });

  emitFriendRequestCreated(friendship);

  return friendship;
}

export async function acceptFriendRequest(friendshipId, userId) {
  const friendship = await prisma.friendship.findUnique({
    where: {
      id: friendshipId,
    },
  });

  if (!friendship) {
    throw new AppError('Friend request not found.', 404);
  }

  if (friendship.receiverId !== userId) {
    throw new AppError('Only the receiver can accept this request.', 403);
  }

  if (friendship.status !== 'PENDING') {
    throw new AppError('Only pending requests can be accepted.', 400);
  }

  const updatedFriendship = await prisma.friendship.update({
    where: {
      id: friendshipId,
    },
    data: {
      status: 'ACCEPTED',
    },
    include: {
      requester: {
        select: userSelect,
      },
      receiver: {
        select: userSelect,
      },
    },
  });

  emitFriendRequestAccepted(updatedFriendship);

  return updatedFriendship;
}

export async function rejectFriendRequest(friendshipId, userId) {
  const friendship = await prisma.friendship.findUnique({
    where: {
      id: friendshipId,
    },
  });

  if (!friendship) {
    throw new AppError('Friend request not found.', 404);
  }

  if (friendship.receiverId !== userId) {
    throw new AppError('Only the receiver can reject this request.', 403);
  }

  if (friendship.status !== 'PENDING') {
    throw new AppError('Only pending requests can be rejected.', 400);
  }

  const updatedFriendship = await prisma.friendship.update({
    where: {
      id: friendshipId,
    },
    data: {
      status: 'REJECTED',
    },
    include: {
      requester: {
        select: userSelect,
      },
      receiver: {
        select: userSelect,
      },
    },
  });

  emitFriendRequestRejected(updatedFriendship);

  return updatedFriendship;
}

export async function removeFriend(userId, otherUserId) {
  const friendship = await findFriendshipBetweenUsers(userId, otherUserId);

  if (!friendship || friendship.status !== 'ACCEPTED') {
    throw new AppError('Friendship not found.', 404);
  }

  await prisma.friendship.delete({
    where: {
      id: friendship.id,
    },
  });

  emitFriendRemoved(userId, otherUserId);
}

export async function getFriends(userId) {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [
        {
          requesterId: userId,
        },
        {
          receiverId: userId,
        },
      ],
    },
    include: {
      requester: {
        select: userSelect,
      },
      receiver: {
        select: userSelect,
      },
    },
  });

  return friendships.map((friendship) =>
    friendship.requester.id === userId ? friendship.receiver : friendship.requester,
  );
}

export async function getIncomingRequests(userId) {
  return prisma.friendship.findMany({
    where: {
      receiverId: userId,
      status: 'PENDING',
    },
    include: {
      requester: {
        select: userSelect,
      },
    },
  });
}

export async function getOutgoingRequests(userId) {
  return prisma.friendship.findMany({
    where: {
      requesterId: userId,
      status: 'PENDING',
    },
    include: {
      receiver: {
        select: userSelect,
      },
    },
  });
}
