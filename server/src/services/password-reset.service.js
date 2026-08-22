import { prisma } from '../db/prisma.js';
import { findUserByEmail } from './user.service.js';
import {
  canRequestPasswordReset,
  createPasswordResetToken,
  consumePasswordResetToken,
} from './verification-token.service.js';
import { sendEmail } from './email.service.js';
import { buildPasswordResetEmail } from '../emails/password-reset.js';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

import { hashPassword } from './password.service.js';

export async function requestPasswordReset(email) {
  const user = await findUserByEmail(email);

  // Return silently when the email is not registered so password-reset requests
  // cannot be used to enumerate accounts.
  if (!user) {
    return;
  }

  // Suppress repeated reset requests according to the token service's cooldown
  // policy without exposing whether the request was allowed.
  const canRequest = await canRequestPasswordReset(user.id);

  if (!canRequest) {
    return;
  }

  const token = await createPasswordResetToken(user.id);

  const resetUrl = `${env.PASSWORD_RESET_URL}?token=${encodeURIComponent(token)}`;

  const emailContent = buildPasswordResetEmail({
    resetUrl,
  });

  await sendEmail({
    to: user.email,
    subject: emailContent.subject,
    html: emailContent.html,
  });
}

export async function resetPassword({ token, newPassword }) {
  const verificationToken = await consumePasswordResetToken(token);

  const passwordHash = await hashPassword(newPassword);

  const passwordChangedAt = new Date();

  // Consume the reset token, update the password, and revoke existing sessions
  // atomically so the account cannot end up in a partially updated state.
  await prisma.$transaction(async (tx) => {
    // Re-check that the token has not already been consumed inside the transaction
    // to prevent concurrent requests from successfully reusing the same token.
    const consumedToken = await tx.verificationToken.updateMany({
      where: {
        id: verificationToken.id,
        usedAt: null,
      },
      data: {
        usedAt: passwordChangedAt,
      },
    });

    if (consumedToken.count !== 1) {
      throw new AppError(
        'Invalid or expired password reset token.',
        400,
        'INVALID_PASSWORD_RESET_TOKEN',
      );
    }

    await tx.user.update({
      where: {
        id: verificationToken.userId,
      },
      data: {
        passwordHash,
        passwordChangedAt,
      },
    });

    await tx.session.updateMany({
      where: {
        userId: verificationToken.userId,
        revokedAt: null,
      },
      data: {
        revokedAt: passwordChangedAt,
      },
    });
  });
}
