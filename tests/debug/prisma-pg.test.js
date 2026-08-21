import { describe, expect, it } from 'vitest';

import { prisma } from '../../src/db/prisma.js';

describe('Prisma PostgreSQL adapter', () => {
  it('can perform two sequential relational writes', async () => {
    const userA = await prisma.user.create({
      data: {
        username: 'debug-user-a',
        email: 'debug-a@example.com',
        emailVerifiedAt: new Date(),
      },
    });

    const userB = await prisma.user.create({
      data: {
        username: 'debug-user-b',
        email: 'debug-b@example.com',
        emailVerifiedAt: new Date(),
      },
    });

    const conversationA = await prisma.conversation.create({
      data: {
        type: 'DIRECT',
        directKey: `${userA.id}:${userB.id}`,
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

    expect(conversationA.id).toEqual(expect.any(String));

    const userC = await prisma.user.create({
      data: {
        username: 'debug-user-c',
        email: 'debug-c@example.com',
        emailVerifiedAt: new Date(),
      },
    });

    const conversationB = await prisma.conversation.create({
      data: {
        type: 'DIRECT',
        directKey: `${userB.id}:${userC.id}`,
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

    expect(conversationB.id).toEqual(expect.any(String));

    await prisma.conversationMember.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany();
  });
});
