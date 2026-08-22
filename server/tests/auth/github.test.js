import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../../src/app.js';

describe('GitHub OAuth', () => {
  it('starts the GitHub OAuth flow', async () => {
    const response = await request(app).get('/auth/github');

    expect(response.status).toBe(302);

    expect(response.headers.location).toBe('/auth/github/authorize');

    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('oauthState=')]),
    );
  });
});
