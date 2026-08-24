import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriends,
  getIncomingRequests,
  getOutgoingRequests,
} from '../services/friendship.service.js';

export async function sendFriendRequestController(req, res) {
  const friendship = await sendFriendRequest(req.user.id, req.params.userId);

  res.status(201).json({
    success: true,
    friendship,
  });
}

export async function acceptFriendRequestController(req, res) {
  const friendship = await acceptFriendRequest(req.params.friendshipId, req.user.id);

  res.status(200).json({
    success: true,
    friendship,
  });
}

export async function rejectFriendRequestController(req, res) {
  const friendship = await rejectFriendRequest(req.params.friendshipId, req.user.id);

  res.status(200).json({
    success: true,
    friendship,
  });
}

export async function removeFriendController(req, res) {
  await removeFriend(req.user.id, req.params.userId);

  res.status(204).send();
}

export async function getFriendsController(req, res) {
  const friends = await getFriends(req.user.id);

  res.status(200).json({
    success: true,
    friends,
  });
}

export async function getIncomingRequestsController(req, res) {
  const requests = await getIncomingRequests(req.user.id);

  res.status(200).json({
    success: true,
    requests,
  });
}

export async function getOutgoingRequestsController(req, res) {
  const requests = await getOutgoingRequests(req.user.id);

  res.status(200).json({
    success: true,
    requests,
  });
}
