import { describe, expect, it } from 'vitest';

import { generateOAuthState, verifyOAuthState } from '../../src/services/oauth.state.service.js';

describe('OAuth state service', () => {
  it('generates a cryptographically random state', () => {
    const firstState = generateOAuthState();
    const secondState = generateOAuthState();

    expect(firstState).toHaveLength(64);
    expect(secondState).toHaveLength(64);

    expect(firstState).not.toBe(secondState);
  });

  it('accepts matching state values', () => {
    const state = generateOAuthState();

    expect(verifyOAuthState(state, state)).toBe(true);
  });

  it('rejects mismatched state values', () => {
    const expectedState = generateOAuthState();
    const receivedState = generateOAuthState();

    expect(verifyOAuthState(expectedState, receivedState)).toBe(false);
  });

  it('rejects a missing expected state', () => {
    expect(verifyOAuthState(undefined, 'some-state')).toBe(false);
  });

  it('rejects a missing received state', () => {
    expect(verifyOAuthState('some-state', undefined)).toBe(false);
  });

  it('rejects states with different lengths', () => {
    expect(verifyOAuthState('short', 'much-longer-state')).toBe(false);
  });
});
