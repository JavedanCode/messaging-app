import { Router } from 'express';

import {
  getMe,
  login,
  refresh,
  register,
  logout,
  verifyEmail,
  resendEmailVerificationController,
  forgotPassword,
  resetPasswordController,
} from '../controllers/auth.controller.js';

import {
  googleCallback,
  startGoogleOAuth,
  startGitHubOAuth,
  githubCallback,
  startGoogleOAuthLink,
  googleLinkCallback,
  startGitHubOAuthLink,
  githubLinkCallback,
} from '../controllers/oauth.controller.js';

import { authenticateLocal } from '../middleware/passport.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  loginRateLimiter,
  refreshRateLimiter,
  registerRateLimiter,
  emailVerificationRateLimiter,
  resendEmailVerificationRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
} from '../middleware/rate-limit.js';

import {
  loginSchema,
  registerSchema,
  verifyEmailSchema,
  resendEmailVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/auth.schema.js';

import { AppError } from '../errors/AppError.js';

import passport from 'passport';

import { env } from '../config/env.js';

const router = Router();

router.post('/register', registerRateLimiter, validate(registerSchema), register);

// Login requests are validated first, then authenticated by Passport.
// The controller only creates the application session after authentication succeeds.
router.post('/login', loginRateLimiter, validate(loginSchema), authenticateLocal, login);

router.get('/me', authenticate, getMe);

router.post('/refresh', refreshRateLimiter, refresh);

router.post(
  '/email/verify',
  emailVerificationRateLimiter,
  validate(verifyEmailSchema),
  verifyEmail,
);

router.post(
  '/email/resend',
  validate(resendEmailVerificationSchema),
  resendEmailVerificationRateLimiter,
  resendEmailVerificationController,
);

router.post(
  '/password/forgot',
  validate(forgotPasswordSchema),
  forgotPasswordRateLimiter,
  forgotPassword,
);

router.post(
  '/password/reset',
  resetPasswordRateLimiter,
  validate(resetPasswordSchema),
  resetPasswordController,
);

router.post('/logout', logout);

router.get('/google', startGoogleOAuth);

router.get('/google/link', authenticate, startGoogleOAuthLink);

// The authorization endpoint only starts the provider flow after confirming
// that the browser has an OAuth state value to bind to the callback.
router.get('/google/authorize', (req, res, next) => {
  const state = req.cookies.oauthState;

  if (!state) {
    return next(new AppError('OAuth authentication failed.', 401, 'OAUTH_STATE_INVALID'));
  }

  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
    session: false,
  })(req, res, next);
});

function handleOAuthCallbackError(error, req, res, next) {
  if (!error) {
    return next();
  }

  const code = error.code || 'OAUTH_AUTHENTICATION_FAILED';

  const allowedCodes = new Set([
    'OAUTH_ACCOUNT_LINK_REQUIRED',
    'OAUTH_EMAIL_REQUIRED',
    'OAUTH_AUTHENTICATION_FAILED',
    'OAUTH_STATE_INVALID',
  ]);

  const safeCode = allowedCodes.has(code) ? code : 'OAUTH_AUTHENTICATION_FAILED';

  return res.redirect(`${env.CLIENT_URL}/login?oauthError=${encodeURIComponent(safeCode)}`);
}

// Passport verifies the provider response and populates req.user before the
// callback controller creates the application's authentication session.
router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate(
      'google',
      {
        session: false,
      },
      (error, user, info) => {
        if (error) {
          return handleOAuthCallbackError(error, req, res, next);
        }

        if (!user) {
          return handleOAuthCallbackError(
            new AppError(
              info?.message || 'OAuth authentication failed.',
              401,
              info?.code || 'OAUTH_AUTHENTICATION_FAILED',
            ),
            req,
            res,
            next,
          );
        }

        req.user = user;

        return next();
      },
    )(req, res, next);
  },
  googleCallback,
);

router.get('/google/link/authorize', (req, res, next) => {
  const state = req.cookies.oauthLinkState;

  if (!state) {
    return next(new AppError('OAuth linking failed.', 401, 'OAUTH_STATE_INVALID'));
  }

  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
    callbackURL: env.GOOGLE_LINK_CALLBACK_URL,
    session: false,
  })(req, res, next);
});

router.get(
  '/google/link/callback',
  authenticate,
  (req, res, next) => {
    req.oauthLinking = true;

    const authenticatedUser = req.user;

    passport.authenticate(
      'google',
      {
        session: false,
      },
      (error, user, info) => {
        if (error) {
          return next(error);
        }

        if (!user) {
          return next(
            new AppError(
              info?.message || 'OAuth linking failed.',
              401,
              info?.code || 'OAUTH_AUTHENTICATION_FAILED',
            ),
          );
        }

        req.authenticatedUser = authenticatedUser;
        req.user = user;

        return next();
      },
    )(req, res, next);
  },
  googleLinkCallback,
);
router.get('/github', startGitHubOAuth);

router.get('/github/link', authenticate, startGitHubOAuthLink);

// The authorization endpoint only starts the provider flow after confirming
// that the browser has an OAuth state value to bind to the callback.
router.get('/github/authorize', (req, res, next) => {
  const state = req.cookies.oauthState;

  if (!state) {
    return next(new AppError('OAuth authentication failed.', 401, 'OAUTH_STATE_INVALID'));
  }

  return passport.authenticate('github', {
    scope: ['user:email'],
    state,
    session: false,
  })(req, res, next);
});

router.get(
  '/github/link/callback',
  authenticate,
  (req, res, next) => {
    req.oauthLinking = true;

    const authenticatedUser = req.user;

    passport.authenticate(
      'github',
      {
        session: false,
      },
      (error, user, info) => {
        if (error) {
          return next(error);
        }

        if (!user) {
          return next(
            new AppError(
              info?.message || 'OAuth linking failed.',
              401,
              info?.code || 'OAUTH_AUTHENTICATION_FAILED',
            ),
          );
        }

        req.authenticatedUser = authenticatedUser;
        req.user = user;

        return next();
      },
    )(req, res, next);
  },
  githubLinkCallback,
);

router.get('/github/link/authorize', (req, res, next) => {
  const state = req.cookies.oauthLinkState;

  if (!state) {
    return next(new AppError('OAuth linking failed.', 401, 'OAUTH_STATE_INVALID'));
  }

  return passport.authenticate('github', {
    scope: ['user:email'],
    state,
    callbackURL: env.GITHUB_LINK_CALLBACK_URL,
    session: false,
  })(req, res, next);
});

// Passport verifies the provider response and populates req.user before the
// callback controller creates the application's authentication session.
router.get(
  '/github/callback',
  (req, res, next) => {
    passport.authenticate(
      'github',
      {
        session: false,
      },
      (error, user, info) => {
        if (error) {
          return handleOAuthCallbackError(error, req, res, next);
        }

        if (!user) {
          return handleOAuthCallbackError(
            new AppError(
              info?.message || 'OAuth authentication failed.',
              401,
              info?.code || 'OAUTH_AUTHENTICATION_FAILED',
            ),
            req,
            res,
            next,
          );
        }

        req.user = user;

        return next();
      },
    )(req, res, next);
  },
  githubCallback,
);

export default router;
