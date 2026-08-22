import bcrypt from 'bcryptjs';
import request from 'supertest';

import { prisma } from '../../src/db/prisma.js';
import { resetRateLimiters } from '../../src/middleware/rate-limit.js';
import app from '../../src/app.js';

async function createTestUser({ username, email, password = 'StrongPassword123!' }) {
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

async function loginUser(email, password = 'StrongPassword123!') {
  const agent = request.agent(app);

  const response = await agent.post('/auth/login').send({
    email,
    password,
  });

  expect(response.status).toBe(200);

  return agent;
}

async function createDirectConversation(userAId, userBId) {
  return prisma.conversation.create({
    data: {
      type: 'DIRECT',
      directKey: [userAId, userBId].sort().join(':'),
      createdById: userAId,
      members: {
        create: [
          {
            userId: userAId,
            role: 'MEMBER',
          },
          {
            userId: userBId,
            role: 'MEMBER',
          },
        ],
      },
    },
  });
}

describe('Message API', () => {
  beforeEach(async () => {
    await resetRateLimiters();

    await prisma.message.deleteMany();
    await prisma.conversationMember.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.message.deleteMany();
    await prisma.conversationMember.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /conversations/:conversationId/messages', () => {
    it('sends a text message', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const conversation = await createDirectConversation(userA.id, userB.id);

      const agent = await loginUser(userA.email);

      const response = await agent.post(`/conversations/${conversation.id}/messages`).send({
        content: 'Hello Bob!',
      });

      expect(response.status).toBe(201);

      expect(response.body).toMatchObject({
        success: true,
        message: {
          id: expect.any(String),
          type: 'TEXT',
          content: 'Hello Bob!',
          sender: {
            id: userA.id,
            username: 'alice',
            displayName: null,
            avatarUrl: null,
          },
        },
      });

      expect(response.body.message.senderId).toBe(userA.id);
    });

    it('creates the message with the authenticated user as the sender', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const conversation = await createDirectConversation(userA.id, userB.id);

      const agent = await loginUser(userA.email);

      const response = await agent.post(`/conversations/${conversation.id}/messages`).send({
        content: 'This is my message.',
      });

      expect(response.status).toBe(201);

      const message = await prisma.message.findUnique({
        where: {
          id: response.body.message.id,
        },
      });

      expect(message).not.toBeNull();
      expect(message.senderId).toBe(userA.id);
      expect(message.conversationId).toBe(conversation.id);
      expect(message.type).toBe('TEXT');
      expect(message.content).toBe('This is my message.');
    });

    it('trims surrounding whitespace from the message content', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const conversation = await createDirectConversation(userA.id, userB.id);

      const agent = await loginUser(userA.email);

      const response = await agent.post(`/conversations/${conversation.id}/messages`).send({
        content: '   Hello Bob!   ',
      });

      expect(response.status).toBe(201);
      expect(response.body.message.content).toBe('Hello Bob!');
    });

    it('updates lastMessageAt when a message is sent', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const conversation = await createDirectConversation(userA.id, userB.id);

      const agent = await loginUser(userA.email);

      const response = await agent.post(`/conversations/${conversation.id}/messages`).send({
        content: 'Updating the conversation timestamp.',
      });

      expect(response.status).toBe(201);

      const updatedConversation = await prisma.conversation.findUnique({
        where: {
          id: conversation.id,
        },
        select: {
          lastMessageAt: true,
        },
      });

      expect(updatedConversation.lastMessageAt).not.toBeNull();

      expect(updatedConversation.lastMessageAt.getTime()).toBe(
        new Date(response.body.message.createdAt).getTime(),
      );
    });

    it('rejects an empty message', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const conversation = await createDirectConversation(userA.id, userB.id);

      const agent = await loginUser(userA.email);

      const response = await agent.post(`/conversations/${conversation.id}/messages`).send({
        content: '   ',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      const messages = await prisma.message.findMany();

      expect(messages).toHaveLength(0);
    });

    it('rejects a message longer than 5000 characters', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const conversation = await createDirectConversation(userA.id, userB.id);

      const agent = await loginUser(userA.email);

      const response = await agent.post(`/conversations/${conversation.id}/messages`).send({
        content: 'a'.repeat(5001),
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      const messages = await prisma.message.findMany();

      expect(messages).toHaveLength(0);
    });

    it('rejects a non-member from sending a message', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const userC = await createTestUser({
        username: 'charlie',
        email: 'charlie@example.com',
      });

      const conversation = await createDirectConversation(userA.id, userB.id);

      const agent = await loginUser(userC.email);

      const response = await agent.post(`/conversations/${conversation.id}/messages`).send({
        content: 'I should not be able to send this.',
      });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      const messages = await prisma.message.findMany();

      expect(messages).toHaveLength(0);
    });

    it('returns 404 for a nonexistent conversation', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const agent = await loginUser(userA.email);

      const nonexistentConversationId = '00000000-0000-0000-0000-000000000000';

      const response = await agent
        .post(`/conversations/${nonexistentConversationId}/messages`)
        .send({
          content: 'This conversation does not exist.',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('rejects an invalid conversation ID', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const agent = await loginUser(userA.email);

      const response = await agent.post('/conversations/not-a-uuid/messages').send({
        content: 'Hello!',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('rejects an unauthenticated request', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const conversation = await createDirectConversation(userA.id, userB.id);

      const response = await request(app).post(`/conversations/${conversation.id}/messages`).send({
        content: 'Hello!',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /conversations/:conversationId/messages', () => {
    it('returns messages from the conversation', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const conversation = await createDirectConversation(userA.id, userB.id);

      await prisma.message.createMany({
        data: [
          {
            conversationId: conversation.id,
            senderId: userA.id,
            type: 'TEXT',
            content: 'Hello Bob!',
          },
          {
            conversationId: conversation.id,
            senderId: userB.id,
            type: 'TEXT',
            content: 'Hello Alice!',
          },
        ],
      });

      const agent = await loginUser(userA.email);

      const response = await agent.get(`/conversations/${conversation.id}/messages`);

      expect(response.status).toBe(200);

      expect(response.body).toMatchObject({
        success: true,
      });

      expect(response.body.messages).toHaveLength(2);
      expect(response.body.messages[0].sender).toBeDefined();
      expect(response.body.messages[1].sender).toBeDefined();
    });

    it('returns messages newest first', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const conversation = await createDirectConversation(userA.id, userB.id);

      const firstMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userA.id,
          type: 'TEXT',
          content: 'First message',
        },
      });

      const secondMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userB.id,
          type: 'TEXT',
          content: 'Second message',
        },
      });

      const agent = await loginUser(userA.email);

      const response = await agent.get(`/conversations/${conversation.id}/messages`);

      expect(response.status).toBe(200);

      expect(response.body.messages[0].id).toBe(secondMessage.id);
      expect(response.body.messages[1].id).toBe(firstMessage.id);
    });

    it('respects the limit query parameter', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const conversation = await createDirectConversation(userA.id, userB.id);

      await prisma.message.createMany({
        data: Array.from({ length: 5 }, (_, index) => ({
          conversationId: conversation.id,
          senderId: userA.id,
          type: 'TEXT',
          content: `Message ${index + 1}`,
        })),
      });

      const agent = await loginUser(userA.email);

      const response = await agent.get(`/conversations/${conversation.id}/messages`).query({
        limit: 2,
      });

      expect(response.status).toBe(200);
      expect(response.body.messages).toHaveLength(2);
    });

    it('returns an empty array when the conversation has no messages', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const conversation = await createDirectConversation(userA.id, userB.id);

      const agent = await loginUser(userA.email);

      const response = await agent.get(`/conversations/${conversation.id}/messages`);

      expect(response.status).toBe(200);

      expect(response.body).toMatchObject({
        success: true,
        messages: [],
      });
    });

    it('rejects a non-member from viewing messages', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const userC = await createTestUser({
        username: 'charlie',
        email: 'charlie@example.com',
      });

      const conversation = await createDirectConversation(userA.id, userB.id);

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userA.id,
          type: 'TEXT',
          content: 'Private message',
        },
      });

      const agent = await loginUser(userC.email);

      const response = await agent.get(`/conversations/${conversation.id}/messages`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('returns 404 for a nonexistent conversation', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const agent = await loginUser(userA.email);

      const nonexistentConversationId = '00000000-0000-0000-0000-000000000000';

      const response = await agent.get(`/conversations/${nonexistentConversationId}/messages`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('rejects an invalid conversation ID', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const agent = await loginUser(userA.email);

      const response = await agent.get('/conversations/not-a-uuid/messages');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('rejects an unauthenticated request', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const conversation = await createDirectConversation(userA.id, userB.id);

      const response = await request(app).get(`/conversations/${conversation.id}/messages`);

      expect(response.status).toBe(401);
    });

    it('rejects a limit below 1', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const conversation = await createDirectConversation(userA.id, userB.id);

      const agent = await loginUser(userA.email);

      const response = await agent.get(`/conversations/${conversation.id}/messages`).query({
        limit: 0,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('rejects a limit above 100', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const conversation = await createDirectConversation(userA.id, userB.id);

      const agent = await loginUser(userA.email);

      const response = await agent.get(`/conversations/${conversation.id}/messages`).query({
        limit: 101,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /conversations/:conversationId/messages/attachment', () => {
    it('uploads an image attachment', async () => {
      const user = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const otherUser = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const agent = await loginUser(user.email);

      const conversation = await createDirectConversation(user.id, otherUser.id);

      const response = await agent
        .post(`/conversations/${conversation.id}/messages/attachment`)
        .attach('file', Buffer.from('fake png content'), {
          filename: 'photo.png',
          contentType: 'image/png',
        });

      expect(response.status).toBe(201);

      expect(response.body).toMatchObject({
        success: true,
        message: {
          conversationId: conversation.id,
          senderId: user.id,
          type: 'IMAGE',
          attachmentName: 'photo.png',
          attachmentMimeType: 'image/png',
        },
      });

      expect(response.body.message.attachmentSize).toBeGreaterThan(0);
      expect(response.body.message.content).toBeNull();
      expect(response.body.message.attachmentUrl).toMatch(/^attachments\/[0-9a-f-]{36}\.png$/);
    });

    it('uploads a file attachment', async () => {
      const user = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const otherUser = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const agent = await loginUser(user.email);

      const conversation = await createDirectConversation(user.id, otherUser.id);

      const response = await agent
        .post(`/conversations/${conversation.id}/messages/attachment`)
        .attach('file', Buffer.from('hello world'), {
          filename: 'document.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(201);

      expect(response.body).toMatchObject({
        success: true,
        message: {
          conversationId: conversation.id,
          senderId: user.id,
          type: 'FILE',
          attachmentName: 'document.txt',
          attachmentMimeType: 'text/plain',
        },
      });

      expect(response.body.message.attachmentSize).toBeGreaterThan(0);
      expect(response.body.message.content).toBeNull();
      expect(response.body.message.attachmentUrl).toMatch(/^attachments\/[0-9a-f-]{36}\.txt$/);
    });

    it('creates the attachment message with the authenticated user as the sender', async () => {
      const user = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const otherUser = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const agent = await loginUser(user.email);

      const conversation = await createDirectConversation(user.id, otherUser.id);

      const response = await agent
        .post(`/conversations/${conversation.id}/messages/attachment`)
        .attach('file', Buffer.from('hello'), {
          filename: 'document.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(201);

      const message = await prisma.message.findUnique({
        where: {
          id: response.body.message.id,
        },
      });

      expect(message.senderId).toBe(user.id);
      expect(message.conversationId).toBe(conversation.id);
    });

    it('updates lastMessageAt when an attachment is uploaded', async () => {
      const user = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const otherUser = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const agent = await loginUser(user.email);

      const conversation = await createDirectConversation(user.id, otherUser.id);

      const before = new Date();

      const response = await agent
        .post(`/conversations/${conversation.id}/messages/attachment`)
        .attach('file', Buffer.from('hello'), {
          filename: 'document.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(201);

      const updatedConversation = await prisma.conversation.findUnique({
        where: {
          id: conversation.id,
        },
      });

      expect(updatedConversation.lastMessageAt).not.toBeNull();
      expect(updatedConversation.lastMessageAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('rejects an attachment without a file', async () => {
      const user = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const otherUser = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const agent = await loginUser(user.email);

      const conversation = await createDirectConversation(user.id, otherUser.id);

      const response = await agent.post(`/conversations/${conversation.id}/messages/attachment`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('rejects an unsupported file type', async () => {
      const user = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const otherUser = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const agent = await loginUser(user.email);

      const conversation = await createDirectConversation(user.id, otherUser.id);

      const response = await agent
        .post(`/conversations/${conversation.id}/messages/attachment`)
        .attach('file', Buffer.from('malicious content'), {
          filename: 'program.exe',
          contentType: 'application/x-msdownload',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
    });

    it('rejects an attachment larger than 4 MB', async () => {
      const user = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const otherUser = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const agent = await loginUser(user.email);

      const conversation = await createDirectConversation(user.id, otherUser.id);

      const oversizedFile = Buffer.alloc(4 * 1024 * 1024 + 1);

      const response = await agent
        .post(`/conversations/${conversation.id}/messages/attachment`)
        .attach('file', oversizedFile, {
          filename: 'large.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('rejects a non-member from uploading an attachment', async () => {
      const user = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const otherUser = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const outsider = await createTestUser({
        username: 'charlie',
        email: 'charlie@example.com',
      });

      const outsiderAgent = await loginUser(outsider.email);

      const conversation = await createDirectConversation(user.id, otherUser.id);

      const response = await outsiderAgent
        .post(`/conversations/${conversation.id}/messages/attachment`)
        .attach('file', Buffer.from('hello'), {
          filename: 'document.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('returns 404 for a nonexistent conversation', async () => {
      const user = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const agent = await loginUser(user.email);

      const nonexistentConversationId = '00000000-0000-0000-0000-000000000000';

      const response = await agent
        .post(`/conversations/${nonexistentConversationId}/messages/attachment`)
        .attach('file', Buffer.from('hello'), {
          filename: 'document.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('rejects an invalid conversation ID', async () => {
      const user = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const agent = await loginUser(user.email);

      const response = await agent
        .post('/conversations/not-a-uuid/messages/attachment')
        .attach('file', Buffer.from('hello'), {
          filename: 'document.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('rejects an unauthenticated request', async () => {
      const response = await request(app)
        .post('/conversations/00000000-0000-0000-0000-000000000000/messages/attachment')
        .attach('file', Buffer.from('hello'), {
          filename: 'document.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /conversations/:conversationId/messages/:messageId', () => {
    it('deletes a text message created by the authenticated user', async () => {
      const user = await createTestUser({
        username: 'deleteuser',
        email: 'deleteuser@example.com',
      });

      const otherUser = await createTestUser({
        username: 'deleteother',
        email: 'deleteother@example.com',
      });

      const agent = await loginUser(user.email);
      const conversation = await createDirectConversation(user.id, otherUser.id);

      const messageResponse = await agent.post(`/conversations/${conversation.id}/messages`).send({
        content: 'Message to delete',
      });

      expect(messageResponse.status).toBe(201);

      const messageId = messageResponse.body.message.id;

      const response = await agent.delete(
        `/conversations/${conversation.id}/messages/${messageId}`,
      );

      expect(response.status).toBe(204);

      const message = await prisma.message.findUnique({
        where: {
          id: messageId,
        },
      });

      expect(message).toBeNull();
    });

    it('deletes an attachment message created by the authenticated user', async () => {
      const user = await createTestUser({
        username: 'deleteattachment',
        email: 'deleteattachment@example.com',
      });

      const otherUser = await createTestUser({
        username: 'deleteattachmentother',
        email: 'deleteattachmentother@example.com',
      });

      const agent = await loginUser(user.email);
      const conversation = await createDirectConversation(user.id, otherUser.id);

      const uploadResponse = await agent
        .post(`/conversations/${conversation.id}/messages/attachment`)
        .attach('file', Buffer.from('attachment to delete'), 'document.txt');

      expect(uploadResponse.status).toBe(201);

      const messageId = uploadResponse.body.message.id;

      const response = await agent.delete(
        `/conversations/${conversation.id}/messages/${messageId}`,
      );

      expect(response.status).toBe(204);

      const message = await prisma.message.findUnique({
        where: {
          id: messageId,
        },
      });

      expect(message).toBeNull();
    });

    it('rejects a non-member from deleting a message', async () => {
      const owner = await createTestUser({
        username: 'deleteowner',
        email: 'deleteowner@example.com',
      });

      const member = await createTestUser({
        username: 'deletemember',
        email: 'deletemember@example.com',
      });

      const outsider = await createTestUser({
        username: 'deleteoutsider',
        email: 'deleteoutsider@example.com',
      });

      const ownerAgent = await loginUser(owner.email);
      const outsiderAgent = await loginUser(outsider.email);

      const conversation = await createDirectConversation(owner.id, member.id);

      const messageResponse = await ownerAgent
        .post(`/conversations/${conversation.id}/messages`)
        .send({
          content: 'Protected message',
        });

      expect(messageResponse.status).toBe(201);

      const messageId = messageResponse.body.message.id;

      const response = await outsiderAgent.delete(
        `/conversations/${conversation.id}/messages/${messageId}`,
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    }, 10000);

    it("rejects another conversation member from deleting someone else's message", async () => {
      const owner = await createTestUser({
        username: 'deleteowner2',
        email: 'deleteowner2@example.com',
      });

      const member = await createTestUser({
        username: 'deletemember2',
        email: 'deletemember2@example.com',
      });

      const ownerAgent = await loginUser(owner.email);

      const conversation = await createDirectConversation(owner.id, member.id);

      const messageResponse = await ownerAgent
        .post(`/conversations/${conversation.id}/messages`)
        .send({
          content: 'Owner message',
        });

      expect(messageResponse.status).toBe(201);

      const messageId = messageResponse.body.message.id;

      /*
       * Authenticate the member directly by creating the session/token
       * through the same mechanism used by the application.
       */
      const memberAgent = await loginUser(member.email);

      const response = await memberAgent.delete(
        `/conversations/${conversation.id}/messages/${messageId}`,
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      const message = await prisma.message.findUnique({
        where: {
          id: messageId,
        },
      });

      expect(message).not.toBeNull();
    }, 10000);

    it('returns 404 for a nonexistent message', async () => {
      const user = await createTestUser({
        username: 'deletenotfound',
        email: 'deletenotfound@example.com',
      });

      const otherUser = await createTestUser({
        username: 'deletenotfoundother',
        email: 'deletenotfoundother@example.com',
      });

      const agent = await loginUser(user.email);
      const conversation = await createDirectConversation(user.id, otherUser.id);

      const response = await agent.delete(
        `/conversations/${conversation.id}/messages/${crypto.randomUUID()}`,
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('returns 404 for a nonexistent conversation', async () => {
      const user = await createTestUser({
        username: 'deletenoconversation',
        email: 'deletenoconversation@example.com',
      });

      const agent = await loginUser(user.email);

      const response = await agent.delete(
        `/conversations/${crypto.randomUUID()}/messages/${crypto.randomUUID()}`,
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('rejects an invalid conversation ID', async () => {
      const user = await createTestUser({
        username: 'deleteinvalidconversation',
        email: 'deleteinvalidconversation@example.com',
      });

      const agent = await loginUser(user.email);

      const response = await agent.delete(
        `/conversations/not-a-uuid/messages/${crypto.randomUUID()}`,
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('rejects an invalid message ID', async () => {
      const user = await createTestUser({
        username: 'deleteinvalidmessage',
        email: 'deleteinvalidmessage@example.com',
      });

      const agent = await loginUser(user.email);

      const response = await agent.delete(
        `/conversations/${crypto.randomUUID()}/messages/not-a-uuid`,
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('rejects an unauthenticated request', async () => {
      const response = await request(app).delete(
        `/conversations/${crypto.randomUUID()}/messages/${crypto.randomUUID()}`,
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
