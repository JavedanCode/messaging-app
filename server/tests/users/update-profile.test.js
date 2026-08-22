import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import app from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import { resetRateLimiters } from '../../src/middleware/rate-limit.js';

describe('PATCH /users/me', () => {
  let user;
  let agent;

  beforeEach(async () => {
    await resetRateLimiters();

    const passwordHash = await bcrypt.hash('StrongPassword123!', 12);

    user = await prisma.user.create({
      data: {
        username: 'profileuser',
        email: 'profile@example.com',
        passwordHash,
        displayName: 'Original Name',
        avatarUrl: 'https://example.com/original.png',
        emailVerifiedAt: new Date(),
      },
    });

    agent = request.agent(app);

    const loginResponse = await agent.post('/auth/login').send({
      email: user.email,
      password: 'StrongPassword123!',
    });

    expect(loginResponse.status).toBe(200);
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('updates the display name', async () => {
    const response = await agent.patch('/users/me').send({
      displayName: 'New Name',
    });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user.id,
        username: 'profileuser',
        email: 'profile@example.com',
        displayName: 'New Name',
        avatarUrl: 'https://example.com/original.png',
      },
    });

    expect(response.body.user).not.toHaveProperty('passwordHash');

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser.displayName).toBe('New Name');
    expect(updatedUser.avatarUrl).toBe('https://example.com/original.png');
    expect(updatedUser.username).toBe('profileuser');
    expect(updatedUser.email).toBe('profile@example.com');
  });

  it('updates the avatar URL', async () => {
    const response = await agent.patch('/users/me').send({
      avatarUrl: 'https://example.com/new-avatar.png',
    });

    expect(response.status).toBe(200);

    expect(response.body.user).toMatchObject({
      displayName: 'Original Name',
      avatarUrl: 'https://example.com/new-avatar.png',
    });
  });

  it('updates both profile fields', async () => {
    const response = await agent.patch('/users/me').send({
      displayName: 'Updated Name',
      avatarUrl: 'https://example.com/updated.png',
    });

    expect(response.status).toBe(200);

    expect(response.body.user).toMatchObject({
      displayName: 'Updated Name',
      avatarUrl: 'https://example.com/updated.png',
    });
  });

  it('allows the display name to be cleared', async () => {
    const response = await agent.patch('/users/me').send({
      displayName: null,
    });

    expect(response.status).toBe(200);
    expect(response.body.user.displayName).toBeNull();

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser.displayName).toBeNull();
  });

  it('allows the avatar URL to be cleared', async () => {
    const response = await agent.patch('/users/me').send({
      avatarUrl: null,
    });

    expect(response.status).toBe(200);
    expect(response.body.user.avatarUrl).toBeNull();

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser.avatarUrl).toBeNull();
  });

  it('leaves unspecified fields unchanged', async () => {
    const response = await agent.patch('/users/me').send({
      displayName: 'Only Name Changed',
    });

    expect(response.status).toBe(200);

    expect(response.body.user).toMatchObject({
      displayName: 'Only Name Changed',
      avatarUrl: 'https://example.com/original.png',
    });
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app).patch('/users/me').send({
      displayName: 'Should Not Work',
    });

    expect(response.status).toBe(401);
  });

  it('rejects an invalid avatar URL', async () => {
    const response = await agent.patch('/users/me').send({
      avatarUrl: 'not-a-valid-url',
    });

    expect(response.status).toBe(400);

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser.avatarUrl).toBe('https://example.com/original.png');
  });

  it('rejects a display name longer than 100 characters', async () => {
    const response = await agent.patch('/users/me').send({
      displayName: 'a'.repeat(101),
    });

    expect(response.status).toBe(400);

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser.displayName).toBe('Original Name');
  });

  it('does not modify the username or email', async () => {
    const response = await agent.patch('/users/me').send({
      displayName: 'New Name',
      avatarUrl: 'https://example.com/new.png',
    });

    expect(response.status).toBe(200);

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser.username).toBe('profileuser');
    expect(updatedUser.email).toBe('profile@example.com');
  });

  it('rejects an empty request body', async () => {
    const response = await agent.patch('/users/me').send({});

    expect(response.status).toBe(400);
  });
});
