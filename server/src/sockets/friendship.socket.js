import { getSocketServer } from './io.js';

function getUserRoom(userId) {
  return `user:${userId}`;
}

function getUserRooms(userIds) {
  return userIds.map(getUserRoom);
}

export function emitFriendRequestCreated(friendship) {
  const io = getSocketServer();

  if (!io || !friendship) {
    return;
  }

  io.to(getUserRooms([friendship.receiverId])).emit('friendship:request', {
    id: friendship.id,
    requesterId: friendship.requesterId,
    receiverId: friendship.receiverId,
    status: friendship.status,
    requester: friendship.requester,
    receiver: friendship.receiver,
  });
}

export function emitFriendRequestAccepted(friendship) {
  const io = getSocketServer();

  if (!io || !friendship) {
    return;
  }

  io.to(getUserRooms([friendship.requesterId, friendship.receiverId])).emit('friendship:accepted', {
    id: friendship.id,
    requesterId: friendship.requesterId,
    receiverId: friendship.receiverId,
    status: friendship.status,
    requester: friendship.requester,
    receiver: friendship.receiver,
  });
}

export function emitFriendRequestRejected(friendship) {
  const io = getSocketServer();

  if (!io || !friendship) {
    return;
  }

  io.to(getUserRooms([friendship.requesterId, friendship.receiverId])).emit('friendship:rejected', {
    id: friendship.id,
    requesterId: friendship.requesterId,
    receiverId: friendship.receiverId,
    status: friendship.status,
    requester: friendship.requester,
    receiver: friendship.receiver,
  });
}

export function emitFriendRemoved(userId, friendId) {
  const io = getSocketServer();

  if (!io) {
    return;
  }

  io.to(getUserRooms([userId, friendId])).emit('friendship:removed', {
    userId,
    friendId,
  });
}
