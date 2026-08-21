import { env } from '../config/env.js';

import {
  accessTokenCookieOptions,
  oauthStateCookieOptions,
  refreshTokenCookieOptions,
} from '../config/cookies.js';

import { AppError } from '../errors/AppError.js';

import { createAuthentication } from '../services/auth.service.js';

import { generateOAuthState, verifyOAuthState } from '../services/oauth.state.service.js';

export function startGoogleOAuth(req, res) {
  // Generate a short-lived state value to bind the OAuth callback to the
  // authentication flow initiated by this browser.
  const state = generateOAuthState();

  res.cookie('oauthState', state, oauthStateCookieOptions);

  return res.redirect('/auth/google/authorize');
}

export async function googleCallback(req, res, next) {
  try {
    const receivedState = req.query.state;
    const expectedState = req.cookies.oauthState;

    // Validate the OAuth state before accepting the provider's identity.
    // This protects the callback from forged or unsolicited OAuth responses.
    if (!verifyOAuthState(expectedState, receivedState)) {
      throw new AppError('OAuth authentication failed.', 401, 'OAUTH_STATE_INVALID');
    }

    res.clearCookie('oauthState', oauthStateCookieOptions);

    if (!req.user) {
      throw new AppError('OAuth authentication failed.', 401, 'OAUTH_AUTHENTICATION_FAILED');
    }

    // Passport has completed the provider authentication and populated req.user.
    // Create the application's session and issue the same tokens used by local login.
    const { accessToken, refreshToken } = await createAuthentication({
      userId: req.user.id,
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });

    res.cookie('accessToken', accessToken, accessTokenCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

    return res.redirect(env.CLIENT_URL);
  } catch (error) {
    return next(error);
  }
}

export function startGitHubOAuth(req, res) {
  // Generate a short-lived state value to bind the OAuth callback to the
  // authentication flow initiated by this browser.
  const state = generateOAuthState();

  res.cookie('oauthState', state, oauthStateCookieOptions);

  return res.redirect('/auth/github/authorize');
}

export async function githubCallback(req, res, next) {
  try {
    const receivedState = req.query.state;
    const expectedState = req.cookies.oauthState;

    // Validate the OAuth state before accepting the provider's identity.
    // This protects the callback from forged or unsolicited OAuth responses.
    if (!verifyOAuthState(expectedState, receivedState)) {
      throw new AppError('OAuth authentication failed.', 401, 'OAUTH_STATE_INVALID');
    }

    res.clearCookie('oauthState', oauthStateCookieOptions);

    if (!req.user) {
      throw new AppError('OAuth authentication failed.', 401, 'OAUTH_AUTHENTICATION_FAILED');
    }

    // Passport has completed the provider authentication and populated req.user.
    // Create the application's session and issue the same tokens used by local login.
    const { accessToken, refreshToken } = await createAuthentication({
      userId: req.user.id,
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });

    res.cookie('accessToken', accessToken, accessTokenCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

    return res.redirect(env.CLIENT_URL);
  } catch (error) {
    return next(error);
  }
}
