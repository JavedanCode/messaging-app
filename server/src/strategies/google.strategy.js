import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

import { AuthProvider } from '../../generated/prisma/enums.ts';
import { env } from '../config/env.js';
import { findOrCreateOAuthUser } from '../services/oauth.service.js';
import { processGoogleProfile } from './google-profile.js';

export function configureGoogleStrategy() {
  // OAuth strategies are optional. Skip registration when the provider has not
  // been configured so applications can use only the authentication providers they need.
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_CALLBACK_URL) {
    return;
  }

  // Passport handles the provider-specific OAuth flow; profile normalization
  // and user/account persistence are delegated to separate modules.
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await processGoogleProfile(profile, {
            findOrCreateOAuthUser,
            provider: AuthProvider.GOOGLE,
          });

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
}
