import { request } from "./client";

export function getMessages(conversationId, params = {}) {
  const searchParams = new URLSearchParams();

  if (params.limit !== undefined) {
    searchParams.set("limit", params.limit);
  }

  const query = searchParams.toString();

  return request(
    `/conversations/${conversationId}/messages${query ? `?${query}` : ""}`,
  );
}

export function createMessage(conversationId, content) {
  return request(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content,
    }),
  });
}

export function updateMessage(conversationId, messageId, content) {
  return request(`/conversations/${conversationId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({
      content,
    }),
  });
}

export function deleteMessage(conversationId, messageId) {
  return request(`/conversations/${conversationId}/messages/${messageId}`, {
    method: "DELETE",
  });
}

export async function uploadAttachment(conversationId, file) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/conversations/${conversationId}/messages/attachment`,
    {
      method: "POST",
      credentials: "include",
      body: formData,
    },
  );

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to upload attachment.");
  }

  return data;
}

export function getMessageAttachmentUrl(conversationId, messageId) {
  return request(
    `/conversations/${conversationId}/messages/${messageId}/attachment`,
  );
}

export async function downloadAttachment(conversationId, messageId) {
  const { url } = await getMessageAttachmentUrl(conversationId, messageId);

  const link = document.createElement("a");

  link.href = url;
  link.download = "";
  link.rel = "noopener";

  document.body.appendChild(link);
  link.click();
  link.remove();
}
