import { AppError } from '../errors/AppError.js';

export async function processGoogleProfile(profile, { findOrCreateOAuthUser, provider }) {
  // Google must provide a verified email address because the email is used
  // to identify and associate the OAuth account with a local user account.
  const emailData = profile.emails?.[0];

  const emailVerified = emailData?.verified ?? profile._json?.email_verified;

  if (!emailData?.value || !emailVerified) {
    throw new AppError(
      'A verified email address is required to use Google login.',
      401,
      'OAUTH_EMAIL_REQUIRED',
    );
  }

  // Normalize provider data into the application-specific OAuth user shape.
  const user = await findOrCreateOAuthUser({
    provider,
    providerAccountId: profile.id,
    email: emailData.value.toLowerCase(),
    displayName: profile.displayName || null,
    avatarUrl: profile.photos?.[0]?.value || null,
  });

  return {
    ...user,
    oauthProviderAccountId: profile.id,
    oauthProvider: provider,
  };
}

export function extractGoogleProfile(profile) {
  const emailData = profile.emails?.[0];

  const email = emailData?.value ?? profile._json?.email;
  const emailVerified = profile._json?.email_verified;

  if (!email || emailVerified !== true) {
    throw new AppError(
      'A verified email address is required to link a Google account.',
      401,
      'OAUTH_EMAIL_REQUIRED',
    );
  }

  return {
    providerAccountId: profile.id,
    email: email.toLowerCase(),
    displayName: profile.displayName || null,
    avatarUrl: profile.photos?.[0]?.value || null,
  };
}
