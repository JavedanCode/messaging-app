import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import bcrypt from 'bcryptjs';
import { resetRateLimiters } from '../../src/middleware/rate-limit.js';

vi.mock('../../src/services/email.service.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({
    id: 'test-email-id',
  }),
}));

describe('DELETE /users/me', () => {
  const password = 'Password123!';
  let user;

  beforeEach(async () => {
    vi.clearAllMocks();

    await resetRateLimiters();

    const passwordHash = await bcrypt.hash(password, 12);

    user = await prisma.user.create({
      data: {
        username: 'deleteuser',
        email: 'delete@example.com',
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
  });

  afterEach(async () => {
    await prisma.verificationToken.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  async function loginUser() {
    const agent = request.agent(app);

    const response = await agent.post('/auth/login').send({
      email: user.email,
      password,
    });

    expect(response.status).toBe(200);

    return agent;
  }

  it('deletes the authenticated user with the correct password', async () => {
    const agent = await loginUser();

    const response = await agent.delete('/users/me').send({
      currentPassword: password,
    });

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});

    const deletedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(deletedUser).toBeNull();
  });

  it('removes the user sessions through cascade deletion', async () => {
    const agent = await loginUser();

    const sessionsBefore = await prisma.session.findMany({
      where: {
        userId: user.id,
      },
    });

    expect(sessionsBefore.length).toBeGreaterThan(0);

    const response = await agent.delete('/users/me').send({
      currentPassword: password,
    });

    expect(response.status).toBe(204);

    const sessionsAfter = await prisma.session.findMany({
      where: {
        userId: user.id,
      },
    });

    expect(sessionsAfter).toHaveLength(0);
  });

  it('removes the user verification tokens through cascade deletion', async () => {
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        type: 'PASSWORD_RESET',
        tokenHash: `test-token-${user.id}`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const agent = await loginUser();

    const tokensBefore = await prisma.verificationToken.findMany({
      where: {
        userId: user.id,
      },
    });

    expect(tokensBefore).toHaveLength(1);

    const response = await agent.delete('/users/me').send({
      currentPassword: password,
    });

    expect(response.status).toBe(204);

    const tokensAfter = await prisma.verificationToken.findMany({
      where: {
        userId: user.id,
      },
    });

    expect(tokensAfter).toHaveLength(0);
  });

  it('clears the authentication cookies', async () => {
    const agent = await loginUser();

    const response = await agent.delete('/users/me').send({
      currentPassword: password,
    });

    expect(response.status).toBe(204);

    const cookies = response.headers['set-cookie'];

    expect(cookies).toBeDefined();
    expect(cookies.some((cookie) => cookie.startsWith('accessToken=;'))).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith('refreshToken=;'))).toBe(true);
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app).delete('/users/me').send({
      currentPassword: password,
    });

    expect(response.status).toBe(401);

    const existingUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(existingUser).not.toBeNull();
  });

  it('requires the current password for a local account', async () => {
    const agent = await loginUser();

    const response = await agent.delete('/users/me').send({});

    expect(response.status).toBe(400);

    const existingUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(existingUser).not.toBeNull();
  });

  it('rejects an incorrect current password', async () => {
    const agent = await loginUser();

    const response = await agent.delete('/users/me').send({
      currentPassword: 'WrongPassword123!',
    });

    expect(response.status).toBe(401);

    const existingUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(existingUser).not.toBeNull();
  });

  it('does not delete the account when password verification fails', async () => {
    const agent = await loginUser();

    await agent.delete('/users/me').send({
      currentPassword: 'WrongPassword123!',
    });

    const existingUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(existingUser).not.toBeNull();

    const sessions = await prisma.session.findMany({
      where: {
        userId: user.id,
      },
    });

    expect(sessions.length).toBeGreaterThan(0);
  });

  it('allows an OAuth-only account to be deleted without a password', async () => {
    await prisma.user.delete({
      where: {
        id: user.id,
      },
    });

    user = await prisma.user.create({
      data: {
        username: 'oauthdeleteuser',
        email: 'oauthdelete@example.com',
        passwordHash: null,
      },
    });

    const agent = request.agent(app);

    const loginResponse = await agent.delete('/users/me').send({});

    expect(loginResponse.status).toBe(401);

    const existingUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(existingUser).not.toBeNull();
  });

  it('does not modify another user', async () => {
    const otherUser = await prisma.user.create({
      data: {
        username: 'otherdeleteuser',
        email: 'otherdelete@example.com',
        passwordHash: await bcrypt.hash('OtherPassword123!', 12),
      },
    });

    const agent = await loginUser();

    const response = await agent.delete('/users/me').send({
      currentPassword: password,
    });

    expect(response.status).toBe(204);

    const otherUserAfter = await prisma.user.findUnique({
      where: {
        id: otherUser.id,
      },
    });

    expect(otherUserAfter).not.toBeNull();
  });
});
