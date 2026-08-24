import { prisma } from '../db/prisma.js';

import { isUserOnline } from '../sockets/presence.socket.js';

export function addOnlineStatus(users) {
  return users.map((user) => ({
    ...user,
    online: isUserOnline(user.id),
  }));
}

export async function getFriendUserIds(userId) {
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
    select: {
      requesterId: true,
      receiverId: true,
    },
  });

  return friendships.map((friendship) =>
    friendship.requesterId === userId ? friendship.receiverId : friendship.requesterId,
  );
}
