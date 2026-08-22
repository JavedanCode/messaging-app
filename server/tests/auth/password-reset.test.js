import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import { createPasswordResetToken } from '../../src/services/verification-token.service.js';
import { resetRateLimiters } from '../../src/middleware/rate-limit.js';

vi.mock('../../src/services/email.service.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({
    id: 'test-email-id',
  }),
}));

describe('POST /auth/password/reset', () => {
  let user;

  beforeEach(async () => {
    vi.clearAllMocks();

    await resetRateLimiters();

    const passwordHash = await bcrypt.hash('OldPassword123!', 12);

    user = await prisma.user.create({
      data: {
        username: 'resetuser',
        email: 'reset@example.com',
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

  async function createResetToken() {
    return createPasswordResetToken(user.id);
  }

  async function loginWithPassword(password = 'OldPassword123!') {
    return request(app).post('/auth/login').send({
      email: user.email,
      password,
    });
  }

  it('resets the password with a valid token', async () => {
    const token = await createResetToken();

    const response = await request(app).post('/auth/password/reset').send({
      token,
      newPassword: 'NewPassword123!',
    });

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      message: 'Password reset successfully.',
    });

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser.passwordHash).not.toBe(user.passwordHash);

    const passwordMatches = await bcrypt.compare('NewPassword123!', updatedUser.passwordHash);

    expect(passwordMatches).toBe(true);
    expect(updatedUser.passwordChangedAt).not.toBeNull();
  });

  it('allows the user to log in with the new password', async () => {
    const token = await createResetToken();

    const resetResponse = await request(app).post('/auth/password/reset').send({
      token,
      newPassword: 'NewPassword123!',
    });

    expect(resetResponse.status).toBe(200);

    const loginResponse = await loginWithPassword('NewPassword123!');

    expect(loginResponse.status).toBe(200);

    expect(loginResponse.body).toMatchObject({
      success: true,
      message: 'Login successful.',
      user: {
        username: 'resetuser',
        email: 'reset@example.com',
      },
    });
  });

  it('rejects the old password after the reset', async () => {
    const token = await createResetToken();

    const resetResponse = await request(app).post('/auth/password/reset').send({
      token,
      newPassword: 'NewPassword123!',
    });

    expect(resetResponse.status).toBe(200);

    const loginResponse = await loginWithPassword('OldPassword123!');

    expect(loginResponse.status).toBe(401);

    expect(loginResponse.body).toMatchObject({
      success: false,
    });
  });

  it('revokes all active sessions after resetting the password', async () => {
    const loginResponse = await loginWithPassword();

    expect(loginResponse.status).toBe(200);

    const sessionsBefore = await prisma.session.findMany({
      where: {
        userId: user.id,
      },
    });

    expect(sessionsBefore.length).toBeGreaterThan(0);

    expect(sessionsBefore.every((session) => session.revokedAt === null)).toBe(true);

    const token = await createResetToken();

    const resetResponse = await request(app).post('/auth/password/reset').send({
      token,
      newPassword: 'NewPassword123!',
    });

    expect(resetResponse.status).toBe(200);

    const sessionsAfter = await prisma.session.findMany({
      where: {
        userId: user.id,
      },
    });

    expect(sessionsAfter.length).toBe(sessionsBefore.length);

    expect(sessionsAfter.every((session) => session.revokedAt !== null)).toBe(true);
  });

  it('prevents an old refresh token from being used after the reset', async () => {
    const agent = request.agent(app);

    const loginResponse = await agent.post('/auth/login').send({
      email: user.email,
      password: 'OldPassword123!',
    });

    expect(loginResponse.status).toBe(200);

    const cookies = loginResponse.headers['set-cookie'];

    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining('accessToken='),
        expect.stringContaining('refreshToken='),
      ]),
    );

    const token = await createResetToken();

    const resetResponse = await request(app).post('/auth/password/reset').send({
      token,
      newPassword: 'NewPassword123!',
    });

    expect(resetResponse.status).toBe(200);

    const refreshResponse = await agent.post('/auth/refresh');

    expect(refreshResponse.status).toBe(401);

    expect(refreshResponse.body).toMatchObject({
      success: false,
    });
  });

  it('rejects an invalid reset token', async () => {
    const response = await request(app).post('/auth/password/reset').send({
      token: 'this-is-not-a-valid-reset-token',
      newPassword: 'NewPassword123!',
    });

    expect(response.status).toBe(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_PASSWORD_RESET_TOKEN',
      },
    });

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    const passwordStillWorks = await bcrypt.compare('OldPassword123!', updatedUser.passwordHash);

    expect(passwordStillWorks).toBe(true);
  });

  it('rejects an expired reset token', async () => {
    const token = await createResetToken();

    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'PASSWORD_RESET',
      },
    });

    expect(verificationToken).not.toBeNull();

    await prisma.verificationToken.update({
      where: {
        id: verificationToken.id,
      },
      data: {
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const response = await request(app).post('/auth/password/reset').send({
      token,
      newPassword: 'NewPassword123!',
    });

    expect(response.status).toBe(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_PASSWORD_RESET_TOKEN',
      },
    });

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    const passwordStillWorks = await bcrypt.compare('OldPassword123!', updatedUser.passwordHash);

    expect(passwordStillWorks).toBe(true);
  });

  it('does not allow a reset token to be used twice', async () => {
    const token = await createResetToken();

    const firstResponse = await request(app).post('/auth/password/reset').send({
      token,
      newPassword: 'NewPassword123!',
    });

    expect(firstResponse.status).toBe(200);

    const secondResponse = await request(app).post('/auth/password/reset').send({
      token,
      newPassword: 'AnotherPassword123!',
    });

    expect(secondResponse.status).toBe(400);

    expect(secondResponse.body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_PASSWORD_RESET_TOKEN',
      },
    });

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    const newPasswordStillWorks = await bcrypt.compare('NewPassword123!', updatedUser.passwordHash);

    const secondPasswordWorks = await bcrypt.compare(
      'AnotherPassword123!',
      updatedUser.passwordHash,
    );

    expect(newPasswordStillWorks).toBe(true);
    expect(secondPasswordWorks).toBe(false);
  });

  it('rejects a new password shorter than 8 characters', async () => {
    const token = await createResetToken();

    const response = await request(app).post('/auth/password/reset').send({
      token,
      newPassword: 'short',
    });

    expect(response.status).toBe(400);

    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'PASSWORD_RESET',
      },
    });

    expect(verificationToken).not.toBeNull();
    expect(verificationToken.usedAt).toBeNull();

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    const oldPasswordStillWorks = await bcrypt.compare('OldPassword123!', updatedUser.passwordHash);

    expect(oldPasswordStillWorks).toBe(true);
  });

  it('rejects a new password longer than 128 characters', async () => {
    const token = await createResetToken();

    const response = await request(app)
      .post('/auth/password/reset')
      .send({
        token,
        newPassword: 'a'.repeat(129),
      });

    expect(response.status).toBe(400);

    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'PASSWORD_RESET',
      },
    });

    expect(verificationToken).not.toBeNull();
    expect(verificationToken.usedAt).toBeNull();

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    const oldPasswordStillWorks = await bcrypt.compare('OldPassword123!', updatedUser.passwordHash);

    expect(oldPasswordStillWorks).toBe(true);
  });

  it('does not change the password when validation fails', async () => {
    const token = await createResetToken();

    const passwordHashBefore = user.passwordHash;

    const response = await request(app).post('/auth/password/reset').send({
      token,
      newPassword: 'bad',
    });

    expect(response.status).toBe(400);

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser.passwordHash).toBe(passwordHashBefore);
    expect(updatedUser.passwordChangedAt).toBeNull();

    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'PASSWORD_RESET',
      },
    });

    expect(verificationToken).not.toBeNull();
    expect(verificationToken.usedAt).toBeNull();
  });
});
