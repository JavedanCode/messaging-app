import crypto from 'node:crypto';

import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';

import { durationToMilliseconds } from '../utils/duration.js';

import { AppError } from '../errors/AppError.js';

// Keep token verification behind one helper so access and refresh tokens share
// the same validation behavior and never expose JWT-library errors to clients.
function verifyToken(token, secret, expectedType) {
  try {
    const payload = jwt.verify(token, secret);

    // A valid signature is not enough; the token must also be intended for the
    // authentication flow that is consuming it.
    if (payload.type !== expectedType) {
      throw new AppError('Authentication required.', 401, 'AUTHENTICATION_REQUIRED');
    }

    return payload;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Authentication required.', 401, 'AUTHENTICATION_REQUIRED');
  }
}

// Refresh tokens carry the session ID so the session service can validate,
// rotate, and revoke the corresponding server-side session.
export function generateAccessToken(userId) {
  return jwt.sign(
    {
      sub: userId,
      type: 'access',
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    },
  );
}

export function generateRefreshToken(userId, sessionId) {
  return jwt.sign(
    {
      sub: userId,
      sid: sessionId,
      type: 'refresh',
      jti: crypto.randomUUID(),
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },
  );
}

export function verifyAccessToken(token) {
  return verifyToken(token, env.JWT_ACCESS_SECRET, 'access');
}

export function verifyRefreshToken(token) {
  return verifyToken(token, env.JWT_REFRESH_SECRET, 'refresh');
}

// Tokens are hashed before persistence so database access does not expose
// usable authentication credentials.
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getRefreshTokenExpiration() {
  return new Date(Date.now() + durationToMilliseconds(env.JWT_REFRESH_EXPIRES_IN));
}
