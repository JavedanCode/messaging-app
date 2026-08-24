import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';

import app from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';

import { resetRateLimiters } from '../../src/middleware/rate-limit.js';

describe('Group conversation management', () => {
  let adminAgent;
  let memberAgent;

  let adminUser;
  let memberUser;
  let anotherMemberUser;

  let conversationId;

  async function createUserAndLogin(username, email) {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });

    const agent = request.agent(app);

    const loginResponse = await agent.post('/auth/login').send({
      email,
      password,
    });

    expect(loginResponse.status).toBe(200);

    const meResponse = await agent.get('/auth/me');

    expect(meResponse.status).toBe(200);

    return {
      agent,
      user: meResponse.body.user,
    };
  }
  beforeEach(async () => {
    await resetRateLimiters();

    await prisma.message.deleteMany();
    await prisma.conversationMember.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();

    const admin = await createUserAndLogin('admin', 'admin@test.com');

    const member = await createUserAndLogin('member', 'member@test.com');

    const anotherMember = await createUserAndLogin('member2', 'member2@test.com');

    adminAgent = admin.agent;
    adminUser = admin.user;

    memberAgent = member.agent;
    memberUser = member.user;

    anotherMemberUser = anotherMember.user;

    const response = await adminAgent.post('/conversations').send({
      type: 'GROUP',
      name: 'Test Group',
      userIds: [memberUser.id],
    });

    expect(response.status).toBe(201);

    conversationId = response.body.conversation.id;
  });

  describe('Adding members', () => {
    it('allows an admin to add a member', async () => {
      const response = await adminAgent.post(`/conversations/${conversationId}/members`).send({
        userId: anotherMemberUser.id,
      });

      expect(response.status).toBe(201);

      expect(response.body.member.userId).toBe(anotherMemberUser.id);
    });

    it('prevents normal members from adding users', async () => {
      const response = await memberAgent.post(`/conversations/${conversationId}/members`).send({
        userId: anotherMemberUser.id,
      });

      expect(response.status).toBe(403);
    });

    it('prevents duplicate members', async () => {
      const response = await adminAgent.post(`/conversations/${conversationId}/members`).send({
        userId: memberUser.id,
      });

      expect(response.status).toBe(409);
    });

    it('rejects unknown users', async () => {
      const response = await adminAgent.post(`/conversations/${conversationId}/members`).send({
        userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Removing members', () => {
    beforeEach(async () => {
      await adminAgent.post(`/conversations/${conversationId}/members`).send({
        userId: anotherMemberUser.id,
      });
    });

    it('allows admins to remove members', async () => {
      const response = await adminAgent.delete(
        `/conversations/${conversationId}/members/${anotherMemberUser.id}`,
      );

      expect(response.status).toBe(204);

      const member = await prisma.conversationMember.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId: anotherMemberUser.id,
          },
        },
      });

      expect(member).toBeNull();
    });

    it('prevents members from removing users', async () => {
      const response = await memberAgent.delete(
        `/conversations/${conversationId}/members/${anotherMemberUser.id}`,
      );

      expect(response.status).toBe(403);
    });

    it('prevents removing the creator', async () => {
      const response = await adminAgent.delete(
        `/conversations/${conversationId}/members/${adminUser.id}`,
      );

      expect(response.status).toBe(403);
    });
  });

  describe('Changing roles', () => {
    it('allows admin to promote a member', async () => {
      const response = await adminAgent
        .patch(`/conversations/${conversationId}/members/${memberUser.id}`)
        .send({
          role: 'ADMIN',
        });

      expect(response.status).toBe(200);

      expect(response.body.member.role).toBe('ADMIN');
    });

    it('prevents members from changing roles', async () => {
      const response = await memberAgent
        .patch(`/conversations/${conversationId}/members/${anotherMemberUser.id}`)
        .send({
          role: 'ADMIN',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Updating group name', () => {
    it('allows admin to rename group', async () => {
      const response = await adminAgent.patch(`/conversations/${conversationId}`).send({
        name: 'New Group Name',
      });

      expect(response.status).toBe(200);

      expect(response.body.conversation.name).toBe('New Group Name');
    });

    it('prevents members from renaming group', async () => {
      const response = await memberAgent.patch(`/conversations/${conversationId}`).send({
        name: 'Hack Name',
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Leaving group', () => {
    it('allows normal members to leave', async () => {
      const response = await memberAgent.post(`/conversations/${conversationId}/leave`);

      expect(response.status).toBe(204);

      const member = await prisma.conversationMember.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId: memberUser.id,
          },
        },
      });

      expect(member).toBeNull();
    });

    it('transfers ownership when creator leaves', async () => {
      await adminAgent.post(`/conversations/${conversationId}/members`).send({
        userId: anotherMemberUser.id,
      });

      const response = await adminAgent.post(`/conversations/${conversationId}/leave`);

      expect(response.status).toBe(204);

      const conversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
      });

      expect(conversation.createdById).not.toBe(adminUser.id);

      expect(conversation.createdById).toBe(memberUser.id);
    });

    it('prevents leaving direct conversations', async () => {
      const direct = await adminAgent.post('/conversations').send({
        type: 'DIRECT',
        userId: memberUser.id,
      });

      const response = await adminAgent.post(`/conversations/${direct.body.conversation.id}/leave`);

      expect(response.status).toBe(400);
    });
  });
});
