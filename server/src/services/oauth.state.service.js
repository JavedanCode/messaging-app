import crypto from 'node:crypto';

// Generate a cryptographically random value used to bind the OAuth callback
// to the browser session that initiated the authentication flow.
export function generateOAuthState() {
  return crypto.randomBytes(32).toString('hex');
}

export function verifyOAuthState(expectedState, receivedState) {
  if (!expectedState || !receivedState) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedState);
  const receivedBuffer = Buffer.from(receivedState);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  // Compare the values in constant time to avoid leaking information through
  // timing differences during state validation.
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
