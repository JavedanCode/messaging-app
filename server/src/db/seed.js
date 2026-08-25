import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../generated/prisma/client.ts';
import { env } from '../config/env.js';

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const DEMO_PASSWORD = 'DemoPassword123!';

const users = {
  javedan: {
    id: '00000000-0000-4000-8000-000000000001',
    username: 'javedan',
    email: 'demo@javedanchat.com',
    displayName: 'Javedan',
  },

  alex: {
    id: '00000000-0000-4000-8000-000000000002',
    username: 'alex_morgan',
    email: 'alex@javedanchat.com',
    displayName: 'Alex Morgan',
  },

  maya: {
    id: '00000000-0000-4000-8000-000000000003',
    username: 'maya_chen',
    email: 'maya@javedanchat.com',
    displayName: 'Maya Chen',
  },

  daniel: {
    id: '00000000-0000-4000-8000-000000000004',
    username: 'daniel_brooks',
    email: 'daniel@javedanchat.com',
    displayName: 'Daniel Brooks',
  },
};

const conversations = {
  alex: '10000000-0000-4000-8000-000000000001',
  maya: '10000000-0000-4000-8000-000000000002',
  daniel: '10000000-0000-4000-8000-000000000003',
  group: '10000000-0000-4000-8000-000000000004',
};

const messageIds = {
  alex1: '20000000-0000-4000-8000-000000000001',
  alex2: '20000000-0000-4000-8000-000000000002',
  alex3: '20000000-0000-4000-8000-000000000003',
  alex4: '20000000-0000-4000-8000-000000000004',
  alex5: '20000000-0000-4000-8000-000000000005',

  maya1: '20000000-0000-4000-8000-000000000006',
  maya2: '20000000-0000-4000-8000-000000000007',
  maya3: '20000000-0000-4000-8000-000000000008',
  maya4: '20000000-0000-4000-8000-000000000009',

  daniel1: '20000000-0000-4000-8000-000000000010',
  daniel2: '20000000-0000-4000-8000-000000000011',
  daniel3: '20000000-0000-4000-8000-000000000012',
  daniel4: '20000000-0000-4000-8000-000000000013',

  group1: '20000000-0000-4000-8000-000000000014',
  group2: '20000000-0000-4000-8000-000000000015',
  group3: '20000000-0000-4000-8000-000000000016',
  group4: '20000000-0000-4000-8000-000000000017',
  group5: '20000000-0000-4000-8000-000000000018',
  group6: '20000000-0000-4000-8000-000000000019',
};

function pairKey(firstId, secondId) {
  return [firstId, secondId].sort().join(':');
}

async function main() {
  console.log('Seeding JavedanChat demo data...');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  /*
   * --------------------------------------------------------------------------
   * Users
   * --------------------------------------------------------------------------
   */

  for (const user of Object.values(users)) {
    await prisma.user.upsert({
      where: {
        id: user.id,
      },
      update: {
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
      create: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
  }

  /*
   * --------------------------------------------------------------------------
   * Friendships
   * --------------------------------------------------------------------------
   */

  const friendships = [
    [users.javedan.id, users.alex.id],
    [users.javedan.id, users.maya.id],
    [users.javedan.id, users.daniel.id],
    [users.alex.id, users.maya.id],
  ];

  for (const [requesterId, receiverId] of friendships) {
    await prisma.friendship.upsert({
      where: {
        friendshipKey: pairKey(requesterId, receiverId),
      },
      update: {
        requesterId,
        receiverId,
        status: 'ACCEPTED',
      },
      create: {
        requesterId,
        receiverId,
        friendshipKey: pairKey(requesterId, receiverId),
        status: 'ACCEPTED',
      },
    });
  }

  /*
   * --------------------------------------------------------------------------
   * Direct conversations
   * --------------------------------------------------------------------------
   */

  const directConversations = [
    {
      id: conversations.alex,
      otherUserId: users.alex.id,
    },
    {
      id: conversations.maya,
      otherUserId: users.maya.id,
    },
    {
      id: conversations.daniel,
      otherUserId: users.daniel.id,
    },
  ];

  for (const conversation of directConversations) {
    await prisma.conversation.upsert({
      where: {
        id: conversation.id,
      },
      update: {
        type: 'DIRECT',
        directKey: pairKey(users.javedan.id, conversation.otherUserId),
        createdById: users.javedan.id,
      },
      create: {
        id: conversation.id,
        type: 'DIRECT',
        directKey: pairKey(users.javedan.id, conversation.otherUserId),
        createdById: users.javedan.id,
      },
    });

    await prisma.conversationMember.upsert({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId: users.javedan.id,
        },
      },
      update: {
        role: 'MEMBER',
      },
      create: {
        conversationId: conversation.id,
        userId: users.javedan.id,
        role: 'MEMBER',
      },
    });

    await prisma.conversationMember.upsert({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId: conversation.otherUserId,
        },
      },
      update: {
        role: 'MEMBER',
      },
      create: {
        conversationId: conversation.id,
        userId: conversation.otherUserId,
        role: 'MEMBER',
      },
    });
  }

  /*
   * --------------------------------------------------------------------------
   * Group conversation
   * --------------------------------------------------------------------------
   */

  await prisma.conversation.upsert({
    where: {
      id: conversations.group,
    },
    update: {
      type: 'GROUP',
      name: 'JavedanChat Development',
      createdById: users.javedan.id,
    },
    create: {
      id: conversations.group,
      type: 'GROUP',
      name: 'JavedanChat Development',
      createdById: users.javedan.id,
    },
  });

  for (const [userKey, role] of [
    ['javedan', 'ADMIN'],
    ['alex', 'MEMBER'],
    ['maya', 'MEMBER'],
    ['daniel', 'MEMBER'],
  ]) {
    await prisma.conversationMember.upsert({
      where: {
        conversationId_userId: {
          conversationId: conversations.group,
          userId: users[userKey].id,
        },
      },
      update: {
        role,
      },
      create: {
        conversationId: conversations.group,
        userId: users[userKey].id,
        role,
      },
    });
  }

  /*
   * --------------------------------------------------------------------------
   * Messages
   * --------------------------------------------------------------------------
   */

  const messages = [
    // Javedan <-> Alex
    {
      id: messageIds.alex1,
      conversationId: conversations.alex,
      senderId: users.alex.id,
      content: 'Hey, I finally tried JavedanChat.',
    },
    {
      id: messageIds.alex2,
      conversationId: conversations.alex,
      senderId: users.javedan.id,
      content: 'And?',
    },
    {
      id: messageIds.alex3,
      conversationId: conversations.alex,
      senderId: users.alex.id,
      content: 'Honestly, pretty clean. The realtime updates are surprisingly smooth.',
    },
    {
      id: messageIds.alex4,
      conversationId: conversations.alex,
      senderId: users.javedan.id,
      content:
        "That's Socket.IO doing its thing. Had to make it feel like an actual messaging app.",
    },
    {
      id: messageIds.alex5,
      conversationId: conversations.alex,
      senderId: users.alex.id,
      content: "Fair. Also, don't delete this conversation. It's the demo account 😂",
    },

    // Javedan <-> Maya
    {
      id: messageIds.maya1,
      conversationId: conversations.maya,
      senderId: users.maya.id,
      content: 'Are you still working on the demo?',
    },
    {
      id: messageIds.maya2,
      conversationId: conversations.maya,
      senderId: users.javedan.id,
      content: "I'm calling it finished this time.",
    },
    {
      id: messageIds.maya3,
      conversationId: conversations.maya,
      senderId: users.maya.id,
      content: 'You said that yesterday.',
    },
    {
      id: messageIds.maya4,
      conversationId: conversations.maya,
      senderId: users.javedan.id,
      content: 'This time I mean it.',
    },

    // Javedan <-> Daniel
    {
      id: messageIds.daniel1,
      conversationId: conversations.daniel,
      senderId: users.daniel.id,
      content: 'How does the attachment system work?',
    },
    {
      id: messageIds.daniel2,
      conversationId: conversations.daniel,
      senderId: users.javedan.id,
      content:
        'Files are uploaded to object storage and the application stores the attachment metadata.',
    },
    {
      id: messageIds.daniel3,
      conversationId: conversations.daniel,
      senderId: users.daniel.id,
      content: "So the database isn't holding the actual files?",
    },
    {
      id: messageIds.daniel4,
      conversationId: conversations.daniel,
      senderId: users.javedan.id,
      content: 'Exactly. The files live in object storage.',
    },

    // Group
    {
      id: messageIds.group1,
      conversationId: conversations.group,
      senderId: users.javedan.id,
      content: 'Welcome to the JavedanChat demo group.',
    },
    {
      id: messageIds.group2,
      conversationId: conversations.group,
      senderId: users.maya.id,
      content: "So this is basically where you're showing off the project?",
    },
    {
      id: messageIds.group3,
      conversationId: conversations.group,
      senderId: users.javedan.id,
      content:
        'Pretty much. Authentication, friendships, groups, realtime messaging, typing indicators, presence, attachments, email verification, password reset...',
    },
    {
      id: messageIds.group4,
      conversationId: conversations.group,
      senderId: users.alex.id,
      content: "Okay, you could have just said 'a lot.'",
    },
    {
      id: messageIds.group5,
      conversationId: conversations.group,
      senderId: users.javedan.id,
      content: "I worked on it for way too long. I'm allowed to list it.",
    },
    {
      id: messageIds.group6,
      conversationId: conversations.group,
      senderId: users.daniel.id,
      content:
        "Important demo-user rule: please don't destroy the conversation history. Future visitors might appreciate it 😂",
    },
  ];

  const baseTime = new Date(Date.now() - messages.length * 60 * 60 * 1000);

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];

    await prisma.message.upsert({
      where: {
        id: message.id,
      },
      update: {
        conversationId: message.conversationId,
        senderId: message.senderId,
        type: 'TEXT',
        content: message.content,
      },
      create: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        type: 'TEXT',
        content: message.content,
        createdAt: new Date(baseTime.getTime() + index * 60 * 60 * 1000),
      },
    });
  }

  /*
   * --------------------------------------------------------------------------
   * Conversation timestamps
   * --------------------------------------------------------------------------
   */

  for (const conversationId of Object.values(conversations)) {
    const latestMessage = await prisma.message.findFirst({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        createdAt: true,
      },
    });

    await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        lastMessageAt: latestMessage?.createdAt ?? null,
      },
    });
  }

  console.log('');
  console.log('Demo data seeded successfully.');
  console.log('');
  console.log('Demo users:');
  console.log(`  Email:    ${users.javedan.email}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log('');
  console.log('Additional demo users:');
  console.log(`  ${users.alex.email}`);
  console.log(`  ${users.maya.email}`);
  console.log(`  ${users.daniel.email}`);
  console.log('');
}

main()
  .catch((error) => {
    console.error('Failed to seed demo data:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
