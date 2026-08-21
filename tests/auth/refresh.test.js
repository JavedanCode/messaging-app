import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/db/prisma.js';
import app from '../../src/app.js';
import { verifyRefreshToken } from '../../src/services/token.service.js';

describe('POST /auth/refresh', () => {
  let agent;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('StrongPassword123!', 12);

    await prisma.user.create({
      data: {
        username: 'refreshuser',
        email: 'refresh@example.com',
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });

    agent = request.agent(app);

    await agent.post('/auth/login').send({
      email: 'refresh@example.com',
      password: 'StrongPassword123!',
    });
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('refreshes the authentication tokens', async () => {
    const response = await agent.post('/auth/refresh');

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Token refreshed successfully.',
    });

    expect(response.body).not.toHaveProperty('accessToken');
    expect(response.body).not.toHaveProperty('refreshToken');

    const cookies = response.headers['set-cookie'];

    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining('accessToken='),
        expect.stringContaining('refreshToken='),
      ]),
    );
  });

  it('rejects a request without a refresh token', async () => {
    const response = await request(app).post('/auth/refresh');

    expect(response.status).toBe(401);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
      },
    });
  });

  it('rotates the refresh token', async () => {
    const sessionBefore = await prisma.session.findFirst({
      where: {
        userId: (
          await prisma.user.findUnique({
            where: {
              email: 'refresh@example.com',
            },
          })
        ).id,
      },
    });

    expect(sessionBefore).not.toBeNull();

    const originalHash = sessionBefore.refreshTokenHash;

    const response = await agent.post('/auth/refresh');

    expect(response.status).toBe(200);

    const sessionAfter = await prisma.session.findUnique({
      where: {
        id: sessionBefore.id,
      },
    });

    expect(sessionAfter).not.toBeNull();

    expect(sessionAfter.refreshTokenHash).not.toBe(originalHash);

    expect(sessionAfter.lastUsedAt).toBeInstanceOf(Date);

    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('accessToken='),
        expect.stringContaining('refreshToken='),
      ]),
    );
  });

  it('rejects a reused refresh token and revokes the session', async () => {
    const loginResponse = await request(app).post('/auth/login').send({
      email: 'refresh@example.com',
      password: 'StrongPassword123!',
    });

    expect(loginResponse.status).toBe(200);

    const loginCookies = loginResponse.headers['set-cookie'];

    const refreshCookie = loginCookies.find((cookie) => cookie.startsWith('refreshToken='));

    expect(refreshCookie).toBeDefined();

    const originalRefreshToken = refreshCookie.split(';')[0].replace('refreshToken=', '');

    const refreshPayload = verifyRefreshToken(originalRefreshToken);

    const refreshResponse = await request(app)
      .post('/auth/refresh')
      .set('Cookie', [`refreshToken=${originalRefreshToken}`]);

    expect(refreshResponse.status).toBe(200);

    const reusedTokenResponse = await request(app)
      .post('/auth/refresh')
      .set('Cookie', [`refreshToken=${originalRefreshToken}`]);

    expect(reusedTokenResponse.status).toBe(401);

    expect(reusedTokenResponse.body).toMatchObject({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
      },
    });

    const session = await prisma.session.findUnique({
      where: {
        id: refreshPayload.sid,
      },
    });

    expect(session).not.toBeNull();
    expect(session.revokedAt).toBeInstanceOf(Date);
  });
});
