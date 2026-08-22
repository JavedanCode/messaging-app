import { describe, expect, it, vi } from 'vitest';

import { processGitHubProfile } from '../../src/strategies/github-profile.js';

describe('processGitHubProfile', () => {
  it('processes a GitHub profile with a primary email', async () => {
    const findOrCreateOAuthUser = vi.fn().mockResolvedValue({
      id: 'user-123',
    });

    const profile = {
      id: 'github-123',
      username: 'octocat',
      displayName: 'The Octocat',
      emails: [
        {
          value: 'octocat@example.com',
          primary: true,
        },
      ],
      photos: [
        {
          value: 'https://example.com/avatar.jpg',
        },
      ],
    };

    const result = await processGitHubProfile(profile, {
      findOrCreateOAuthUser,
      provider: 'GITHUB',
    });

    expect(findOrCreateOAuthUser).toHaveBeenCalledWith({
      provider: 'GITHUB',
      providerAccountId: 'github-123',
      email: 'octocat@example.com',
      displayName: 'The Octocat',
      avatarUrl: 'https://example.com/avatar.jpg',
    });

    expect(result).toEqual({
      id: 'user-123',
    });
  });

  it('falls back to the first email when no primary email exists', async () => {
    const findOrCreateOAuthUser = vi.fn().mockResolvedValue({
      id: 'user-123',
    });

    const profile = {
      id: 'github-123',
      username: 'octocat',
      displayName: 'The Octocat',
      emails: [
        {
          value: 'octocat@example.com',
          primary: false,
        },
      ],
    };

    await processGitHubProfile(profile, {
      findOrCreateOAuthUser,
      provider: 'GITHUB',
    });

    expect(findOrCreateOAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'octocat@example.com',
      }),
    );
  });

  it('uses the username when display name is unavailable', async () => {
    const findOrCreateOAuthUser = vi.fn().mockResolvedValue({
      id: 'user-123',
    });

    const profile = {
      id: 'github-123',
      username: 'octocat',
      emails: [
        {
          value: 'octocat@example.com',
        },
      ],
    };

    await processGitHubProfile(profile, {
      findOrCreateOAuthUser,
      provider: 'GITHUB',
    });

    expect(findOrCreateOAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: 'octocat',
      }),
    );
  });

  it('normalizes the email address to lowercase', async () => {
    const findOrCreateOAuthUser = vi.fn().mockResolvedValue({
      id: 'user-123',
    });

    const profile = {
      id: 'github-123',
      emails: [
        {
          value: 'OctoCat@Example.COM',
        },
      ],
    };

    await processGitHubProfile(profile, {
      findOrCreateOAuthUser,
      provider: 'GITHUB',
    });

    expect(findOrCreateOAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'octocat@example.com',
      }),
    );
  });

  it('rejects a profile without an email', async () => {
    const findOrCreateOAuthUser = vi.fn();

    const profile = {
      id: 'github-123',
      username: 'octocat',
      emails: [],
    };

    await expect(
      processGitHubProfile(profile, {
        findOrCreateOAuthUser,
        provider: 'GITHUB',
      }),
    ).rejects.toThrow('A GitHub account with an email address is required.');

    expect(findOrCreateOAuthUser).not.toHaveBeenCalled();
  });
});
