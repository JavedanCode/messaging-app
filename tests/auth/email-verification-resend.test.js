import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendEmail } from '../../src/services/email.service.js';

import app from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';

vi.mock('../../src/services/email.service.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({
    id: 'test-email-id',
  }),
}));

describe('POST /auth/email/resend', () => {
  let user;

  beforeEach(async () => {
    vi.clearAllMocks();

    user = await prisma.user.create({
      data: {
        username: 'resenduser',
        email: 'resend@example.com',
        passwordHash: 'not-a-real-password-hash',
      },
    });
  });

  afterEach(async () => {
    await prisma.verificationToken.deleteMany();
    await prisma.user.deleteMany();
  });

  it('sends a new verification email for an unverified user', async () => {
    const response = await request(app).post('/auth/email/resend').send({
      email: user.email,
    });

    expect(response.status).toBe(200);

    expect(sendEmail).toHaveBeenCalledTimes(1);

    const token = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
      },
    });

    expect(token).not.toBeNull();
    expect(token.tokenHash).toBeTruthy();
  });

  it('returns the same response for a nonexistent email', async () => {
    const response = await request(app).post('/auth/email/resend').send({
      email: 'unknown@example.com',
    });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'If the email can be verified, a verification email will be sent.',
    });
  });

  it('returns the same response for an already verified email', async () => {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerifiedAt: new Date(),
      },
    });

    const response = await request(app).post('/auth/email/resend').send({
      email: user.email,
    });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'If the email can be verified, a verification email will be sent.',
    });

    const token = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
      },
    });

    expect(token).toBeNull();
  });

  it('does not create another token during the cooldown period', async () => {
    await request(app).post('/auth/email/resend').send({
      email: user.email,
    });

    const firstToken = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
      },
    });

    expect(firstToken).not.toBeNull();

    const response = await request(app).post('/auth/email/resend').send({
      email: user.email,
    });

    expect(response.status).toBe(200);

    const tokens = await prisma.verificationToken.findMany({
      where: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
      },
    });

    expect(tokens).toHaveLength(1);
    expect(tokens[0].id).toBe(firstToken.id);
  });

  it('rejects an invalid email address', async () => {
    const response = await request(app).post('/auth/email/resend').send({
      email: 'not-an-email',
    });

    expect(response.status).toBe(400);
  });
});
