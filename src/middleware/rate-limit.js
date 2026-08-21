import rateLimit from 'express-rate-limit';

// Keep references to the limiters so tests can reset their in-memory state
// between requests without restarting the application.
const limiters = [];

// Apply the same response-header configuration to every limiter while
// allowing each endpoint to define its own window and request limit.
function createRateLimiter(options) {
  const limiter = rateLimit({
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ...options,
  });

  limiters.push(limiter);

  return limiter;
}

// This helper is intended for test isolation and should not be used by
// application request handlers.
export async function resetRateLimiters() {
  for (const limiter of limiters) {
    await limiter.resetKey('127.0.0.1');
    await limiter.resetKey('::ffff:127.0.0.1');
  }
}

export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again later.',
    },
  },
});

export const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many registration attempts. Please try again later.',
    },
  },
});

export const refreshRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many refresh attempts. Please try again later.',
    },
  },
});

export const emailVerificationRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many verification attempts. Please try again later.',
    },
  },
});

export const resendEmailVerificationRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many verification email requests. Please try again later.',
    },
  },
});

export const forgotPasswordRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset requests. Please try again later.',
    },
  },
});

export const resetPasswordRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset attempts. Please try again later.',
    },
  },
});
