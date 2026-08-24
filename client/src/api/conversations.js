import { request } from "./client";

export function getConversations() {
  return request("/conversations");
}

export function getConversation(conversationId) {
  return request(`/conversations/${conversationId}`);
}

export function createDirectConversation(userId) {
  return request("/conversations", {
    method: "POST",
    body: JSON.stringify({
      type: "DIRECT",
      userId,
    }),
  });
}

export function createGroupConversation(name, userIds) {
  return request("/conversations", {
    method: "POST",
    body: JSON.stringify({
      type: "GROUP",
      name,
      userIds,
    }),
  });
}

export function deleteConversation(conversationId) {
  return request(`/conversations/${conversationId}`, {
    method: "DELETE",
  });
}
