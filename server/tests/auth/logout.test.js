import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import app from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';

describe('POST /auth/logout', () => {
  let agent;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('StrongPassword123!', 12);

    await prisma.user.create({
      data: {
        username: 'logoutuser',
        email: 'logout@example.com',
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });

    agent = request.agent(app);

    await agent.post('/auth/login').send({
      email: 'logout@example.com',
      password: 'StrongPassword123!',
    });
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('logs the user out and revokes the session', async () => {
    const sessionBefore = await prisma.session.findFirst({
      where: {
        user: {
          email: 'logout@example.com',
        },
      },
    });

    expect(sessionBefore).not.toBeNull();
    expect(sessionBefore.revokedAt).toBeNull();

    const response = await agent.post('/auth/logout');

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});

    const sessionAfter = await prisma.session.findUnique({
      where: {
        id: sessionBefore.id,
      },
    });

    expect(sessionAfter).not.toBeNull();
    expect(sessionAfter.revokedAt).toBeInstanceOf(Date);
  });

  it('clears the authentication cookies', async () => {
    const response = await agent.post('/auth/logout');

    expect(response.status).toBe(204);

    const cookies = response.headers['set-cookie'];

    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining('accessToken=;'),
        expect.stringContaining('refreshToken=;'),
      ]),
    );
  });

  it('prevents the logged-out session from refreshing', async () => {
    const loginResponse = await request(app).post('/auth/login').send({
      email: 'logout@example.com',
      password: 'StrongPassword123!',
    });

    expect(loginResponse.status).toBe(200);

    const cookies = loginResponse.headers['set-cookie'];

    const refreshCookie = cookies.find((cookie) => cookie.startsWith('refreshToken='));

    expect(refreshCookie).toBeDefined();

    const refreshToken = refreshCookie.split(';')[0].replace('refreshToken=', '');

    const logoutResponse = await request(app)
      .post('/auth/logout')
      .set('Cookie', [`refreshToken=${refreshToken}`]);

    expect(logoutResponse.status).toBe(204);

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

  it('is safe when no refresh token is provided', async () => {
    const response = await request(app).post('/auth/logout');

    expect(response.status).toBe(204);
  });
});
