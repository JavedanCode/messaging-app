import { AppError } from '../errors/AppError.js';

export async function processGitHubProfile(profile, { findOrCreateOAuthUser, provider }) {
  // Prefer GitHub's primary email when available, falling back to the first
  // available email returned by the provider.
  const emailData = profile.emails?.find((email) => email.primary) ?? profile.emails?.[0];

  // A usable email address is required because it is used to identify and
  // associate the OAuth account with a local user account.
  if (!emailData?.value) {
    throw new AppError(
      'A GitHub account with an email address is required.',
      401,
      'OAUTH_EMAIL_REQUIRED',
    );
  }

  // Normalize provider data into the application-specific OAuth user shape.
  return findOrCreateOAuthUser({
    provider,
    providerAccountId: profile.id,
    email: emailData.value.toLowerCase(),
    displayName: profile.displayName || profile.username || null,
    avatarUrl: profile.photos?.[0]?.value || null,
  });
}
