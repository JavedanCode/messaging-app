import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../../src/app.js';

describe('Authentication rate limiting', () => {
  describe('POST /auth/login', () => {
    it('rate limits excessive login attempts', async () => {
      const requests = Array.from({ length: 11 }, () =>
        request(app).post('/auth/login').send({
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!',
        }),
      );

      const responses = await Promise.all(requests);

      const rateLimitedResponse = responses.find((response) => response.status === 429);

      expect(rateLimitedResponse).toBeDefined();

      expect(rateLimitedResponse.body).toMatchObject({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many login attempts. Please try again later.',
        },
      });
    });
  });

  describe('POST /auth/register', () => {
    it('rate limits excessive registration attempts', async () => {
      const requests = Array.from({ length: 6 }, (_, index) =>
        request(app)
          .post('/auth/register')
          .send({
            username: `ratelimituser${index}`,
            email: `ratelimit${index}@example.com`,
            password: 'StrongPassword123!',
            confirmPassword: 'StrongPassword123!',
          }),
      );

      const responses = await Promise.all(requests);

      const rateLimitedResponse = responses.find((response) => response.status === 429);

      expect(rateLimitedResponse).toBeDefined();

      expect(rateLimitedResponse.body).toMatchObject({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many registration attempts. Please try again later.',
        },
      });
    });
  });

  describe('POST /auth/refresh', () => {
    it('rate limits excessive refresh attempts', async () => {
      const requests = Array.from({ length: 21 }, () => request(app).post('/auth/refresh'));

      const responses = await Promise.all(requests);

      const rateLimitedResponse = responses.find((response) => response.status === 429);

      expect(rateLimitedResponse).toBeDefined();

      expect(rateLimitedResponse.body).toMatchObject({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many refresh attempts. Please try again later.',
        },
      });
    });
  });
});
