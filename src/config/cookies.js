import { env } from './env.js';
import { durationToMilliseconds } from '../utils/duration.js';

const isProduction = env.NODE_ENV === 'production';

// Authentication cookies are HTTP-only so client-side JavaScript cannot access
// the tokens. Secure is enabled in production to require HTTPS.
export const accessTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: durationToMilliseconds(env.JWT_ACCESS_EXPIRES_IN),
};

// The refresh token is restricted to authentication endpoints because it is
// longer-lived and should not be sent with unrelated API requests.
export const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/auth',
  maxAge: durationToMilliseconds(env.JWT_REFRESH_EXPIRES_IN),
};

// OAuth state is stored in an HTTP-only cookie so it cannot be modified by
// client-side JavaScript while the OAuth flow is in progress.
export const oauthStateCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  maxAge: 10 * 60 * 1000,
  path: '/auth',
};
