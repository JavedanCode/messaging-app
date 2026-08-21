import { beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/db/prisma.js';
import { findAccountByProvider, findOrCreateOAuthUser } from '../../src/services/oauth.service.js';
import { AuthProvider } from '../../generated/prisma/enums.js';

describe('oauth service', () => {
  beforeEach(async () => {
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
  });

  it('creates a new user and OAuth account', async () => {
    const user = await findOrCreateOAuthUser({
      provider: AuthProvider.GOOGLE,
      providerAccountId: 'google-123',
      email: 'google@example.com',
      displayName: 'Google User',
      avatarUrl: 'https://example.com/avatar.jpg',
    });

    expect(user).toBeDefined();
    expect(user.email).toBe('google@example.com');
    expect(user.displayName).toBe('Google User');
    expect(user.avatarUrl).toBe('https://example.com/avatar.jpg');

    const account = await findAccountByProvider({
      provider: AuthProvider.GOOGLE,
      providerAccountId: 'google-123',
    });

    expect(account).not.toBeNull();
    expect(account.userId).toBe(user.id);
    expect(account.provider).toBe(AuthProvider.GOOGLE);
  });

  it('returns the existing user for an existing OAuth account', async () => {
    const firstUser = await findOrCreateOAuthUser({
      provider: AuthProvider.GOOGLE,
      providerAccountId: 'google-123',
      email: 'google@example.com',
      displayName: 'Google User',
      avatarUrl: 'https://example.com/avatar.jpg',
    });

    const secondUser = await findOrCreateOAuthUser({
      provider: AuthProvider.GOOGLE,
      providerAccountId: 'google-123',
      email: 'google@example.com',
      displayName: 'Updated Name',
      avatarUrl: 'https://example.com/new-avatar.jpg',
    });

    expect(secondUser.id).toBe(firstUser.id);

    const accounts = await prisma.account.findMany({
      where: {
        userId: firstUser.id,
      },
    });

    expect(accounts).toHaveLength(1);
  });

  it('rejects an OAuth account when the email belongs to an existing user', async () => {
    await prisma.user.create({
      data: {
        username: 'existinguser',
        email: 'existing@example.com',
        passwordHash: 'existing-password-hash',
      },
    });

    await expect(
      findOrCreateOAuthUser({
        provider: AuthProvider.GOOGLE,
        providerAccountId: 'google-456',
        email: 'existing@example.com',
        displayName: 'Google User',
        avatarUrl: null,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'OAUTH_ACCOUNT_LINK_REQUIRED',
    });
  });

  it('generates a unique username when the generated username already exists', async () => {
    await prisma.user.create({
      data: {
        username: 'google',
        email: 'existing@example.com',
        passwordHash: 'existing-password-hash',
      },
    });

    const user = await findOrCreateOAuthUser({
      provider: AuthProvider.GOOGLE,
      providerAccountId: 'google-789',
      email: 'google@example.com',
      displayName: 'Google User',
      avatarUrl: null,
    });

    expect(user.username).toBe('google_1');
  });
});
