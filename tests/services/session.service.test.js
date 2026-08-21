import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/db/prisma.js';
import {
  createSession,
  findSessionById,
  revokeSession,
  rotateSession,
} from '../../src/services/session.service.js';

describe('session service', () => {
  let user;

  beforeEach(async () => {
    user = await prisma.user.create({
      data: {
        username: 'sessionuser',
        email: 'session@example.com',
        passwordHash: 'not-a-real-password-hash',
      },
    });
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('creates a session with a hashed refresh token', async () => {
    const result = await createSession({
      userId: user.id,
      userAgent: 'Vitest',
      ipAddress: '127.0.0.1',
    });

    expect(result.refreshToken).toBeDefined();
    expect(result.session.userId).toBe(user.id);
    expect(result.session.refreshTokenHash).toBeDefined();

    expect(result.session.refreshTokenHash).not.toBe(result.refreshToken);

    expect(result.session.expiresAt).toBeInstanceOf(Date);
  });

  it('finds a session by id', async () => {
    const { session } = await createSession({
      userId: user.id,
      userAgent: 'Vitest',
      ipAddress: '127.0.0.1',
    });

    const foundSession = await findSessionById(session.id);

    expect(foundSession).not.toBeNull();
    expect(foundSession.id).toBe(session.id);
    expect(foundSession.userId).toBe(user.id);
  });

  it('rotates a valid refresh token', async () => {
    const { session, refreshToken } = await createSession({
      userId: user.id,
    });

    const originalHash = session.refreshTokenHash;

    const result = await rotateSession({
      sessionId: session.id,
      refreshToken,
    });

    expect(result.refreshToken).toBeDefined();
    expect(result.refreshToken).not.toBe(refreshToken);

    expect(result.session.refreshTokenHash).not.toBe(originalHash);

    expect(result.session.lastUsedAt).toBeInstanceOf(Date);
  });

  it('rejects an invalid refresh token', async () => {
    const { session } = await createSession({
      userId: user.id,
    });

    await expect(
      rotateSession({
        sessionId: session.id,
        refreshToken: 'invalid-refresh-token',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'AUTHENTICATION_REQUIRED',
    });
  });

  it('rejects a revoked session', async () => {
    const { session, refreshToken } = await createSession({
      userId: user.id,
    });

    await revokeSession(session.id);

    await expect(
      rotateSession({
        sessionId: session.id,
        refreshToken,
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'AUTHENTICATION_REQUIRED',
    });
  });

  it('rejects an expired session', async () => {
    const { session, refreshToken } = await createSession({
      userId: user.id,
    });

    await prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    await expect(
      rotateSession({
        sessionId: session.id,
        refreshToken,
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'AUTHENTICATION_REQUIRED',
    });
  });

  it('revokes a session', async () => {
    const { session } = await createSession({
      userId: user.id,
    });

    await revokeSession(session.id);

    const revokedSession = await findSessionById(session.id);

    expect(revokedSession.revokedAt).toBeInstanceOf(Date);
  });

  it('rejects refresh-token reuse and revokes the session', async () => {
    const { session, refreshToken } = await createSession({
      userId: user.id,
    });

    const firstRotation = await rotateSession({
      sessionId: session.id,
      refreshToken,
    });

    expect(firstRotation.refreshToken).not.toBe(refreshToken);

    await expect(
      rotateSession({
        sessionId: session.id,
        refreshToken,
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'AUTHENTICATION_REQUIRED',
    });

    const revokedSession = await findSessionById(session.id);

    expect(revokedSession.revokedAt).toBeInstanceOf(Date);
  });
});
