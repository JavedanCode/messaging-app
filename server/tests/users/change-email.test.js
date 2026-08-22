import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import { sendEmail } from '../../src/services/email.service.js';
import { resetRateLimiters } from '../../src/middleware/rate-limit.js';

vi.mock('../../src/services/email.service.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({
    id: 'test-email-id',
  }),
}));

describe('PATCH /users/me/email', () => {
  let user;
  let agent;

  const currentPassword = 'StrongPassword123!';

  beforeEach(async () => {
    vi.clearAllMocks();

    await resetRateLimiters();

    const passwordHash = await bcrypt.hash(currentPassword, 12);

    user = await prisma.user.create({
      data: {
        username: 'emailchangeuser',
        email: 'current@example.com',
        passwordHash,
        displayName: 'Email Change User',
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
    await prisma.verificationToken.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('creates an email change token and sends an email to the new address', async () => {
    const response = await agent.patch('/users/me/email').send({
      email: 'new@example.com',
    });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'If the email can be changed, a verification email will be sent.',
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'new@example.com',
        subject: expect.any(String),
        html: expect.stringContaining('new@example.com'),
      }),
    );

    const token = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'EMAIL_CHANGE',
      },
    });

    expect(token).not.toBeNull();
    expect(token.targetEmail).toBe('new@example.com');
    expect(token.tokenHash).toHaveLength(64);
    expect(token.usedAt).toBeNull();
  });

  it('does not change the email before verification', async () => {
    await agent.patch('/users/me/email').send({
      email: 'new@example.com',
    });

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser.email).toBe('current@example.com');
  });

  it('rejects an email address that is already registered', async () => {
    await prisma.user.create({
      data: {
        username: 'otheruser',
        email: 'taken@example.com',
        passwordHash: await bcrypt.hash('AnotherPassword123!', 12),
        emailVerifiedAt: new Date(),
      },
    });

    const response = await agent.patch('/users/me/email').send({
      email: 'taken@example.com',
    });

    expect(response.status).toBe(409);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
      },
    });

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('rejects changing to the current email address', async () => {
    const response = await agent.patch('/users/me/email').send({
      email: user.email,
    });

    expect(response.status).toBe(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'EMAIL_UNCHANGED',
      },
    });

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('rejects an invalid email address', async () => {
    const response = await agent.patch('/users/me/email').send({
      email: 'not-an-email',
    });

    expect(response.status).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app).patch('/users/me/email').send({
      email: 'new@example.com',
    });

    expect(response.status).toBe(401);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('does not create another token during the cooldown period', async () => {
    await agent.patch('/users/me/email').send({
      email: 'new@example.com',
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);

    await agent.patch('/users/me/email').send({
      email: 'another@example.com',
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);

    const tokens = await prisma.verificationToken.findMany({
      where: {
        userId: user.id,
        type: 'EMAIL_CHANGE',
      },
    });

    expect(tokens).toHaveLength(1);
  });

  it('rejects an empty request body', async () => {
    const response = await agent.patch('/users/me/email').send({});

    expect(response.status).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('changes the email after successful verification', async () => {
    await agent.patch('/users/me/email').send({
      email: 'new@example.com',
    });

    const email = sendEmail.mock.calls[0][0];
    const match = email.html.match(/token=([^"&]+)/);

    expect(match).not.toBeNull();

    const token = decodeURIComponent(match[1]);

    const response = await agent.post('/users/me/email/confirm').send({
      token,
    });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Email address changed successfully.',
    });

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser.email).toBe('new@example.com');
    expect(updatedUser.emailVerifiedAt).not.toBeNull();

    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'EMAIL_CHANGE',
      },
    });

    expect(verificationToken.usedAt).not.toBeNull();
  });

  it('rejects an invalid email change token', async () => {
    const response = await agent.post('/users/me/email/confirm').send({
      token: 'invalid-token',
    });

    expect(response.status).toBe(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_EMAIL_CHANGE_TOKEN',
      },
    });
  });

  it('rejects an expired email change token', async () => {
    await agent.patch('/users/me/email').send({
      email: 'new@example.com',
    });

    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'EMAIL_CHANGE',
      },
    });

    await prisma.verificationToken.update({
      where: {
        id: tokenRecord.id,
      },
      data: {
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const email = sendEmail.mock.calls[0][0];
    const match = email.html.match(/token=([^"&]+)/);

    expect(match).not.toBeNull();

    const token = decodeURIComponent(match[1]);

    const response = await agent.post('/users/me/email/confirm').send({
      token,
    });

    expect(response.status).toBe(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_EMAIL_CHANGE_TOKEN',
      },
    });
  });

  it('does not allow an email change token to be reused', async () => {
    await agent.patch('/users/me/email').send({
      email: 'new@example.com',
    });

    const email = sendEmail.mock.calls[0][0];
    const match = email.html.match(/token=([^"&]+)/);

    expect(match).not.toBeNull();

    const token = decodeURIComponent(match[1]);

    const firstResponse = await agent.post('/users/me/email/confirm').send({
      token,
    });

    expect(firstResponse.status).toBe(200);

    const secondResponse = await agent.post('/users/me/email/confirm').send({
      token,
    });

    expect(secondResponse.status).toBe(400);

    expect(secondResponse.body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_EMAIL_CHANGE_TOKEN',
      },
    });
  });

  it('does not allow another user to use the token', async () => {
    await agent.patch('/users/me/email').send({
      email: 'new@example.com',
    });

    const email = sendEmail.mock.calls[0][0];
    const match = email.html.match(/token=([^"&]+)/);

    expect(match).not.toBeNull();

    const token = decodeURIComponent(match[1]);

    const otherUser = await prisma.user.create({
      data: {
        username: 'otheremailuser',
        email: 'other@example.com',
        passwordHash: await bcrypt.hash('AnotherPassword123!', 12),
        emailVerifiedAt: new Date(),
      },
    });

    const otherAgent = request.agent(app);

    const loginResponse = await otherAgent.post('/auth/login').send({
      email: otherUser.email,
      password: 'AnotherPassword123!',
    });

    expect(loginResponse.status).toBe(200);

    const response = await otherAgent.post('/users/me/email/confirm').send({
      token,
    });

    expect(response.status).toBe(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_EMAIL_CHANGE_TOKEN',
      },
    });

    const unchangedUser = await prisma.user.findUnique({
      where: {
        id: otherUser.id,
      },
    });

    expect(unchangedUser.email).toBe('other@example.com');
  });

  it('rejects an unauthenticated confirmation request', async () => {
    const response = await request(app).post('/users/me/email/confirm').send({
      token: 'some-token',
    });

    expect(response.status).toBe(401);
  });

  it('rejects an empty confirmation request', async () => {
    const response = await agent.post('/users/me/email/confirm').send({});

    expect(response.status).toBe(400);
  });
});
