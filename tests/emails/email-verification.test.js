import { describe, expect, it } from 'vitest';

import { buildEmailVerificationEmail } from '../../src/emails/email-verification.js';

describe('email verification email', () => {
  it('builds an email containing the verification code', () => {
    const result = buildEmailVerificationEmail({
      code: '123456',
    });

    expect(result.subject).toBe('Verify your email address');
    expect(result.html).toContain('123456');
    expect(result.html).toContain('15 minutes');
  });
});
