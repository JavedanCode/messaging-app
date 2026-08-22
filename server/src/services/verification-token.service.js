import crypto from 'node:crypto';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/AppError.js';

// Token lifetimes and resend cooldowns are kept here so all verification
// flows use consistent security policies.
const EMAIL_VERIFICATION_EXPIRATION_MINUTES = 15;
const EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;
const PASSWORD_RESET_EXPIRATION_MINUTES = 15;
const PASSWORD_RESET_COOLDOWN_SECONDS = 60;
const EMAIL_CHANGE_EXPIRATION_MINUTES = 15;
const EMAIL_CHANGE_COOLDOWN_SECONDS = 60;

function getExpiration(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

// Generate a cryptographically secure six-digit code rather than using
// Math.random(), which is not suitable for authentication secrets.
function generateVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

// Store only a hash of the verification code so the usable code is never
// persisted in the database.
function hashVerificationCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Hash password-reset and email-change tokens before persistence so database
// access does not expose usable authentication credentials.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createEmailVerificationToken(userId) {
  const code = generateVerificationCode();
  const tokenHash = hashVerificationCode(code);

  const expiresAt = getExpiration(EMAIL_VERIFICATION_EXPIRATION_MINUTES);

  // Invalidate any previous unused verification code so only the latest
  // verification attempt remains valid.
  await prisma.verificationToken.deleteMany({
    where: {
      userId,
      type: 'EMAIL_VERIFICATION',
      usedAt: null,
    },
  });

  await prisma.verificationToken.create({
    data: {
      userId,
      type: 'EMAIL_VERIFICATION',
      tokenHash,
      expiresAt,
    },
  });

  return code;
}

export async function verifyEmailVerificationToken(userId, code) {
  const tokenHash = hashVerificationCode(code);

  const token = await prisma.verificationToken.findFirst({
    where: {
      userId,
      type: 'EMAIL_VERIFICATION',
      tokenHash,
      usedAt: null,
    },
  });

  if (!token || token.expiresAt <= new Date()) {
    throw new AppError('Invalid or expired verification code.', 400, 'INVALID_VERIFICATION_CODE');
  }

  const verifiedAt = new Date();

  // Mark the token as used and verify the account together so the two state
  // changes cannot succeed independently.
  await prisma.$transaction([
    prisma.verificationToken.update({
      where: {
        id: token.id,
      },
      data: {
        usedAt: verifiedAt,
      },
    }),

    prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        emailVerifiedAt: verifiedAt,
      },
    }),
  ]);

  return true;
}

// Prevent repeated verification emails from being generated within the
// configured cooldown window.
export async function canRequestEmailVerification(userId) {
  const recentToken = await prisma.verificationToken.findFirst({
    where: {
      userId,
      type: 'EMAIL_VERIFICATION',
      createdAt: {
        gt: new Date(Date.now() - EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return !recentToken;
}

export async function createPasswordResetToken(userId) {
  const token = generateSecureToken();
  const tokenHash = hashToken(token);

  const expiresAt = getExpiration(PASSWORD_RESET_EXPIRATION_MINUTES);

  await prisma.verificationToken.deleteMany({
    where: {
      userId,
      type: 'PASSWORD_RESET',
      usedAt: null,
    },
  });

  await prisma.verificationToken.create({
    data: {
      userId,
      type: 'PASSWORD_RESET',
      tokenHash,
      expiresAt,
    },
  });

  return token;
}

// Validate the token without consuming it. The password-reset service consumes
// the token atomically with the password change.
export async function consumePasswordResetToken(token) {
  const tokenHash = hashToken(token);

  const verificationToken = await prisma.verificationToken.findFirst({
    where: {
      type: 'PASSWORD_RESET',
      tokenHash,
      usedAt: null,
    },
  });

  if (!verificationToken || verificationToken.expiresAt <= new Date()) {
    throw new AppError(
      'Invalid or expired password reset token.',
      400,
      'INVALID_PASSWORD_RESET_TOKEN',
    );
  }

  return verificationToken;
}

// Prevent repeated password-reset emails from being generated within the
// configured cooldown window.
export async function canRequestPasswordReset(userId) {
  const recentToken = await prisma.verificationToken.findFirst({
    where: {
      userId,
      type: 'PASSWORD_RESET',
      createdAt: {
        gt: new Date(Date.now() - PASSWORD_RESET_COOLDOWN_SECONDS * 1000),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return !recentToken;
}

export async function createEmailChangeToken(userId, targetEmail) {
  const token = generateSecureToken();
  const tokenHash = hashToken(token);

  const expiresAt = getExpiration(EMAIL_CHANGE_EXPIRATION_MINUTES);

  await prisma.verificationToken.deleteMany({
    where: {
      userId,
      type: 'EMAIL_CHANGE',
      usedAt: null,
    },
  });

  await prisma.verificationToken.create({
    data: {
      userId,
      type: 'EMAIL_CHANGE',
      tokenHash,
      targetEmail,
      expiresAt,
    },
  });

  return token;
}

// Validate the token without consuming it. The email-change service performs
// the final state change and token consumption together.
export async function consumeEmailChangeToken(token) {
  const tokenHash = hashToken(token);

  const verificationToken = await prisma.verificationToken.findFirst({
    where: {
      type: 'EMAIL_CHANGE',
      tokenHash,
      usedAt: null,
    },
  });

  if (!verificationToken || verificationToken.expiresAt <= new Date()) {
    throw new AppError('Invalid or expired email change token.', 400, 'INVALID_EMAIL_CHANGE_TOKEN');
  }

  return verificationToken;
}

// Prevent repeated email-change requests from being generated within the
// configured cooldown window.
export async function canRequestEmailChange(userId) {
  const recentToken = await prisma.verificationToken.findFirst({
    where: {
      userId,
      type: 'EMAIL_CHANGE',
      createdAt: {
        gt: new Date(Date.now() - EMAIL_CHANGE_COOLDOWN_SECONDS * 1000),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return !recentToken;
}
