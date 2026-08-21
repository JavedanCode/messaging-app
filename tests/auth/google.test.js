import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../../src/app.js';

describe('Google OAuth', () => {
  it('starts the Google OAuth flow', async () => {
    const response = await request(app).get('/auth/google');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/auth/google/authorize');

    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('oauthState=')]),
    );
  });
});
