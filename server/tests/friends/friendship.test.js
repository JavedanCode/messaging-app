import request from 'supertest';
import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from 'vitest';

import app from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import { resetRateLimiters } from '../../src/middleware/rate-limit.js';

describe('Friendship system', () => {
  let userA;
  let userB;
  let userC;

  let agentA;
  let agentB;
  let agentC;

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

    await prisma.friendship.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();

    const first = await createUserAndLogin('userone', 'one@test.com');

    const second = await createUserAndLogin('usertwo', 'two@test.com');

    const third = await createUserAndLogin('userthree', 'three@test.com');

    agentA = first.agent;
    userA = first.user;

    agentB = second.agent;
    userB = second.user;

    agentC = third.agent;
    userC = third.user;
  });

  describe('Sending friend requests', () => {
    it('allows a user to send a friend request', async () => {
      const response = await agentA.post(`/friends/request/${userB.id}`);

      expect(response.status).toBe(201);

      expect(response.body.friendship).toMatchObject({
        requesterId: userA.id,
        receiverId: userB.id,
        status: 'PENDING',
      });

      const friendship = await prisma.friendship.findFirst();

      expect(friendship).not.toBeNull();
      expect(friendship.friendshipKey).toBeTruthy();
    });

    it('prevents sending a request to yourself', async () => {
      const response = await agentA.post(`/friends/request/${userA.id}`);

      expect(response.status).toBe(400);
    });

    it('prevents duplicate friendship relationships', async () => {
      await agentA.post(`/friends/request/${userB.id}`);

      const response = await agentB.post(`/friends/request/${userA.id}`);

      expect(response.status).toBe(409);
    });

    it('rejects unknown users', async () => {
      const response = await agentA.post('/friends/request/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

      expect(response.status).toBe(404);
    });
  });

  describe('Accepting friend requests', () => {
    let friendshipId;

    beforeEach(async () => {
      const response = await agentA.post(`/friends/request/${userB.id}`);

      friendshipId = response.body.friendship.id;
    });

    it('allows the receiver to accept a request', async () => {
      const response = await agentB.patch(`/friends/requests/${friendshipId}/accept`);

      expect(response.status).toBe(200);

      expect(response.body.friendship.status).toBe('ACCEPTED');

      const friendship = await prisma.friendship.findUnique({
        where: {
          id: friendshipId,
        },
      });

      expect(friendship.status).toBe('ACCEPTED');
    });

    it('prevents the requester from accepting their own request', async () => {
      const response = await agentA.patch(`/friends/requests/${friendshipId}/accept`);

      expect(response.status).toBe(403);
    });
  });

  describe('Rejecting friend requests', () => {
    let friendshipId;

    beforeEach(async () => {
      const response = await agentA.post(`/friends/request/${userB.id}`);

      friendshipId = response.body.friendship.id;
    });

    it('allows the receiver to reject a request', async () => {
      const response = await agentB.patch(`/friends/requests/${friendshipId}/reject`);

      expect(response.status).toBe(200);

      expect(response.body.friendship.status).toBe('REJECTED');
    });

    it('prevents the requester from rejecting their own request', async () => {
      const response = await agentA.patch(`/friends/requests/${friendshipId}/reject`);

      expect(response.status).toBe(403);
    });
  });

  describe('Friends list', () => {
    beforeEach(async () => {
      const response = await agentA.post(`/friends/request/${userB.id}`);

      await agentB.patch(`/friends/requests/${response.body.friendship.id}/accept`);
    });

    it('returns accepted friends', async () => {
      const response = await agentA.get('/friends');

      expect(response.status).toBe(200);

      expect(response.body.friends).toHaveLength(1);

      expect(response.body.friends[0]).toMatchObject({
        id: userB.id,
        username: userB.username,
      });
    });

    it('does not return pending requests as friends', async () => {
      await agentA.post(`/friends/request/${userC.id}`);

      const response = await agentA.get('/friends');

      expect(response.status).toBe(200);

      expect(response.body.friends).toHaveLength(1);
    });
  });

  describe('Friend requests lists', () => {
    it('returns incoming requests', async () => {
      await agentA.post(`/friends/request/${userB.id}`);

      const response = await agentB.get('/friends/requests/incoming');

      expect(response.status).toBe(200);

      expect(response.body.requests).toHaveLength(1);

      expect(response.body.requests[0].requester.id).toBe(userA.id);
    });

    it('returns outgoing requests', async () => {
      await agentA.post(`/friends/request/${userB.id}`);

      const response = await agentA.get('/friends/requests/outgoing');

      expect(response.status).toBe(200);

      expect(response.body.requests).toHaveLength(1);

      expect(response.body.requests[0].receiver.id).toBe(userB.id);
    });
  });

  describe('Removing friends', () => {
    let friendshipId;

    beforeEach(async () => {
      const requestResponse = await agentA.post(`/friends/request/${userB.id}`);

      friendshipId = requestResponse.body.friendship.id;

      await agentB.patch(`/friends/requests/${friendshipId}/accept`);
    });

    it('allows a friend to remove another friend', async () => {
      const response = await agentA.delete(`/friends/${userB.id}`);

      expect(response.status).toBe(204);

      const friendship = await prisma.friendship.findUnique({
        where: {
          id: friendshipId,
        },
      });

      expect(friendship).toBeNull();
    });

    it('rejects removing a non-friend', async () => {
      const response = await agentA.delete(`/friends/${userC.id}`);

      expect(response.status).toBe(404);
    });
  });
});
