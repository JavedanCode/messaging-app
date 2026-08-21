import { describe, expect, it } from 'vitest';

import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../src/services/token.service.js';

describe('token service', () => {
  const userId = 'test-user-id';
  const sessionId = 'test-session-id';

  it('generates and verifies an access token', () => {
    const token = generateAccessToken(userId);

    const payload = verifyAccessToken(token);

    expect(payload.sub).toBe(userId);
    expect(payload.type).toBe('access');
  });

  it('generates and verifies a refresh token', () => {
    const token = generateRefreshToken(userId, sessionId);

    const payload = verifyRefreshToken(token);

    expect(payload.sub).toBe(userId);
    expect(payload.sid).toBe(sessionId);
    expect(payload.type).toBe('refresh');
    expect(payload.jti).toBeDefined();
  });

  it('rejects an invalid access token', () => {
    expect(() => verifyAccessToken('invalid-token')).toThrowError(
      expect.objectContaining({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
      }),
    );
  });

  it('rejects an invalid refresh token', () => {
    expect(() => verifyRefreshToken('invalid-token')).toThrowError(
      expect.objectContaining({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
      }),
    );
  });

  it('rejects an access token as a refresh token', () => {
    const accessToken = generateAccessToken(userId);

    expect(() => verifyRefreshToken(accessToken)).toThrowError(
      expect.objectContaining({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
      }),
    );
  });

  it('rejects a refresh token as an access token', () => {
    const refreshToken = generateRefreshToken(userId, sessionId);

    expect(() => verifyAccessToken(refreshToken)).toThrowError(
      expect.objectContaining({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
      }),
    );
  });
});
