import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import app from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import { createEmailVerificationToken } from '../../src/services/verification-token.service.js';

describe('POST /auth/email/verify', () => {
  let user;

  beforeEach(async () => {
    user = await prisma.user.create({
      data: {
        username: 'verifyuser',
        email: 'verify@example.com',
        passwordHash: 'not-a-real-password-hash',
      },
    });
  });

  afterEach(async () => {
    await prisma.verificationToken.deleteMany();
    await prisma.user.deleteMany();
  });

  it('verifies a valid email verification code', async () => {
    const code = await createEmailVerificationToken(user.id);

    const response = await request(app).post('/auth/email/verify').send({
      email: user.email,
      code,
    });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Email verified successfully.',
    });

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser.emailVerifiedAt).toBeInstanceOf(Date);

    const token = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
      },
    });

    expect(token.usedAt).toBeInstanceOf(Date);
  });

  it('rejects an invalid verification code', async () => {
    await createEmailVerificationToken(user.id);

    const response = await request(app).post('/auth/email/verify').send({
      email: user.email,
      code: '000000',
    });

    expect(response.status).toBe(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_VERIFICATION_CODE',
      },
    });

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser.emailVerifiedAt).toBeNull();
  });

  it('rejects an expired verification code', async () => {
    const code = await createEmailVerificationToken(user.id);

    const token = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
      },
    });

    await prisma.verificationToken.update({
      where: {
        id: token.id,
      },
      data: {
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const response = await request(app).post('/auth/email/verify').send({
      email: user.email,
      code,
    });

    expect(response.status).toBe(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_VERIFICATION_CODE',
      },
    });
  });

  it('rejects a nonexistent email without revealing whether the account exists', async () => {
    const response = await request(app).post('/auth/email/verify').send({
      email: 'unknown@example.com',
      code: '123456',
    });

    expect(response.status).toBe(400);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_VERIFICATION_CODE',
      },
    });
  });

  it('returns success when the email is already verified', async () => {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerifiedAt: new Date(),
      },
    });

    const response = await request(app).post('/auth/email/verify').send({
      email: user.email,
      code: '123456',
    });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Email is already verified.',
    });
  });

  it('rejects a code that is not six digits', async () => {
    const response = await request(app).post('/auth/email/verify').send({
      email: user.email,
      code: '12345',
    });

    expect(response.status).toBe(400);
  });
});
