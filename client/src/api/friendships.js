import { request } from "./client";

export function getFriends() {
  return request("/friends");
}

export function getIncomingRequests() {
  return request("/friends/requests/incoming");
}

export function getOutgoingRequests() {
  return request("/friends/requests/outgoing");
}

export function sendFriendRequest(userId) {
  return request(`/friends/request/${userId}`, { method: "POST" });
}

export function acceptFriendRequest(friendshipId) {
  return request(`/friends/requests/${friendshipId}/accept`, {
    method: "PATCH",
  });
}

export function rejectFriendRequest(friendshipId) {
  return request(`/friends/requests/${friendshipId}/reject`, {
    method: "PATCH",
  });
}

export function removeFriend(userId) {
  return request(`/friends/${userId}`, { method: "DELETE" });
}
