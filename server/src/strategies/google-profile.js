import { AppError } from '../errors/AppError.js';

export async function processGoogleProfile(profile, { findOrCreateOAuthUser, provider }) {
  // Google must provide a verified email address because the email is used
  // to identify and associate the OAuth account with a local user account.

  const emailData = profile.emails?.[0];

  const email = emailData?.value ?? profile._json?.email;
  const emailVerified = emailData?.verified ?? profile._json?.email_verified;

  console.log('[Google OAuth] Processing login profile:', {
    providerAccountId: profile.id,
    email,
    emailVerified,
    hasEmailData: Boolean(emailData),
    profileEmailVerified: profile._json?.email_verified,
  });

  if (!email || emailVerified !== true) {
    console.error('[Google OAuth] Email verification failed:', {
      providerAccountId: profile.id,
      hasEmail: Boolean(email),
      emailVerified,
    });

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
    email: email.toLowerCase(),
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
  // Used specifically for OAuth account linking.
  const emailData = profile.emails?.[0];

  const email = emailData?.value ?? profile._json?.email;
  const emailVerified = emailData?.verified ?? profile._json?.email_verified;

  console.log('[Google OAuth] Extracting profile for account linking:', {
    providerAccountId: profile.id,
    email,
    emailVerified,
    hasEmailData: Boolean(emailData),
    profileEmailVerified: profile._json?.email_verified,
  });

  if (!email || emailVerified !== true) {
    console.error('[Google OAuth] Account linking email verification failed:', {
      providerAccountId: profile.id,
      hasEmail: Boolean(email),
      emailVerified,
    });

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
