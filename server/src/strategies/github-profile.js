import { AppError } from '../errors/AppError.js';

function getGitHubEmail(profile) {
  const emailData =
    profile.emails?.find((email) => email.primary && email.value) ??
    profile.emails?.find((email) => email.value) ??
    (profile._json?.email ? { value: profile._json.email } : null);

  return emailData?.value?.toLowerCase() ?? null;
}

export async function processGitHubProfile(profile, { findOrCreateOAuthUser, provider }) {
  const email = getGitHubEmail(profile);

  if (!email) {
    throw new AppError(
      'A GitHub account with an email address is required.',
      401,
      'OAUTH_EMAIL_REQUIRED',
    );
  }

  const user = await findOrCreateOAuthUser({
    provider,
    providerAccountId: profile.id,
    email,
    displayName: profile.displayName || profile.username || null,
    avatarUrl: profile.photos?.[0]?.value || null,
  });

  return {
    ...user,
    oauthProviderAccountId: profile.id,
    oauthProvider: provider,
  };
}

export function extractGitHubProfile(profile) {
  console.log('[GitHub OAuth] Extracting profile:', {
    providerAccountId: profile.id,
    emails: profile.emails,
    jsonEmail: profile._json?.email,
  });

  const email = getGitHubEmail(profile);

  if (!email) {
    console.error('[GitHub OAuth] No email found:', {
      providerAccountId: profile.id,
      emails: profile.emails,
      jsonEmail: profile._json?.email,
    });

    throw new AppError(
      'A GitHub account with an email address is required to link your account.',
      401,
      'OAUTH_EMAIL_REQUIRED',
    );
  }

  return {
    providerAccountId: profile.id,
    email,
    displayName: profile.displayName || profile.username || null,
    avatarUrl: profile.photos?.[0]?.value || null,
  };
}
