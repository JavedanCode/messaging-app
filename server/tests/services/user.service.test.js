import bcrypt from 'bcryptjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/db/prisma.js';
import { changeUserPassword } from '../../src/services/user.service.js';

describe('user service', () => {
  let user;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('CurrentPassword123!', 12);

    user = await prisma.user.create({
      data: {
        username: 'passworduser',
        email: 'password@example.com',
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('changes the user password', async () => {
    await changeUserPassword({
      userId: user.id,
      currentPassword: 'CurrentPassword123!',
      newPassword: 'NewPassword123!',
    });

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser.passwordHash).not.toBe(user.passwordHash);

    const newPasswordMatches = await bcrypt.compare('NewPassword123!', updatedUser.passwordHash);

    expect(newPasswordMatches).toBe(true);
  });

  it('rejects an incorrect current password', async () => {
    await expect(
      changeUserPassword({
        userId: user.id,
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CURRENT_PASSWORD',
    });
  });

  it('rejects using the same password', async () => {
    await expect(
      changeUserPassword({
        userId: user.id,
        currentPassword: 'CurrentPassword123!',
        newPassword: 'CurrentPassword123!',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'PASSWORD_UNCHANGED',
    });
  });

  it('revokes all active sessions after changing the password', async () => {
    const firstSession = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: 'hash-one',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const secondSession = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: 'hash-two',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await changeUserPassword({
      userId: user.id,
      currentPassword: 'CurrentPassword123!',
      newPassword: 'NewPassword123!',
    });

    const sessions = await prisma.session.findMany({
      where: {
        userId: user.id,
      },
    });

    expect(sessions).toHaveLength(2);

    expect(sessions.find((session) => session.id === firstSession.id).revokedAt).toBeInstanceOf(
      Date,
    );

    expect(sessions.find((session) => session.id === secondSession.id).revokedAt).toBeInstanceOf(
      Date,
    );
  });

  it('does not revoke sessions when the current password is incorrect', async () => {
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: 'hash-one',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await expect(
      changeUserPassword({
        userId: user.id,
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_CURRENT_PASSWORD',
    });

    const session = await prisma.session.findFirst({
      where: {
        userId: user.id,
      },
    });

    expect(session.revokedAt).toBeNull();
  });
});
