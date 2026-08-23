import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';

import { AuthProvider } from '../../generated/prisma/enums.ts';
import { env } from '../config/env.js';
import { findOrCreateOAuthUser } from '../services/oauth.service.js';
import { processGitHubProfile, extractGitHubProfile } from './github-profile.js';

export function configureGitHubStrategy() {
  // OAuth strategies are optional. Skip registration when the provider has not
  // been configured so applications can use only the authentication providers they need.
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.GITHUB_CALLBACK_URL) {
    return;
  }

  // Passport handles the provider-specific OAuth flow; profile normalization
  // and user/account persistence are delegated to separate modules.
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
          if (req.path === '/auth/github/link/callback') {
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
