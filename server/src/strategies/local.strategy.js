import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

import { verifyPassword } from '../services/password.service.js';
import { findUserByEmail } from '../services/user.service.js';

export function configureLocalStrategy() {
  passport.use(
    // Passport's local strategy authenticates users against the application's
    // own credentials rather than an external OAuth provider.
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          const user = await findUserByEmail(email);

          // Look up the account by normalized email. The route schema handles input
          // validation and normalization before Passport receives the credentials.
          if (!user || !user.passwordHash) {
            return done(null, false, {
              message: 'Invalid email or password.',
            });
          }

          // Password verification is delegated to the password service so hashing
          // implementation details remain outside the authentication strategy.
          const passwordValid = await verifyPassword(password, user.passwordHash);

          if (!passwordValid) {
            return done(null, false, {
              message: 'Invalid email or password.',
            });
          }

          // Local login requires a verified email address before an authenticated
          // session can be created.
          if (!user.emailVerifiedAt) {
            return done(null, false, {
              message: 'Please verify your email address before logging in.',
              code: 'EMAIL_NOT_VERIFIED',
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
}
