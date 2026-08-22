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

// Passport verifies the provider response and populates req.user before the
// callback controller creates the application's authentication session.
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
  }),
  googleCallback,
);

router.get('/github', startGitHubOAuth);

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

// Passport verifies the provider response and populates req.user before the
// callback controller creates the application's authentication session.
router.get(
  '/github/callback',
  passport.authenticate('github', {
    session: false,
  }),
  githubCallback,
);

export default router;
