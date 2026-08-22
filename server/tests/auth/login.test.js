import bcrypt from 'bcryptjs';
import request from 'supertest';

import { prisma } from '../../src/db/prisma.js';
import app from '../../src/app.js';

describe('POST /auth/login', () => {
  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('StrongPassword123!', 12);

    await prisma.user.create({
      data: {
        username: 'loginuser',
        email: 'login@example.com',
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('authenticates a verified user with valid credentials', async () => {
    const response = await request(app).post('/auth/login').send({
      email: 'login@example.com',
      password: 'StrongPassword123!',
    });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Login successful.',
      user: {
        id: expect.any(String),
        username: 'loginuser',
        email: 'login@example.com',
        displayName: null,
        avatarUrl: null,
      },
    });

    expect(response.body.user).not.toHaveProperty('passwordHash');

    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('accessToken='),
        expect.stringContaining('refreshToken='),
      ]),
    );

    const cookies = response.headers['set-cookie'];

    const accessCookie = cookies.find((cookie) => cookie.startsWith('accessToken='));

    const refreshCookie = cookies.find((cookie) => cookie.startsWith('refreshToken='));

    expect(accessCookie).toContain('HttpOnly');
    expect(accessCookie).toContain('SameSite=Lax');
    expect(accessCookie).toContain('Path=/');

    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('SameSite=Lax');
    expect(refreshCookie).toContain('Path=/auth');

    expect(response.body).not.toHaveProperty('accessToken');
    expect(response.body).not.toHaveProperty('refreshToken');

    const session = await prisma.session.findFirst({
      where: {
        userId: response.body.user.id,
      },
    });

    expect(session).not.toBeNull();
    expect(session.refreshTokenHash).toBeTruthy();
    expect(session.revokedAt).toBeNull();
  });

  it('rejects an unverified user', async () => {
    await prisma.user.update({
      where: {
        email: 'login@example.com',
      },
      data: {
        emailVerifiedAt: null,
      },
    });

    const response = await request(app).post('/auth/login').send({
      email: 'login@example.com',
      password: 'StrongPassword123!',
    });

    expect(response.status).toBe(401);

    expect(response.body).toMatchObject({
      success: false,
    });

    const sessions = await prisma.session.findMany();

    expect(sessions).toHaveLength(0);
  });

  it('rejects an incorrect password', async () => {
    const response = await request(app).post('/auth/login').send({
      email: 'login@example.com',
      password: 'WrongPassword123!',
    });

    expect(response.status).toBe(401);

    expect(response.body).toMatchObject({
      success: false,
    });
  });

  it('rejects an unknown email', async () => {
    const response = await request(app).post('/auth/login').send({
      email: 'unknown@example.com',
      password: 'StrongPassword123!',
    });

    expect(response.status).toBe(401);

    expect(response.body).toMatchObject({
      success: false,
    });
  });

  it('does not create a session when authentication fails', async () => {
    await request(app).post('/auth/login').send({
      email: 'login@example.com',
      password: 'WrongPassword123!',
    });

    const sessions = await prisma.session.findMany();

    expect(sessions).toHaveLength(0);
  });
});
