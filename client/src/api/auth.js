import { request } from "./client";

export function register(data) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function login(data) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function logout() {
  return request("/auth/logout", {
    method: "POST",
  });
}

export function getCurrentUser() {
  return request("/auth/me");
}

export function refreshSession() {
  return request("/auth/refresh", {
    method: "POST",
  });
}

export function verifyEmail(data) {
  return request("/auth/email/verify", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function resendEmailVerification(email) {
  return request("/auth/email/resend", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function forgotPassword(email) {
  return request("/auth/password/forgot", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(data) {
  return request("/auth/password/reset", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
