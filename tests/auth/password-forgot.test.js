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

describe('POST /auth/password/forgot', () => {
  let user;

  beforeEach(async () => {
    vi.clearAllMocks();

    await resetRateLimiters();

    user = await prisma.user.create({
      data: {
        username: 'forgotuser',
        email: 'forgot@example.com',
        passwordHash: 'not-a-real-password-hash',
        emailVerifiedAt: new Date(),
      },
    });
  });

  afterEach(async () => {
    await prisma.verificationToken.deleteMany();
    await prisma.user.deleteMany();
  });

  it('creates a reset token and sends a reset email', async () => {
    const response = await request(app).post('/auth/password/forgot').send({
      email: user.email,
    });

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      message: 'If an account exists for this email, a password reset email will be sent.',
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: user.email,
        subject: expect.any(String),
        html: expect.stringContaining('reset'),
      }),
    );

    const token = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'PASSWORD_RESET',
      },
    });

    expect(token).not.toBeNull();
    expect(token.tokenHash).toBeTruthy();
    expect(token.tokenHash).toHaveLength(64);
  });

  it('returns the same response for a nonexistent email', async () => {
    const response = await request(app).post('/auth/password/forgot').send({
      email: 'unknown@example.com',
    });

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      message: 'If an account exists for this email, a password reset email will be sent.',
    });

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('does not send another reset email during the cooldown period', async () => {
    await request(app).post('/auth/password/forgot').send({
      email: user.email,
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);

    await request(app).post('/auth/password/forgot').send({
      email: user.email,
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);

    const tokens = await prisma.verificationToken.findMany({
      where: {
        userId: user.id,
        type: 'PASSWORD_RESET',
      },
    });

    expect(tokens).toHaveLength(1);
  });

  it('replaces an old reset token after the cooldown expires', async () => {
    await request(app).post('/auth/password/forgot').send({
      email: user.email,
    });

    const firstToken = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'PASSWORD_RESET',
      },
    });

    expect(firstToken).not.toBeNull();

    await prisma.verificationToken.update({
      where: {
        id: firstToken.id,
      },
      data: {
        createdAt: new Date(Date.now() - 61 * 1000),
      },
    });

    await resetRateLimiters();

    const response = await request(app).post('/auth/password/forgot').send({
      email: user.email,
    });

    expect(response.status).toBe(200);

    const tokens = await prisma.verificationToken.findMany({
      where: {
        userId: user.id,
        type: 'PASSWORD_RESET',
      },
    });

    expect(tokens).toHaveLength(1);
    expect(tokens[0].id).not.toBe(firstToken.id);

    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it('rejects an invalid email address', async () => {
    const response = await request(app).post('/auth/password/forgot').send({
      email: 'not-an-email',
    });

    expect(response.status).toBe(400);

    expect(sendEmail).not.toHaveBeenCalled();
  });
});
