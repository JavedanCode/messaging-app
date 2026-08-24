import http from 'node:http';

import bcrypt from 'bcryptjs';
import { io as createClient } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import app from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import { generateAccessToken } from '../../src/services/token.service.js';
import { createSocketServer } from '../../src/sockets/index.js';

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

function createAuthCookie(userId) {
  const accessToken = generateAccessToken(userId);

  return `accessToken=${encodeURIComponent(accessToken)}`;
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

  socket.removeAllListeners();
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

      const cookie = createAuthCookie(user.id);
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

      const cookie = createAuthCookie(user.id);

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

      const cookie = createAuthCookie(user.id);
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

      const cookie = createAuthCookie(charlie.id);
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

      const cookie = createAuthCookie(user.id);
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

  describe('message events', () => {
    it('broadcasts a new message to members in the conversation room', async () => {
      const alice = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const bob = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
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

      const aliceCookie = createAuthCookie(alice.id);
      const bobCookie = createAuthCookie(bob.id);

      const aliceSocket = connectSocket(aliceCookie);
      const bobSocket = connectSocket(bobCookie);

      try {
        await Promise.all([waitForConnect(aliceSocket), waitForConnect(bobSocket)]);

        const [joinAlice, joinBob] = await Promise.all([
          new Promise((resolve) => {
            aliceSocket.emit('conversation:join', conversation.id, resolve);
          }),
          new Promise((resolve) => {
            bobSocket.emit('conversation:join', conversation.id, resolve);
          }),
        ]);

        expect(joinAlice).toEqual({
          success: true,
          conversationId: conversation.id,
        });

        expect(joinBob).toEqual({
          success: true,
          conversationId: conversation.id,
        });

        const aliceMessagePromise = waitForEvent(aliceSocket, 'message:new');

        const bobMessagePromise = waitForEvent(bobSocket, 'message:new');

        const response = await fetch(
          `http://localhost:${server.address().port}/conversations/${conversation.id}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: aliceCookie,
            },
            body: JSON.stringify({
              content: 'Hello Bob!',
            }),
          },
        );

        expect(response.status).toBe(201);

        const responseBody = await response.json();

        const [aliceMessage, bobMessage] = await Promise.all([
          aliceMessagePromise,
          bobMessagePromise,
        ]);

        expect(aliceMessage).toMatchObject({
          id: responseBody.message.id,
          conversationId: conversation.id,
          senderId: alice.id,
          type: 'TEXT',
          content: 'Hello Bob!',
          sender: {
            id: alice.id,
            username: 'alice',
            displayName: null,
            avatarUrl: null,
          },
        });

        expect(bobMessage).toEqual(aliceMessage);

        const persistedMessage = await prisma.message.findUnique({
          where: {
            id: responseBody.message.id,
          },
        });

        expect(persistedMessage).not.toBeNull();
        expect(persistedMessage.conversationId).toBe(conversation.id);
        expect(persistedMessage.senderId).toBe(alice.id);
        expect(persistedMessage.content).toBe('Hello Bob!');
      } finally {
        await closeSocket(aliceSocket);
        await closeSocket(bobSocket);
      }
    }, 15000);

    it('does not broadcast a message to a user outside the conversation', async () => {
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

      const aliceCookie = createAuthCookie(alice.id);
      const charlieCookie = createAuthCookie(charlie.id);

      const aliceSocket = connectSocket(aliceCookie);
      const charlieSocket = connectSocket(charlieCookie);

      try {
        await Promise.all([waitForConnect(aliceSocket), waitForConnect(charlieSocket)]);

        const joinResult = await new Promise((resolve) => {
          aliceSocket.emit('conversation:join', conversation.id, resolve);
        });

        expect(joinResult).toEqual({
          success: true,
          conversationId: conversation.id,
        });

        let charlieReceivedMessage = false;

        charlieSocket.once('message:new', () => {
          charlieReceivedMessage = true;
        });

        const response = await fetch(
          `http://localhost:${server.address().port}/conversations/${conversation.id}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: aliceCookie,
            },
            body: JSON.stringify({
              content: 'Private message',
            }),
          },
        );

        expect(response.status).toBe(201);

        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(charlieReceivedMessage).toBe(false);
      } finally {
        await closeSocket(aliceSocket);
        await closeSocket(charlieSocket);
      }
    }, 10000);

    it('broadcasts a message to a connected member who has not joined the room', async () => {
      const alice = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const bob = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
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

      const aliceCookie = createAuthCookie(alice.id);
      const bobCookie = createAuthCookie(bob.id);

      const aliceSocket = connectSocket(aliceCookie);
      const bobSocket = connectSocket(bobCookie);

      try {
        await Promise.all([waitForConnect(aliceSocket), waitForConnect(bobSocket)]);

        const joinResult = await new Promise((resolve) => {
          aliceSocket.emit('conversation:join', conversation.id, resolve);
        });

        expect(joinResult).toEqual({
          success: true,
          conversationId: conversation.id,
        });

        const bobMessagePromise = waitForEvent(bobSocket, 'message:new');

        const response = await fetch(
          `http://localhost:${server.address().port}/conversations/${conversation.id}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: aliceCookie,
            },
            body: JSON.stringify({
              content: 'Bob has not joined yet.',
            }),
          },
        );

        expect(response.status).toBe(201);

        const bobMessage = await bobMessagePromise;

        expect(bobMessage).toMatchObject({
          conversationId: conversation.id,
          senderId: alice.id,
          type: 'TEXT',
          content: 'Bob has not joined yet.',
        });
      } finally {
        await closeSocket(aliceSocket);
        await closeSocket(bobSocket);
      }
    }, 10000);

    it('broadcasts an updated message to members in the conversation room', async () => {
      const alice = await createTestUser({
        username: 'updatealice',
        email: 'updatealice@example.com',
      });

      const bob = await createTestUser({
        username: 'updatebob',
        email: 'updatebob@example.com',
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

      const aliceCookie = createAuthCookie(alice.id);
      const bobCookie = createAuthCookie(bob.id);

      const aliceSocket = connectSocket(aliceCookie);
      const bobSocket = connectSocket(bobCookie);

      try {
        await Promise.all([waitForConnect(aliceSocket), waitForConnect(bobSocket)]);

        const [joinAlice, joinBob] = await Promise.all([
          new Promise((resolve) => {
            aliceSocket.emit('conversation:join', conversation.id, resolve);
          }),
          new Promise((resolve) => {
            bobSocket.emit('conversation:join', conversation.id, resolve);
          }),
        ]);

        expect(joinAlice).toEqual({
          success: true,
          conversationId: conversation.id,
        });

        expect(joinBob).toEqual({
          success: true,
          conversationId: conversation.id,
        });

        const createResponse = await fetch(
          `http://localhost:${server.address().port}/conversations/${conversation.id}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: aliceCookie,
            },
            body: JSON.stringify({
              content: 'Original message',
            }),
          },
        );

        expect(createResponse.status).toBe(201);

        const createdMessage = await createResponse.json();
        const messageId = createdMessage.message.id;

        const aliceUpdatePromise = waitForEvent(aliceSocket, 'message:updated');

        const bobUpdatePromise = waitForEvent(bobSocket, 'message:updated');

        const updateResponse = await fetch(
          `http://localhost:${server.address().port}/conversations/${conversation.id}/messages/${messageId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Cookie: aliceCookie,
            },
            body: JSON.stringify({
              content: 'Updated message',
            }),
          },
        );

        expect(updateResponse.status).toBe(200);

        const responseBody = await updateResponse.json();

        const [aliceMessage, bobMessage] = await Promise.all([
          aliceUpdatePromise,
          bobUpdatePromise,
        ]);

        expect(aliceMessage).toMatchObject({
          id: messageId,
          conversationId: conversation.id,
          senderId: alice.id,
          type: 'TEXT',
          content: 'Updated message',
        });

        expect(bobMessage).toEqual(aliceMessage);

        expect(responseBody.message).toMatchObject({
          id: messageId,
          conversationId: conversation.id,
          senderId: alice.id,
          type: 'TEXT',
          content: 'Updated message',
        });
      } finally {
        await closeSocket(aliceSocket);
        await closeSocket(bobSocket);
      }
    }, 15000);

    it('broadcasts a deleted message to conversation members', async () => {
      const alice = await createTestUser({
        username: 'deletealice',
        email: 'deletealice@example.com',
      });

      const bob = await createTestUser({
        username: 'deletebob',
        email: 'deletebob@example.com',
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

      const aliceCookie = createAuthCookie(alice.id);
      const bobCookie = createAuthCookie(bob.id);

      const aliceSocket = connectSocket(aliceCookie);
      const bobSocket = connectSocket(bobCookie);

      try {
        await Promise.all([waitForConnect(aliceSocket), waitForConnect(bobSocket)]);

        const createResponse = await fetch(
          `http://localhost:${server.address().port}/conversations/${conversation.id}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: aliceCookie,
            },
            body: JSON.stringify({
              content: 'Message to delete',
            }),
          },
        );

        expect(createResponse.status).toBe(201);

        const createdMessage = await createResponse.json();
        const messageId = createdMessage.message.id;

        const aliceEventPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Alice did not receive delete event'));
          }, 3000);

          aliceSocket.once('message:deleted', (event) => {
            clearTimeout(timeout);
            resolve(event);
          });
        });

        const bobEventPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Bob did not receive delete event'));
          }, 3000);

          bobSocket.once('message:deleted', (event) => {
            clearTimeout(timeout);
            resolve(event);
          });
        });

        const deleteResponse = await fetch(
          `http://localhost:${server.address().port}/conversations/${conversation.id}/messages/${messageId}`,
          {
            method: 'DELETE',
            headers: {
              Cookie: aliceCookie,
            },
          },
        );

        expect(deleteResponse.status).toBe(204);

        const [aliceEvent, bobEvent] = await Promise.all([aliceEventPromise, bobEventPromise]);

        expect(aliceEvent).toEqual({
          messageId,
          conversationId: conversation.id,
        });

        expect(bobEvent).toEqual({
          messageId,
          conversationId: conversation.id,
        });

        const deletedMessage = await prisma.message.findUnique({
          where: {
            id: messageId,
          },
        });

        expect(deletedMessage).toBeNull();
      } finally {
        await closeSocket(aliceSocket);
        await closeSocket(bobSocket);
      }
    }, 10000);
  });

  describe('typing indicators', () => {
    it('broadcasts typing:start to other members in the conversation room', async () => {
      const alice = await createTestUser({
        username: 'typingalice',
        email: 'typingalice@example.com',
      });

      const bob = await createTestUser({
        username: 'typingbob',
        email: 'typingbob@example.com',
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

      const aliceCookie = createAuthCookie(alice.id);
      const bobCookie = createAuthCookie(bob.id);

      const aliceSocket = connectSocket(aliceCookie);
      const bobSocket = connectSocket(bobCookie);

      try {
        await Promise.all([waitForConnect(aliceSocket), waitForConnect(bobSocket)]);

        const [aliceJoin, bobJoin] = await Promise.all([
          new Promise((resolve) => {
            aliceSocket.emit('conversation:join', conversation.id, resolve);
          }),
          new Promise((resolve) => {
            bobSocket.emit('conversation:join', conversation.id, resolve);
          }),
        ]);

        expect(aliceJoin).toEqual({
          success: true,
          conversationId: conversation.id,
        });

        expect(bobJoin).toEqual({
          success: true,
          conversationId: conversation.id,
        });

        const typingEvent = waitForEvent(bobSocket, 'typing:start');

        aliceSocket.emit('typing:start', conversation.id);

        await expect(typingEvent).resolves.toMatchObject({
          conversationId: conversation.id,
          userId: alice.id,
        });
      } finally {
        await closeSocket(aliceSocket);
        await closeSocket(bobSocket);
      }
    });

    it('broadcasts typing:stop to other members in the conversation room', async () => {
      const alice = await createTestUser({
        username: 'typingstopalice',
        email: 'typingstopalice@example.com',
      });

      const bob = await createTestUser({
        username: 'typingstopbob',
        email: 'typingstopbob@example.com',
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

      const aliceCookie = createAuthCookie(alice.id);
      const bobCookie = createAuthCookie(bob.id);

      const aliceSocket = connectSocket(aliceCookie);
      const bobSocket = connectSocket(bobCookie);

      try {
        await Promise.all([waitForConnect(aliceSocket), waitForConnect(bobSocket)]);

        const [aliceJoin, bobJoin] = await Promise.all([
          new Promise((resolve) => {
            aliceSocket.emit('conversation:join', conversation.id, resolve);
          }),
          new Promise((resolve) => {
            bobSocket.emit('conversation:join', conversation.id, resolve);
          }),
        ]);

        expect(aliceJoin).toEqual({
          success: true,
          conversationId: conversation.id,
        });

        expect(bobJoin).toEqual({
          success: true,
          conversationId: conversation.id,
        });

        const typingEvent = waitForEvent(bobSocket, 'typing:stop');

        aliceSocket.emit('typing:stop', conversation.id);

        await expect(typingEvent).resolves.toMatchObject({
          conversationId: conversation.id,
          userId: alice.id,
        });
      } finally {
        await closeSocket(aliceSocket);
        await closeSocket(bobSocket);
      }
    });

    it('does not send typing events back to the sender', async () => {
      const alice = await createTestUser({
        username: 'typingself',
        email: 'typingself@example.com',
      });

      const bob = await createTestUser({
        username: 'typingselfbob',
        email: 'typingselfbob@example.com',
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

      const aliceCookie = createAuthCookie(alice.id);
      const bobCookie = createAuthCookie(bob.id);

      const aliceSocket = connectSocket(aliceCookie);
      const bobSocket = connectSocket(bobCookie);

      try {
        await Promise.all([waitForConnect(aliceSocket), waitForConnect(bobSocket)]);

        const [aliceJoin, bobJoin] = await Promise.all([
          new Promise((resolve) => {
            aliceSocket.emit('conversation:join', conversation.id, resolve);
          }),
          new Promise((resolve) => {
            bobSocket.emit('conversation:join', conversation.id, resolve);
          }),
        ]);

        expect(aliceJoin).toEqual({
          success: true,
          conversationId: conversation.id,
        });

        expect(bobJoin).toEqual({
          success: true,
          conversationId: conversation.id,
        });

        let senderReceivedEvent = false;

        aliceSocket.once('typing:start', () => {
          senderReceivedEvent = true;
        });

        const receiverEvent = waitForEvent(bobSocket, 'typing:start');

        aliceSocket.emit('typing:start', conversation.id);

        await expect(receiverEvent).resolves.toMatchObject({
          conversationId: conversation.id,
          userId: alice.id,
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(senderReceivedEvent).toBe(false);
      } finally {
        await closeSocket(aliceSocket);
        await closeSocket(bobSocket);
      }
    });

    it('does not broadcast typing events from a non-member', async () => {
      const alice = await createTestUser({
        username: 'typingmember',
        email: 'typingmember@example.com',
      });

      const bob = await createTestUser({
        username: 'typingmemberbob',
        email: 'typingmemberbob@example.com',
      });

      const outsider = await createTestUser({
        username: 'typingoutsider',
        email: 'typingoutsider@example.com',
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

      const aliceCookie = createAuthCookie(alice.id);
      const outsiderCookie = createAuthCookie(outsider.id);

      const aliceSocket = connectSocket(aliceCookie);
      const outsiderSocket = connectSocket(outsiderCookie);

      try {
        await Promise.all([waitForConnect(aliceSocket), waitForConnect(outsiderSocket)]);

        const joinResult = await new Promise((resolve) => {
          aliceSocket.emit('conversation:join', conversation.id, resolve);
        });

        expect(joinResult).toEqual({
          success: true,
          conversationId: conversation.id,
        });

        let receivedEvent = false;

        aliceSocket.once('typing:start', () => {
          receivedEvent = true;
        });

        outsiderSocket.emit('typing:start', conversation.id);

        await new Promise((resolve) => setTimeout(resolve, 200));

        expect(receivedEvent).toBe(false);
      } finally {
        await closeSocket(aliceSocket);
        await closeSocket(outsiderSocket);
      }
    });
  });
});
