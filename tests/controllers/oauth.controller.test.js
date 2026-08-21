import { beforeEach, describe, expect, it, vi } from 'vitest';

import { googleCallback } from '../../src/controllers/oauth.controller.js';
import { createAuthentication } from '../../src/services/auth.service.js';

vi.mock('../../src/services/auth.service.js', () => ({
  createAuthentication: vi.fn(),
}));

describe('googleCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates authentication and redirects the user', async () => {
    createAuthentication.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      session: {
        id: 'session-123',
      },
    });

    const req = {
      user: {
        id: 'user-123',
      },
      query: {
        state: 'valid-state',
      },
      cookies: {
        oauthState: 'valid-state',
      },
      get: vi.fn().mockReturnValue('Vitest'),
      ip: '127.0.0.1',
    };

    const res = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
      redirect: vi.fn(),
    };

    const next = vi.fn();

    await googleCallback(req, res, next);

    expect(createAuthentication).toHaveBeenCalledWith({
      userId: 'user-123',
      userAgent: 'Vitest',
      ipAddress: '127.0.0.1',
    });

    expect(res.clearCookie).toHaveBeenCalledWith('oauthState', expect.any(Object));

    expect(res.cookie).toHaveBeenCalledTimes(2);

    expect(res.cookie.mock.calls[0][0]).toBe('accessToken');
    expect(res.cookie.mock.calls[0][1]).toBe('access-token');

    expect(res.cookie.mock.calls[1][0]).toBe('refreshToken');
    expect(res.cookie.mock.calls[1][1]).toBe('refresh-token');

    expect(res.redirect).toHaveBeenCalledWith(expect.any(String));

    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a callback without an authenticated user', async () => {
    const req = {
      user: undefined,
      query: {
        state: 'valid-state',
      },
      cookies: {
        oauthState: 'valid-state',
      },
      get: vi.fn(),
      ip: '127.0.0.1',
    };

    const res = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
      redirect: vi.fn(),
    };

    const next = vi.fn();

    await googleCallback(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: 'OAUTH_AUTHENTICATION_FAILED',
      }),
    );

    expect(createAuthentication).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('passes authentication errors to the error handler', async () => {
    createAuthentication.mockRejectedValue(new Error('Session creation failed.'));

    const req = {
      user: {
        id: 'user-123',
      },
      query: {
        state: 'valid-state',
      },
      cookies: {
        oauthState: 'valid-state',
      },
      get: vi.fn().mockReturnValue('Vitest'),
      ip: '127.0.0.1',
    };

    const res = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
      redirect: vi.fn(),
    };

    const next = vi.fn();

    await googleCallback(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Session creation failed.',
      }),
    );

    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('rejects a callback with a missing state', async () => {
    const req = {
      user: {
        id: 'user-123',
      },
      query: {},
      cookies: {
        oauthState: 'expected-state',
      },
      get: vi.fn().mockReturnValue('Vitest'),
      ip: '127.0.0.1',
    };

    const res = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
      redirect: vi.fn(),
    };

    const next = vi.fn();

    await googleCallback(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: 'OAUTH_STATE_INVALID',
      }),
    );

    expect(createAuthentication).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('rejects a callback with an invalid state', async () => {
    const req = {
      user: {
        id: 'user-123',
      },
      query: {
        state: 'attacker-controlled-state',
      },
      cookies: {
        oauthState: 'expected-state',
      },
      get: vi.fn().mockReturnValue('Vitest'),
      ip: '127.0.0.1',
    };

    const res = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
      redirect: vi.fn(),
    };

    const next = vi.fn();

    await googleCallback(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: 'OAUTH_STATE_INVALID',
      }),
    );

    expect(createAuthentication).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
