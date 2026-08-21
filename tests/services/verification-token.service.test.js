import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/db/prisma.js';
import {
  createEmailVerificationToken,
  verifyEmailVerificationToken,
  canRequestEmailVerification,
} from '../../src/services/verification-token.service.js';

describe('verification token service', () => {
  let user;

  beforeEach(async () => {
    user = await prisma.user.create({
      data: {
        username: 'verificationuser',
        email: 'verification@example.com',
        passwordHash: 'not-a-real-password-hash',
      },
    });
  });

  afterEach(async () => {
    await prisma.verificationToken.deleteMany();
    await prisma.user.deleteMany();
  });

  it('creates a six-digit email verification code', async () => {
    const code = await createEmailVerificationToken(user.id);

    expect(code).toMatch(/^\d{6}$/);

    const token = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
      },
    });

    expect(token).not.toBeNull();
    expect(token.tokenHash).not.toBe(code);
    expect(token.usedAt).toBeNull();
    expect(token.expiresAt).toBeInstanceOf(Date);
  });

  it('verifies a valid email verification code', async () => {
    const code = await createEmailVerificationToken(user.id);

    await expect(verifyEmailVerificationToken(user.id, code)).resolves.toBe(true);

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

    await expect(verifyEmailVerificationToken(user.id, '000000')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_VERIFICATION_CODE',
    });
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

    await expect(verifyEmailVerificationToken(user.id, code)).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_VERIFICATION_CODE',
    });
  });

  it('invalidates the previous unused code when creating a new one', async () => {
    const firstCode = await createEmailVerificationToken(user.id);
    const secondCode = await createEmailVerificationToken(user.id);

    expect(secondCode).toMatch(/^\d{6}$/);
    expect(secondCode).not.toBe(firstCode);

    await expect(verifyEmailVerificationToken(user.id, firstCode)).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_VERIFICATION_CODE',
    });

    await expect(verifyEmailVerificationToken(user.id, secondCode)).resolves.toBe(true);
  });

  it('allows a verification email when there is no recent token', async () => {
    const canRequest = await canRequestEmailVerification(user.id);

    expect(canRequest).toBe(true);
  });

  it('blocks a verification email during the cooldown period', async () => {
    await createEmailVerificationToken(user.id);

    const canRequest = await canRequestEmailVerification(user.id);

    expect(canRequest).toBe(false);
  });
});
