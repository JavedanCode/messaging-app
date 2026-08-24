import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIo = {
  to: vi.fn(() => ({
    emit: vi.fn(),
  })),
};

vi.mock('../../src/sockets/io.js', () => ({
  getSocketServer: () => mockIo,
}));

import {
  emitFriendRequestCreated,
  emitFriendRequestAccepted,
  emitFriendRequestRejected,
  emitFriendRemoved,
} from '../../src/sockets/friendship.socket.js';

describe('Friendship socket events', () => {
  beforeEach(() => {
    mockIo.to.mockClear();
  });

  it('emits a request event to the receiver', () => {
    const emit = vi.fn();
    mockIo.to.mockReturnValue({ emit });

    emitFriendRequestCreated({ id: 'friendship-1', requesterId: 'user-1', receiverId: 'user-2' });

    expect(mockIo.to).toHaveBeenCalledWith(['user:user-2']);
    expect(emit).toHaveBeenCalledWith('friendship:request', {
      id: 'friendship-1',
      requesterId: 'user-1',
      receiverId: 'user-2',
    });
  });

  it('emits an accepted event to both users', () => {
    const emit = vi.fn();
    mockIo.to.mockReturnValue({ emit });

    emitFriendRequestAccepted({ id: 'friendship-1', requesterId: 'user-1', receiverId: 'user-2' });

    expect(mockIo.to).toHaveBeenCalledWith(['user:user-1', 'user:user-2']);
    expect(emit).toHaveBeenCalledWith('friendship:accepted', {
      id: 'friendship-1',
      requesterId: 'user-1',
      receiverId: 'user-2',
    });
  });

  it('emits a rejected event to both users', () => {
    const emit = vi.fn();
    mockIo.to.mockReturnValue({ emit });

    emitFriendRequestRejected({ id: 'friendship-1', requesterId: 'user-1', receiverId: 'user-2' });

    expect(mockIo.to).toHaveBeenCalledWith(['user:user-1', 'user:user-2']);
    expect(emit).toHaveBeenCalledWith('friendship:rejected', {
      id: 'friendship-1',
      requesterId: 'user-1',
      receiverId: 'user-2',
    });
  });

  it('emits a removed event to both users', () => {
    const emit = vi.fn();
    mockIo.to.mockReturnValue({ emit });

    emitFriendRemoved('user-1', 'user-2');

    expect(mockIo.to).toHaveBeenCalledWith(['user:user-1', 'user:user-2']);
    expect(emit).toHaveBeenCalledWith('friendship:removed', {
      userId: 'user-1',
      friendId: 'user-2',
    });
  });
});
