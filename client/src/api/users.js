import { request } from "./client";
const API_URL = import.meta.env.VITE_API_URL;

export function searchUsers(query) {
  return request(`/users/search?q=${encodeURIComponent(query)}`);
}

export async function updateProfile(data) {
  return request("/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function changeUsername(username) {
  return request("/users/me/username", {
    method: "PATCH",
    body: JSON.stringify({ username }),
  });
}

export async function changePassword(data) {
  return request("/users/me/password", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function requestEmailChange(email) {
  return request("/users/me/email", {
    method: "PATCH",
    body: JSON.stringify({ email }),
  });
}

export async function confirmEmailChange(data) {
  return request("/users/me/email/confirm", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteAccount(data = {}) {
  return request("/users/me", {
    method: "DELETE",
    body: JSON.stringify(data),
  });
}

export function linkGoogleAccount() {
  window.location.href = `${API_URL}/auth/google/link`;
}

export function linkGitHubAccount() {
  window.location.href = `${API_URL}/auth/github/link`;
}
