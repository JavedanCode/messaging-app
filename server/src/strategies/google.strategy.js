import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

import { AuthProvider } from '../../generated/prisma/enums.ts';
import { env } from '../config/env.js';
import { findOrCreateOAuthUser } from '../services/oauth.service.js';
import { processGoogleProfile, extractGoogleProfile } from './google-profile.js';

export function configureGoogleStrategy() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_CALLBACK_URL) {
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          if (req.oauthLinking) {
            const providerData = extractGoogleProfile(profile);

            return done(null, providerData);
          }

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
