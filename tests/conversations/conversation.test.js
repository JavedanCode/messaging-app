import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { prisma } from '../../src/db/prisma.js';
import app from '../../src/app.js';
import { resetRateLimiters } from '../../src/middleware/rate-limit.js';

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

describe('Conversation API', () => {
  beforeEach(async () => {
    resetRateLimiters();

    await prisma.session.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversationMember.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /conversations', () => {
    describe('DIRECT conversations', () => {
      it('creates a direct conversation between two users', async () => {
        const userA = await createTestUser({
          username: 'alice',
          email: 'alice@example.com',
        });

        const userB = await createTestUser({
          username: 'bob',
          email: 'bob@example.com',
        });

        const agent = await loginUser(userA.email);

        const response = await agent.post('/conversations').send({
          type: 'DIRECT',
          userId: userB.id,
        });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);

        expect(response.body.conversation).toMatchObject({
          type: 'DIRECT',
          createdById: userA.id,
        });

        expect(response.body.conversation.directKey).toBeTruthy();
        expect(response.body.conversation.name).toBeNull();
        expect(response.body.conversation.members).toHaveLength(2);

        const memberIds = response.body.conversation.members.map((member) => member.userId);

        expect(memberIds).toContain(userA.id);
        expect(memberIds).toContain(userB.id);

        const members = await prisma.conversationMember.findMany({
          where: {
            conversationId: response.body.conversation.id,
          },
        });

        expect(members).toHaveLength(2);
      });

      it('returns the existing direct conversation instead of creating a duplicate', async () => {
        const userA = await createTestUser({
          username: 'alice',
          email: 'alice@example.com',
        });

        const userB = await createTestUser({
          username: 'bob',
          email: 'bob@example.com',
        });

        const agent = await loginUser(userA.email);

        const firstResponse = await agent.post('/conversations').send({
          type: 'DIRECT',
          userId: userB.id,
        });

        const secondResponse = await agent.post('/conversations').send({
          type: 'DIRECT',
          userId: userB.id,
        });

        expect(firstResponse.status).toBe(201);
        expect(secondResponse.status).toBe(201);

        expect(secondResponse.body.conversation.id).toBe(firstResponse.body.conversation.id);

        const conversations = await prisma.conversation.findMany({
          where: {
            type: 'DIRECT',
          },
        });

        expect(conversations).toHaveLength(1);
      }, 10000);

      it('returns the same direct conversation regardless of which user initiates it', async () => {
        const userA = await createTestUser({
          username: 'alice',
          email: 'alice@example.com',
        });

        const userB = await createTestUser({
          username: 'bob',
          email: 'bob@example.com',
        });

        const aliceAgent = await loginUser(userA.email);
        const bobAgent = await loginUser(userB.email);

        const firstResponse = await aliceAgent.post('/conversations').send({
          type: 'DIRECT',
          userId: userB.id,
        });

        const secondResponse = await bobAgent.post('/conversations').send({
          type: 'DIRECT',
          userId: userA.id,
        });

        expect(firstResponse.status).toBe(201);
        expect(secondResponse.status).toBe(201);

        expect(secondResponse.body.conversation.id).toBe(firstResponse.body.conversation.id);

        expect(secondResponse.body.conversation.directKey).toBe(
          firstResponse.body.conversation.directKey,
        );

        const conversations = await prisma.conversation.findMany({
          where: {
            type: 'DIRECT',
          },
        });

        expect(conversations).toHaveLength(1);
      }, 10000);

      it('rejects creating a direct conversation with yourself', async () => {
        const user = await createTestUser({
          username: 'alice',
          email: 'alice@example.com',
        });

        const agent = await loginUser(user.email);

        const response = await agent.post('/conversations').send({
          type: 'DIRECT',
          userId: user.id,
        });

        expect(response.status).toBe(400);
      });

      it('rejects a direct conversation with a nonexistent user', async () => {
        const user = await createTestUser({
          username: 'alice',
          email: 'alice@example.com',
        });

        const agent = await loginUser(user.email);

        const response = await agent.post('/conversations').send({
          type: 'DIRECT',
          userId: '00000000-0000-0000-0000-000000000000',
        });

        expect(response.status).toBe(400);
      });
    });

    describe('GROUP conversations', () => {
      it('creates a group conversation', async () => {
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

        const agent = await loginUser(userA.email);

        const response = await agent.post('/conversations').send({
          type: 'GROUP',
          name: 'Test Group',
          userIds: [userB.id, userC.id],
        });

        expect(response.status).toBe(201);

        expect(response.body.conversation).toMatchObject({
          type: 'GROUP',
          name: 'Test Group',
          createdById: userA.id,
        });

        expect(response.body.conversation.directKey).toBeNull();
        expect(response.body.conversation.members).toHaveLength(3);

        const creator = response.body.conversation.members.find(
          (member) => member.userId === userA.id,
        );

        expect(creator.role).toBe('ADMIN');

        const regularMembers = response.body.conversation.members.filter(
          (member) => member.userId !== userA.id,
        );

        expect(regularMembers).toHaveLength(2);

        for (const member of regularMembers) {
          expect(member.role).toBe('MEMBER');
        }
      });

      it('automatically includes the creator even when they are not in userIds', async () => {
        const userA = await createTestUser({
          username: 'alice',
          email: 'alice@example.com',
        });

        const userB = await createTestUser({
          username: 'bob',
          email: 'bob@example.com',
        });

        const agent = await loginUser(userA.email);

        const response = await agent.post('/conversations').send({
          type: 'GROUP',
          name: 'Test Group',
          userIds: [userB.id],
        });

        expect(response.status).toBe(201);
        expect(response.body.conversation.members).toHaveLength(2);

        const memberIds = response.body.conversation.members.map((member) => member.userId);

        expect(memberIds).toContain(userA.id);
        expect(memberIds).toContain(userB.id);
      });

      it('does not create duplicate group members', async () => {
        const userA = await createTestUser({
          username: 'alice',
          email: 'alice@example.com',
        });

        const userB = await createTestUser({
          username: 'bob',
          email: 'bob@example.com',
        });

        const agent = await loginUser(userA.email);

        const response = await agent.post('/conversations').send({
          type: 'GROUP',
          name: 'Test Group',
          userIds: [userB.id, userB.id, userA.id, userA.id],
        });

        expect(response.status).toBe(201);
        expect(response.body.conversation.members).toHaveLength(2);

        const members = await prisma.conversationMember.findMany({
          where: {
            conversationId: response.body.conversation.id,
          },
        });

        expect(members).toHaveLength(2);
      });

      it('rejects a group containing a nonexistent user', async () => {
        const user = await createTestUser({
          username: 'alice',
          email: 'alice@example.com',
        });

        const agent = await loginUser(user.email);

        const response = await agent.post('/conversations').send({
          type: 'GROUP',
          name: 'Test Group',
          userIds: ['00000000-0000-0000-0000-000000000000'],
        });

        expect(response.status).toBe(400);
      });

      it('rejects a group with an empty name', async () => {
        const user = await createTestUser({
          username: 'alice',
          email: 'alice@example.com',
        });

        const agent = await loginUser(user.email);

        const response = await agent.post('/conversations').send({
          type: 'GROUP',
          name: '',
          userIds: [],
        });

        expect(response.status).toBe(400);
      });

      it('rejects a group without a name', async () => {
        const user = await createTestUser({
          username: 'alice',
          email: 'alice@example.com',
        });

        const agent = await loginUser(user.email);

        const response = await agent.post('/conversations').send({
          type: 'GROUP',
          userIds: [],
        });

        expect(response.status).toBe(400);
      });
    });

    describe('authentication and validation', () => {
      it('rejects unauthenticated requests', async () => {
        const response = await request(app).post('/conversations').send({
          type: 'DIRECT',
          userId: '00000000-0000-0000-0000-000000000000',
        });

        expect(response.status).toBe(401);
      });

      it('rejects an invalid conversation type', async () => {
        const user = await createTestUser({
          username: 'alice',
          email: 'alice@example.com',
        });

        const agent = await loginUser(user.email);

        const response = await agent.post('/conversations').send({
          type: 'INVALID',
          userId: user.id,
        });

        expect(response.status).toBe(400);
      });

      it('rejects an invalid user ID', async () => {
        const user = await createTestUser({
          username: 'alice',
          email: 'alice@example.com',
        });

        const agent = await loginUser(user.email);

        const response = await agent.post('/conversations').send({
          type: 'DIRECT',
          userId: 'not-a-uuid',
        });

        expect(response.status).toBe(400);
      });
    });
  });

  describe('GET /conversations', () => {
    it('returns conversations the authenticated user belongs to', async () => {
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

      await prisma.conversation.create({
        data: {
          type: 'DIRECT',
          directKey: [userA.id, userB.id].sort().join(':'),
          createdById: userA.id,
          members: {
            create: [
              {
                userId: userA.id,
                role: 'MEMBER',
              },
              {
                userId: userB.id,
                role: 'MEMBER',
              },
            ],
          },
        },
      });

      await prisma.conversation.create({
        data: {
          type: 'DIRECT',
          directKey: [userB.id, userC.id].sort().join(':'),
          createdById: userB.id,
          members: {
            create: [
              {
                userId: userB.id,
                role: 'MEMBER',
              },
              {
                userId: userC.id,
                role: 'MEMBER',
              },
            ],
          },
        },
      });

      const aliceAgent = await loginUser(userA.email);

      const response = await aliceAgent.get('/conversations');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.conversations).toHaveLength(1);

      const conversation = response.body.conversations[0];

      expect(conversation.type).toBe('DIRECT');
      expect(conversation.members).toHaveLength(2);

      const memberIds = conversation.members.map((member) => member.userId);

      expect(memberIds).toContain(userA.id);
      expect(memberIds).toContain(userB.id);
      expect(memberIds).not.toContain(userC.id);
    }, 10000);

    it('does not return conversations the authenticated user does not belong to', async () => {
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

      await prisma.conversation.create({
        data: {
          type: 'DIRECT',
          directKey: [userB.id, userC.id].sort().join(':'),
          createdById: userB.id,
          members: {
            create: [
              {
                userId: userB.id,
                role: 'MEMBER',
              },
              {
                userId: userC.id,
                role: 'MEMBER',
              },
            ],
          },
        },
      });

      const aliceAgent = await loginUser(userA.email);

      const response = await aliceAgent.get('/conversations');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.conversations).toEqual([]);
    });

    it('returns an empty array when the user has no conversations', async () => {
      const user = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const agent = await loginUser(user.email);

      const response = await agent.get('/conversations');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.conversations).toEqual([]);
    });

    it('rejects unauthenticated requests', async () => {
      const response = await request(app).get('/conversations');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /conversations/:conversationId', () => {
    it('allows a conversation member to access the conversation', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const agent = await loginUser(userA.email);

      const createResponse = await agent.post('/conversations').send({
        type: 'DIRECT',
        userId: userB.id,
      });

      const conversationId = createResponse.body.conversation.id;

      const response = await agent.get(`/conversations/${conversationId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.conversation.id).toBe(conversationId);
    });

    it('rejects a non-member from accessing a conversation', async () => {
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

      const aliceAgent = await loginUser(userA.email);
      const charlieAgent = await loginUser(userC.email);

      const createResponse = await aliceAgent.post('/conversations').send({
        type: 'DIRECT',
        userId: userB.id,
      });

      const conversationId = createResponse.body.conversation.id;

      const response = await charlieAgent.get(`/conversations/${conversationId}`);

      expect(response.status).toBe(403);
    }, 10000);

    it('returns 404 for a nonexistent conversation', async () => {
      const user = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const agent = await loginUser(user.email);

      const response = await agent.get('/conversations/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
    });

    it('rejects an invalid conversation ID', async () => {
      const user = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const agent = await loginUser(user.email);

      const response = await agent.get('/conversations/not-a-uuid');

      expect(response.status).toBe(400);
    });

    it('rejects unauthenticated requests', async () => {
      const response = await request(app).get(
        '/conversations/00000000-0000-0000-0000-000000000000',
      );

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /conversations/:conversationId', () => {
    it('allows a direct conversation member to delete the conversation', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const agent = await loginUser(userA.email);

      const createResponse = await agent.post('/conversations').send({
        type: 'DIRECT',
        userId: userB.id,
      });

      const conversationId = createResponse.body.conversation.id;

      const response = await agent.delete(`/conversations/${conversationId}`);

      expect(response.status).toBe(204);

      const conversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
      });

      expect(conversation).toBeNull();

      const members = await prisma.conversationMember.findMany({
        where: {
          conversationId,
        },
      });

      expect(members).toHaveLength(0);
    });

    it('allows a group administrator to delete the conversation', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const agent = await loginUser(userA.email);

      const createResponse = await agent.post('/conversations').send({
        type: 'GROUP',
        name: 'Test Group',
        userIds: [userB.id],
      });

      const conversationId = createResponse.body.conversation.id;

      const response = await agent.delete(`/conversations/${conversationId}`);

      expect(response.status).toBe(204);

      const conversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
      });

      expect(conversation).toBeNull();
    });

    it('rejects a non-admin group member from deleting the conversation', async () => {
      const userA = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const userB = await createTestUser({
        username: 'bob',
        email: 'bob@example.com',
      });

      const aliceAgent = await loginUser(userA.email);
      const bobAgent = await loginUser(userB.email);

      const createResponse = await aliceAgent.post('/conversations').send({
        type: 'GROUP',
        name: 'Test Group',
        userIds: [userB.id],
      });

      const conversationId = createResponse.body.conversation.id;

      const response = await bobAgent.delete(`/conversations/${conversationId}`);

      expect(response.status).toBe(403);

      const conversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
      });

      expect(conversation).not.toBeNull();
    });

    it('rejects a non-member from deleting the conversation', async () => {
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

      const aliceAgent = await loginUser(userA.email);
      const charlieAgent = await loginUser(userC.email);

      const createResponse = await aliceAgent.post('/conversations').send({
        type: 'DIRECT',
        userId: userB.id,
      });

      const conversationId = createResponse.body.conversation.id;

      const response = await charlieAgent.delete(`/conversations/${conversationId}`);

      expect(response.status).toBe(403);

      const conversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
      });

      expect(conversation).not.toBeNull();
    });

    it('returns 404 when deleting a nonexistent conversation', async () => {
      const user = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const agent = await loginUser(user.email);

      const response = await agent.delete('/conversations/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
    });

    it('rejects an invalid conversation ID', async () => {
      const user = await createTestUser({
        username: 'alice',
        email: 'alice@example.com',
      });

      const agent = await loginUser(user.email);

      const response = await agent.delete('/conversations/not-a-uuid');

      expect(response.status).toBe(400);
    });

    it('rejects unauthenticated requests', async () => {
      const response = await request(app).delete(
        '/conversations/00000000-0000-0000-0000-000000000000',
      );

      expect(response.status).toBe(401);
    });
  });
});
