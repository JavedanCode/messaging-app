import { describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../../generated/prisma/enums.js';
import { processGoogleProfile } from '../../src/strategies/google-profile.js';

describe('Google OAuth profile processing', () => {
  it('creates a user from a verified Google profile', async () => {
    const findOrCreateOAuthUser = vi.fn().mockResolvedValue({
      id: 'user-123',
      email: 'user@example.com',
    });

    const profile = {
      id: 'google-123',
      displayName: 'Google User',
      emails: [
        {
          value: 'User@Example.com',
          verified: true,
        },
      ],
      photos: [
        {
          value: 'https://example.com/avatar.jpg',
        },
      ],
    };

    const user = await processGoogleProfile(profile, {
      findOrCreateOAuthUser,
      provider: AuthProvider.GOOGLE,
    });

    expect(user.id).toBe('user-123');

    expect(findOrCreateOAuthUser).toHaveBeenCalledOnce();

    expect(findOrCreateOAuthUser).toHaveBeenCalledWith({
      provider: AuthProvider.GOOGLE,
      providerAccountId: 'google-123',
      email: 'user@example.com',
      displayName: 'Google User',
      avatarUrl: 'https://example.com/avatar.jpg',
    });
  });

  it('rejects a Google profile without an email', async () => {
    const findOrCreateOAuthUser = vi.fn();

    const profile = {
      id: 'google-123',
      displayName: 'Google User',
      emails: [],
      photos: [],
    };

    await expect(
      processGoogleProfile(profile, {
        findOrCreateOAuthUser,
        provider: AuthProvider.GOOGLE,
      }),
    ).rejects.toThrow('A verified email address is required to use Google login.');

    expect(findOrCreateOAuthUser).not.toHaveBeenCalled();
  });

  it('rejects an unverified Google email', async () => {
    const findOrCreateOAuthUser = vi.fn();

    const profile = {
      id: 'google-123',
      displayName: 'Google User',
      emails: [
        {
          value: 'user@example.com',
          verified: false,
        },
      ],
      photos: [],
    };

    await expect(
      processGoogleProfile(profile, {
        findOrCreateOAuthUser,
        provider: AuthProvider.GOOGLE,
      }),
    ).rejects.toThrow('A verified email address is required to use Google login.');

    expect(findOrCreateOAuthUser).not.toHaveBeenCalled();
  });

  it('handles a missing profile photo', async () => {
    const findOrCreateOAuthUser = vi.fn().mockResolvedValue({
      id: 'user-123',
    });

    const profile = {
      id: 'google-123',
      displayName: 'Google User',
      emails: [
        {
          value: 'user@example.com',
          verified: true,
        },
      ],
      photos: [],
    };

    await processGoogleProfile(profile, {
      findOrCreateOAuthUser,
      provider: AuthProvider.GOOGLE,
    });

    expect(findOrCreateOAuthUser).toHaveBeenCalledWith({
      provider: AuthProvider.GOOGLE,
      providerAccountId: 'google-123',
      email: 'user@example.com',
      displayName: 'Google User',
      avatarUrl: null,
    });
  });
});
