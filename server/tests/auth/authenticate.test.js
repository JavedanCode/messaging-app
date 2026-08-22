import bcrypt from 'bcryptjs';
import request from 'supertest';

import { prisma } from '../../src/db/prisma.js';
import app from '../../src/app.js';

describe('GET /auth/me', () => {
  let agent;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('StrongPassword123!', 12);

    await prisma.user.create({
      data: {
        username: 'authuser',
        email: 'auth@example.com',
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });

    agent = request.agent(app);

    await agent.post('/auth/login').send({
      email: 'auth@example.com',
      password: 'StrongPassword123!',
    });
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('returns the authenticated user', async () => {
    const response = await agent.get('/auth/me');

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      user: {
        username: 'authuser',
        email: 'auth@example.com',
      },
    });
  });

  it('rejects unauthenticated requests', async () => {
    const response = await request(app).get('/auth/me');

    expect(response.status).toBe(401);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
      },
    });
  });
});
