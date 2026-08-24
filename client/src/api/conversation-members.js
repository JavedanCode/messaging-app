import { request } from "./client";

export function addGroupMember(conversationId, userId) {
  return request(`/conversations/${conversationId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export function removeGroupMember(conversationId, userId) {
  return request(`/conversations/${conversationId}/members/${userId}`, {
    method: "DELETE",
  });
}

export function leaveGroup(conversationId) {
  return request(`/conversations/${conversationId}/leave`, { method: "POST" });
}

export function updateMemberRole(conversationId, userId, role) {
  return request(`/conversations/${conversationId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function updateGroupName(conversationId, name) {
  return request(`/conversations/${conversationId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}
