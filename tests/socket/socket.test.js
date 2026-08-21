import http from 'node:http';

import bcrypt from 'bcryptjs';
import { io as createClient } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import app from '../../src/app.js';
import { createSocketServer } from '../../src/sockets/index.js';
import { prisma } from '../../src/db/prisma.js';

const TEST_PASSWORD = 'StrongPassword123!';

let server;
let io;

async function createTestUser({ username, email, password = TEST_PASSWORD }) {
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });
}

async function loginUser({ email, password = TEST_PASSWORD }) {
  const response = await fetch(`http://localhost:${server.address().port}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  expect(response.status).toBe(200);

  const cookies = response.headers.getSetCookie();

  return cookies.map((cookie) => cookie.split(';')[0]).join('; ');
}

function connectSocket(cookie) {
  return createClient(`http://localhost:${server.address().port}`, {
    transports: ['websocket'],
    extraHeaders: {
      Cookie: cookie,
    },
  });
}

function waitForConnect(socket) {
  return new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
}

function waitForConnectError(socket) {
  return new Promise((resolve) => {
    socket.once('connect_error', resolve);
  });
}

function waitForEvent(socket, event) {
  return new Promise((resolve) => {
    socket.once(event, resolve);
  });
}

async function closeSocket(socket) {
  if (!socket) {
    return;
  }

  if (socket.connected) {
    socket.disconnect();
  }

  await new Promise((resolve) => {
    if (socket.disconnected) {
      resolve();
      return;
    }

    socket.once('disconnect', resolve);
  });
}

describe('Socket.IO', () => {
  beforeAll(async () => {
    server = http.createServer(app);
    io = createSocketServer(server);

    await new Promise((resolve) => {
      server.listen(0, resolve);
    });
  });

  afterAll(async () => {
    io.close();

    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.conversationMember.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.conversationMember.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('authentication', () => {
    it('accepts a valid authenticated connection', async () => {
      const user = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const cookie = await loginUser({
        email: user.email,
      });

      const socket = connectSocket(cookie);

      await waitForConnect(socket);

      expect(socket.connected).toBe(true);

      await closeSocket(socket);
    });

    it('rejects a connection without authentication', async () => {
      const socket = connectSocket('');

      const error = await waitForConnectError(socket);

      expect(error.message).toBe('Authentication required.');

      await closeSocket(socket);
    });

    it('rejects an invalid access token', async () => {
      const socket = createClient(`http://localhost:${server.address().port}`, {
        transports: ['websocket'],
        extraHeaders: {
          Cookie: 'accessToken=invalid-token',
        },
      });

      const error = await waitForConnectError(socket);

      expect(error.message).toBe('Authentication required.');

      await closeSocket(socket);
    });

    it('rejects a token belonging to a deleted user', async () => {
      const user = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const cookie = await loginUser({
        email: user.email,
      });

      await prisma.user.delete({
        where: {
          id: user.id,
        },
      });

      const socket = connectSocket(cookie);

      const error = await waitForConnectError(socket);

      expect(error.message).toBe('Authentication required.');

      await closeSocket(socket);
    });
  });

  describe('conversation rooms', () => {
    it('allows a conversation member to join a conversation', async () => {
      const user = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const otherUser = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const conversation = await prisma.conversation.create({
        data: {
          type: 'DIRECT',
          directKey: [user.id, otherUser.id].sort().join(':'),
          createdById: user.id,
          members: {
            create: [
              {
                userId: user.id,
                role: 'MEMBER',
              },
              {
                userId: otherUser.id,
                role: 'MEMBER',
              },
            ],
          },
        },
      });

      const cookie = await loginUser({
        email: user.email,
      });

      const socket = connectSocket(cookie);

      await waitForConnect(socket);

      const resultPromise = new Promise((resolve) => {
        socket.emit('conversation:join', conversation.id, resolve);
      });

      const result = await resultPromise;

      expect(result).toEqual({
        success: true,
        conversationId: conversation.id,
      });

      await closeSocket(socket);
    });

    it('rejects a non-member from joining a conversation', async () => {
      const alice = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const bob = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const charlie = await createTestUser({
        username: 'charlie',
        email: 'charlie@example.com',
      });

      const conversation = await prisma.conversation.create({
        data: {
          type: 'DIRECT',
          directKey: [alice.id, bob.id].sort().join(':'),
          createdById: alice.id,
          members: {
            create: [
              {
                userId: alice.id,
                role: 'MEMBER',
              },
              {
                userId: bob.id,
                role: 'MEMBER',
              },
            ],
          },
        },
      });

      const cookie = await loginUser({
        email: charlie.email,
      });

      const socket = connectSocket(cookie);

      await waitForConnect(socket);

      const result = await new Promise((resolve) => {
        socket.emit('conversation:join', conversation.id, resolve);
      });

      expect(result).toEqual({
        success: false,
        message: 'You are not a member of this conversation.',
      });

      await closeSocket(socket);
    });

    it('allows a member to leave a conversation', async () => {
      const user = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const otherUser = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const conversation = await prisma.conversation.create({
        data: {
          type: 'DIRECT',
          directKey: [user.id, otherUser.id].sort().join(':'),
          createdById: user.id,
          members: {
            create: [
              {
                userId: user.id,
                role: 'MEMBER',
              },
              {
                userId: otherUser.id,
                role: 'MEMBER',
              },
            ],
          },
        },
      });

      const cookie = await loginUser({
        email: user.email,
      });

      const socket = connectSocket(cookie);

      await waitForConnect(socket);

      const joinResult = await new Promise((resolve) => {
        socket.emit('conversation:join', conversation.id, resolve);
      });

      expect(joinResult.success).toBe(true);

      const leaveResult = await new Promise((resolve) => {
        socket.emit('conversation:leave', conversation.id, resolve);
      });

      expect(leaveResult).toEqual({
        success: true,
        conversationId: conversation.id,
      });

      await closeSocket(socket);
    });
  });
});
