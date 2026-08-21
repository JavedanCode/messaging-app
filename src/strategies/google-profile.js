import { AppError } from '../errors/AppError.js';

export async function processGoogleProfile(profile, { findOrCreateOAuthUser, provider }) {
  // Google must provide a verified email address because the email is used
  // to identify and associate the OAuth account with a local user account.
  const emailData = profile.emails?.[0];

  if (!emailData?.value || !emailData.verified) {
    throw new AppError(
      'A verified email address is required to use Google login.',
      401,
      'OAUTH_EMAIL_REQUIRED',
    );
  }

  // Normalize provider data into the application-specific OAuth user shape.
  return findOrCreateOAuthUser({
    provider,
    providerAccountId: profile.id,
    email: emailData.value.toLowerCase(),
    displayName: profile.displayName || null,
    avatarUrl: profile.photos?.[0]?.value || null,
  });
}
