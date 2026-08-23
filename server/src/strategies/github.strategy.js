import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';

import { AuthProvider } from '../../generated/prisma/enums.ts';
import { env } from '../config/env.js';
import { findOrCreateOAuthUser } from '../services/oauth.service.js';
import { processGitHubProfile, extractGitHubProfile } from './github-profile.js';

export function configureGitHubStrategy() {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.GITHUB_CALLBACK_URL) {
    return;
  }

  passport.use(
    new GitHubStrategy(
      {
        clientID: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackURL: env.GITHUB_CALLBACK_URL,
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          if (req.oauthLinking) {
            console.log('[GitHub OAuth] Raw profile for linking:', {
              id: profile.id,
              username: profile.username,
              displayName: profile.displayName,
              emails: profile.emails,
              photos: profile.photos,
              _json: profile._json,
            });

            const providerData = extractGitHubProfile(profile);

            return done(null, providerData);
          }

          const user = await processGitHubProfile(profile, {
            findOrCreateOAuthUser,
            provider: AuthProvider.GITHUB,
          });

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
}
