import { beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/db/prisma.js';
import {
  findAccountByProvider,
  findOrCreateOAuthUser,
  linkOAuthAccount,
} from '../../src/services/oauth.service.js';
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

  it('links a new OAuth account to an existing user', async () => {
    const user = await prisma.user.create({
      data: {
        username: 'localuser',
        email: 'local@example.com',
        passwordHash: 'local-password-hash',
        emailVerifiedAt: new Date(),
      },
    });

    const account = await linkOAuthAccount({
      userId: user.id,
      provider: AuthProvider.GOOGLE,
      providerAccountId: 'google-123',
    });

    expect(account).toMatchObject({
      userId: user.id,
      provider: AuthProvider.GOOGLE,
      providerAccountId: 'google-123',
    });

    const savedAccount = await findAccountByProvider({
      provider: AuthProvider.GOOGLE,
      providerAccountId: 'google-123',
    });

    expect(savedAccount).not.toBeNull();
    expect(savedAccount.userId).toBe(user.id);
  });

  it('links a GitHub account to an existing user', async () => {
    const user = await prisma.user.create({
      data: {
        username: 'localuser',
        email: 'local@example.com',
        passwordHash: 'local-password-hash',
        emailVerifiedAt: new Date(),
      },
    });

    const account = await linkOAuthAccount({
      userId: user.id,
      provider: AuthProvider.GITHUB,
      providerAccountId: 'github-123',
    });

    expect(account).toMatchObject({
      userId: user.id,
      provider: AuthProvider.GITHUB,
      providerAccountId: 'github-123',
    });
  });

  it('rejects an OAuth account that is already linked to the same user', async () => {
    const user = await prisma.user.create({
      data: {
        username: 'localuser',
        email: 'local@example.com',
        passwordHash: 'local-password-hash',
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.account.create({
      data: {
        userId: user.id,
        provider: AuthProvider.GOOGLE,
        providerAccountId: 'google-123',
      },
    });

    await expect(
      linkOAuthAccount({
        userId: user.id,
        provider: AuthProvider.GOOGLE,
        providerAccountId: 'google-123',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'OAUTH_ACCOUNT_ALREADY_LINKED',
    });
  });

  it('rejects an OAuth account that is linked to another user', async () => {
    const firstUser = await prisma.user.create({
      data: {
        username: 'firstuser',
        email: 'first@example.com',
        passwordHash: 'first-password-hash',
        emailVerifiedAt: new Date(),
      },
    });

    const secondUser = await prisma.user.create({
      data: {
        username: 'seconduser',
        email: 'second@example.com',
        passwordHash: 'second-password-hash',
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.account.create({
      data: {
        userId: secondUser.id,
        provider: AuthProvider.GOOGLE,
        providerAccountId: 'google-123',
      },
    });

    await expect(
      linkOAuthAccount({
        userId: firstUser.id,
        provider: AuthProvider.GOOGLE,
        providerAccountId: 'google-123',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'OAUTH_ACCOUNT_ALREADY_LINKED_TO_ANOTHER_USER',
    });
  });
});
