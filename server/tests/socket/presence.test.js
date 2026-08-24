import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIo = {
  to: vi.fn(() => ({
    emit: vi.fn(),
  })),
};

const mockFriendIds = vi.fn();

vi.mock('../../src/sockets/io.js', () => ({
  getSocketServer: () => mockIo,
}));

vi.mock('../../src/services/presence.service.js', () => ({
  getFriendUserIds: (...args) => mockFriendIds(...args),
}));

import {
  isUserOnline,
  registerPresenceSocket,
  resetOnlineUsers,
} from '../../src/sockets/presence.socket.js';

function createSocket(userId) {
  const handlers = new Map();

  return {
    user: { id: userId },
    on: vi.fn((eventName, callback) => {
      handlers.set(eventName, callback);
    }),
    emit: vi.fn(),
    getHandler: (eventName) => handlers.get(eventName),
  };
}

describe('Presence sockets', () => {
  beforeEach(() => {
    resetOnlineUsers();
    mockFriendIds.mockReset();
    mockIo.to.mockClear();
    mockIo.to.mockReturnValue({
      emit: vi.fn(),
    });
  });

  it('marks a user online on their first connection and emits online to friends', async () => {
    const socket = createSocket('user-1');
    const friendEmit = vi.fn();
    mockFriendIds.mockResolvedValue(['friend-1']);
    mockIo.to.mockReturnValue({ emit: friendEmit });

    registerPresenceSocket(socket);
    await Promise.resolve();

    expect(isUserOnline('user-1')).toBe(true);
    expect(mockFriendIds).toHaveBeenCalledWith('user-1');
    expect(mockIo.to).toHaveBeenCalledWith(['user:friend-1']);
    expect(friendEmit).toHaveBeenCalledWith('presence:online', { userId: 'user-1' });
  });

  it('does not emit a second online event for additional connections from the same user', async () => {
    const firstSocket = createSocket('user-1');
    const secondSocket = createSocket('user-1');
    const friendEmit = vi.fn();

    mockFriendIds.mockResolvedValue(['friend-1']);
    mockIo.to.mockReturnValue({ emit: friendEmit });

    registerPresenceSocket(firstSocket);
    registerPresenceSocket(secondSocket);
    await Promise.resolve();

    expect(isUserOnline('user-1')).toBe(true);
    expect(friendEmit).toHaveBeenCalledTimes(1);
  });

  it('keeps the user online until the last connection disconnects', async () => {
    const firstSocket = createSocket('user-1');
    const secondSocket = createSocket('user-1');
    const friendEmit = vi.fn();

    mockFriendIds.mockResolvedValue(['friend-1']);
    mockIo.to.mockReturnValue({ emit: friendEmit });

    registerPresenceSocket(firstSocket);
    registerPresenceSocket(secondSocket);
    await Promise.resolve();

    const firstDisconnect = firstSocket.getHandler('disconnect');
    expect(typeof firstDisconnect).toBe('function');

    await firstDisconnect();
    expect(isUserOnline('user-1')).toBe(true);
    expect(friendEmit).toHaveBeenCalledTimes(1);

    const secondDisconnect = secondSocket.getHandler('disconnect');
    await secondDisconnect();
    expect(isUserOnline('user-1')).toBe(false);
    expect(friendEmit).toHaveBeenCalledTimes(2);
  });

  it('does not emit presence events to non-friends', async () => {
    const socket = createSocket('user-1');
    const friendEmit = vi.fn();

    mockFriendIds.mockResolvedValue([]);
    mockIo.to.mockReturnValue({ emit: friendEmit });

    registerPresenceSocket(socket);
    await Promise.resolve();

    expect(isUserOnline('user-1')).toBe(true);
    expect(mockIo.to).not.toHaveBeenCalled();
    expect(friendEmit).not.toHaveBeenCalled();
  });
});
