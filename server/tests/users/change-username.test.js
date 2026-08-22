import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import app from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import { resetRateLimiters } from '../../src/middleware/rate-limit.js';

describe('PATCH /users/me/username', () => {
  let user;
  let agent;

  const currentPassword = 'StrongPassword123!';

  beforeEach(async () => {
    await resetRateLimiters();

    const passwordHash = await bcrypt.hash(currentPassword, 12);

    user = await prisma.user.create({
      data: {
        username: 'usernameuser',
        email: 'username@example.com',
        passwordHash,
        displayName: 'Original Name',
        avatarUrl: 'https://example.com/avatar.png',
        emailVerifiedAt: new Date(),
      },
    });

    agent = request.agent(app);

    const loginResponse = await agent.post('/auth/login').send({
      email: user.email,
      password: currentPassword,
    });

    expect(loginResponse.status).toBe(200);
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('updates the username', async () => {
    const response = await agent.patch('/users/me/username').send({
      username: 'newusername',
    });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Username updated successfully.',
      user: {
        id: user.id,
        username: 'newusername',
      },
    });

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser.username).toBe('newusername');
  });

  it('trims whitespace from the username', async () => {
    const response = await agent.patch('/users/me/username').send({
      username: '  newusername  ',
    });

    expect(response.status).toBe(200);

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser.username).toBe('newusername');
  });

  it('allows the user to submit their current username', async () => {
    const response = await agent.patch('/users/me/username').send({
      username: user.username,
    });

    expect(response.status).toBe(200);

    expect(response.body.user.username).toBe(user.username);
  });

  it('rejects a username that is already taken', async () => {
    await prisma.user.create({
      data: {
        username: 'takenusername',
        email: 'taken@example.com',
        passwordHash: await bcrypt.hash('AnotherPassword123!', 12),
        emailVerifiedAt: new Date(),
      },
    });

    const response = await agent.patch('/users/me/username').send({
      username: 'takenusername',
    });

    expect(response.status).toBe(409);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'USERNAME_ALREADY_EXISTS',
      },
    });
  });

  it('rejects a username shorter than 3 characters', async () => {
    const response = await agent.patch('/users/me/username').send({
      username: 'ab',
    });

    expect(response.status).toBe(400);
  });

  it('rejects a username longer than 30 characters', async () => {
    const response = await agent.patch('/users/me/username').send({
      username: 'a'.repeat(31),
    });

    expect(response.status).toBe(400);
  });

  it('rejects a username containing invalid characters', async () => {
    const response = await agent.patch('/users/me/username').send({
      username: 'invalid username!',
    });

    expect(response.status).toBe(400);
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app).patch('/users/me/username').send({
      username: 'newusername',
    });

    expect(response.status).toBe(401);
  });

  it('does not modify the email', async () => {
    await agent.patch('/users/me/username').send({
      username: 'newusername',
    });

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser.email).toBe(user.email);
  });

  it('does not modify the password', async () => {
    await agent.patch('/users/me/username').send({
      username: 'newusername',
    });

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(await bcrypt.compare(currentPassword, updatedUser.passwordHash)).toBe(true);
  });

  it('does not modify other profile fields', async () => {
    await agent.patch('/users/me/username').send({
      username: 'newusername',
    });

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser.displayName).toBe('Original Name');
    expect(updatedUser.avatarUrl).toBe('https://example.com/avatar.png');
  });

  it('rejects an empty request body', async () => {
    const response = await agent.patch('/users/me/username').send({});

    expect(response.status).toBe(400);
  });
});
