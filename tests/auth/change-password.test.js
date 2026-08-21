import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAuthentication } from '../../src/services/auth.service.js';

import app from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';

describe('PATCH /users/me/password', () => {
  let agent;
  let user;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('CurrentPassword123!', 12);

    user = await prisma.user.create({
      data: {
        username: 'changepassworduser',
        email: 'changepassword@example.com',
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });

    agent = request.agent(app);

    const { accessToken, refreshToken } = await createAuthentication({
      userId: user.id,
      userAgent: 'Vitest',
      ipAddress: '127.0.0.1',
    });

    agent.set('Cookie', [`accessToken=${accessToken}`, `refreshToken=${refreshToken}`]);
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('changes the authenticated user password', async () => {
    const response = await agent.patch('/users/me/password').send({
      currentPassword: 'CurrentPassword123!',
      newPassword: 'NewPassword123!',
    });

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      message: 'Password changed successfully. Please log in again.',
    });

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser).not.toBeNull();
    expect(updatedUser.passwordHash).not.toBeNull();

    const newPasswordMatches = await bcrypt.compare('NewPassword123!', updatedUser.passwordHash);

    expect(newPasswordMatches).toBe(true);
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app).patch('/users/me/password').send({
      currentPassword: 'CurrentPassword123!',
      newPassword: 'NewPassword123!',
    });

    expect(response.status).toBe(401);

    expect(response.body).toMatchObject({
      success: false,
    });
  });

  it('rejects an incorrect current password', async () => {
    const response = await agent.patch('/users/me/password').send({
      currentPassword: 'WrongPassword123!',
      newPassword: 'NewPassword123!',
    });

    expect(response.status).toBe(401);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_CURRENT_PASSWORD',
      },
    });

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    const oldPasswordStillWorks = await bcrypt.compare(
      'CurrentPassword123!',
      updatedUser.passwordHash,
    );

    expect(oldPasswordStillWorks).toBe(true);
  });

  it('rejects using the current password as the new password', async () => {
    const response = await agent.patch('/users/me/password').send({
      currentPassword: 'CurrentPassword123!',
      newPassword: 'CurrentPassword123!',
    });

    expect(response.status).toBe(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'PASSWORD_UNCHANGED',
      },
    });
  });

  it('rejects a new password shorter than 8 characters', async () => {
    const response = await agent.patch('/users/me/password').send({
      currentPassword: 'CurrentPassword123!',
      newPassword: 'Short1!',
    });

    expect(response.status).toBe(400);

    expect(response.body).toMatchObject({
      success: false,
    });
  });

  it('rejects a new password longer than 128 characters', async () => {
    const response = await agent.patch('/users/me/password').send({
      currentPassword: 'CurrentPassword123!',
      newPassword: 'A'.repeat(129),
    });

    expect(response.status).toBe(400);

    expect(response.body).toMatchObject({
      success: false,
    });
  });

  it('revokes all active sessions after changing the password', async () => {
    await createAuthentication({
      userId: user.id,
      userAgent: 'Vitest-Second-Session',
      ipAddress: '127.0.0.1',
    });

    const sessionsBefore = await prisma.session.findMany({
      where: {
        userId: user.id,
        revokedAt: null,
      },
    });

    expect(sessionsBefore.length).toBeGreaterThanOrEqual(2);

    const response = await agent.patch('/users/me/password').send({
      currentPassword: 'CurrentPassword123!',
      newPassword: 'NewPassword123!',
    });

    expect(response.status).toBe(200);

    const sessionsAfter = await prisma.session.findMany({
      where: {
        userId: user.id,
      },
    });

    expect(sessionsAfter.length).toBe(sessionsBefore.length);

    for (const session of sessionsAfter) {
      expect(session.revokedAt).toBeInstanceOf(Date);
    }
  });

  it('prevents an old refresh token from being used after the password changes', async () => {
    const loginResponse = await request(app).post('/auth/login').send({
      email: 'changepassword@example.com',
      password: 'CurrentPassword123!',
    });

    expect(loginResponse.status).toBe(200);

    const cookies = loginResponse.headers['set-cookie'];

    const refreshCookie = cookies.find((cookie) => cookie.startsWith('refreshToken='));

    expect(refreshCookie).toBeDefined();

    const refreshToken = refreshCookie.split(';')[0].replace('refreshToken=', '');

    const response = await agent.patch('/users/me/password').send({
      currentPassword: 'CurrentPassword123!',
      newPassword: 'NewPassword123!',
    });

    expect(response.status).toBe(200);

    const refreshResponse = await request(app)
      .post('/auth/refresh')
      .set('Cookie', [`refreshToken=${refreshToken}`]);

    expect(refreshResponse.status).toBe(401);

    expect(refreshResponse.body).toMatchObject({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
      },
    });
  });

  it('allows the user to log in with the new password', async () => {
    const changeResponse = await agent.patch('/users/me/password').send({
      currentPassword: 'CurrentPassword123!',
      newPassword: 'NewPassword123!',
    });

    expect(changeResponse.status).toBe(200);

    const loginResponse = await request(app).post('/auth/login').send({
      email: 'changepassword@example.com',
      password: 'NewPassword123!',
    });

    expect(loginResponse.status).toBe(200);

    expect(loginResponse.body).toMatchObject({
      success: true,
      message: 'Login successful.',
      user: {
        id: user.id,
        email: user.email,
      },
    });

    expect(loginResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('accessToken='),
        expect.stringContaining('refreshToken='),
      ]),
    );
  });

  it('does not change the password when validation fails', async () => {
    const response = await agent.patch('/users/me/password').send({
      currentPassword: 'CurrentPassword123!',
      newPassword: 'short',
    });

    expect(response.status).toBe(400);

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    const oldPasswordStillWorks = await bcrypt.compare(
      'CurrentPassword123!',
      updatedUser.passwordHash,
    );

    expect(oldPasswordStillWorks).toBe(true);
  });
});
