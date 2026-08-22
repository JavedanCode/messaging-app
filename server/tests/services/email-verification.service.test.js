import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '../../src/db/prisma.js';
import {
  resendEmailVerification,
  sendEmailVerification,
} from '../../src/services/email-verification.service.js';
import { sendEmail } from '../../src/services/email.service.js';

vi.mock('../../src/services/email.service.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({
    id: 'test-email-id',
  }),
}));

describe('email verification service', () => {
  let user;

  beforeEach(async () => {
    vi.clearAllMocks();

    user = await prisma.user.create({
      data: {
        username: 'emailserviceuser',
        email: 'emailservice@example.com',
        passwordHash: 'not-a-real-password-hash',
      },
    });
  });

  afterEach(async () => {
    await prisma.verificationToken.deleteMany();
    await prisma.user.deleteMany();
  });

  it('sends an email verification email', async () => {
    await sendEmailVerification(user);

    expect(sendEmail).toHaveBeenCalledTimes(1);

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: user.email,
        subject: 'Verify your email address',
        html: expect.any(String),
      }),
    );
  });

  it('sends a new verification email when resending is allowed', async () => {
    await resendEmailVerification(user.email);

    expect(sendEmail).toHaveBeenCalledTimes(1);

    const token = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
      },
    });

    expect(token).not.toBeNull();
  });

  it('does not send an email for an unknown address', async () => {
    await resendEmailVerification('unknown@example.com');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('does not send an email to an already verified user', async () => {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerifiedAt: new Date(),
      },
    });

    await resendEmailVerification(user.email);

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('does not send another email during the cooldown period', async () => {
    await resendEmailVerification(user.email);

    expect(sendEmail).toHaveBeenCalledTimes(1);

    await resendEmailVerification(user.email);

    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
