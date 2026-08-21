import { createAuthentication, registerUser } from '../services/auth.service.js';
import { accessTokenCookieOptions, refreshTokenCookieOptions } from '../config/cookies.js';
import { rotateSession, revokeSession } from '../services/session.service.js';
import { generateAccessToken, verifyRefreshToken } from '../services/token.service.js';
import { findUserByEmail } from '../services/user.service.js';
import { verifyEmailVerificationToken } from '../services/verification-token.service.js';
import { sendEmailVerification } from '../services/email-verification.service.js';
import { resendEmailVerification } from '../services/email-verification.service.js';
import { requestPasswordReset, resetPassword } from '../services/password-reset.service.js';
import { AppError } from '../errors/AppError.js';

export async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;

    const user = await registerUser({
      username,
      email,
      password,
    });

    // Registration is not complete until the user verifies their email address.
    // The verification token is created and delivered after the user is persisted.
    await sendEmailVerification(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email address.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        emailVerifiedAt: user.emailVerifiedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    // Passport has already authenticated the credentials at this point.
    // Create the application's session and issue both authentication tokens.
    const { accessToken, refreshToken } = await createAuthentication({
      userId: req.user.id,
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });

    res.cookie('accessToken', accessToken, accessTokenCookieOptions);

    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        displayName: req.user.displayName,
        avatarUrl: req.user.avatarUrl,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      displayName: req.user.displayName,
      avatarUrl: req.user.avatarUrl,
    },
  });
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new AppError('Authentication required.', 401, 'AUTHENTICATION_REQUIRED');
    }

    const payload = verifyRefreshToken(refreshToken);

    // Refresh tokens are rotated on every successful refresh so a previously
    // used token cannot be reused without triggering session revocation.
    const { session, refreshToken: newRefreshToken } = await rotateSession({
      sessionId: payload.sid,
      refreshToken,
    });

    const accessToken = generateAccessToken(session.userId);

    res.cookie('accessToken', accessToken, accessTokenCookieOptions);

    res.cookie('refreshToken', newRefreshToken, refreshTokenCookieOptions);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
    });
  } catch (error) {
    return next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);

        await revokeSession(payload.sid);
      } catch {
        // Logout should remain safe and idempotent.
        // Invalid or expired authentication should not prevent
        // the client from clearing its cookies.
      }
    }

    res.clearCookie('accessToken', accessTokenCookieOptions);
    res.clearCookie('refreshToken', refreshTokenCookieOptions);

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const { email, code } = req.body;

    const user = await findUserByEmail(email);

    // Use the same response for unknown accounts and invalid verification codes
    // so email verification cannot be used to enumerate registered addresses.
    if (!user) {
      throw new AppError('Invalid or expired verification code.', 400, 'INVALID_VERIFICATION_CODE');
    }

    if (user.emailVerifiedAt) {
      return res.status(200).json({
        success: true,
        message: 'Email is already verified.',
      });
    }

    await verifyEmailVerificationToken(user.id, code);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
    });
  } catch (error) {
    return next(error);
  }
}

export async function resendEmailVerificationController(req, res, next) {
  try {
    const { email } = req.body;

    await resendEmailVerification(email);

    return res.status(200).json({
      success: true,
      message: 'If the email can be verified, a verification email will be sent.',
    });
  } catch (error) {
    return next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    await requestPasswordReset(email);

    return res.status(200).json({
      success: true,
      message: 'If an account exists for this email, a password reset email will be sent.',
    });
  } catch (error) {
    return next(error);
  }
}

export async function resetPasswordController(req, res, next) {
  try {
    const { token, newPassword } = req.body;

    await resetPassword({
      token,
      newPassword,
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully.',
    });
  } catch (error) {
    return next(error);
  }
}
