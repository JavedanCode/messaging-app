import { AppError } from '../errors/AppError.js';
import { findUserById } from '../services/user.service.js';
import { verifyAccessToken } from '../services/token.service.js';

function getAccessTokenFromCookies(cookieHeader) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';');

  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split('=');

    if (name === 'accessToken') {
      return decodeURIComponent(valueParts.join('='));
    }
  }

  return null;
}

export async function authenticateSocket(socket, next) {
  try {
    const token = getAccessTokenFromCookies(socket.handshake.headers.cookie);

    if (!token) {
      throw new AppError('Authentication required.', 401, 'AUTHENTICATION_REQUIRED');
    }

    const payload = verifyAccessToken(token);

    const user = await findUserById(payload.sub);

    if (!user) {
      throw new AppError('Authentication required.', 401, 'AUTHENTICATION_REQUIRED');
    }

    socket.user = user;

    return next();
  } catch (error) {
    return next(error);
  }
}
