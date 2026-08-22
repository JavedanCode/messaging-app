import { prisma } from './prisma.js';
import { hashPassword } from '../services/password.service.js';

async function main() {
  const sorenPasswordHash = await hashPassword('Sorena12345');
  const demoPasswordHash = await hashPassword('Demo12345!');

  const soren = await prisma.user.upsert({
    where: {
      email: 'sorenjavedan@gmail.com',
    },
    update: {
      username: 'Soren',
      displayName: 'sorenJavedan',
      passwordHash: sorenPasswordHash,
      emailVerifiedAt: new Date(),
    },
    create: {
      username: 'Soren',
      email: 'sorenjavedan@gmail.com',
      displayName: 'sorenJavedan',
      passwordHash: sorenPasswordHash,
      emailVerifiedAt: new Date(),
    },
  });

  const demo = await prisma.user.upsert({
    where: {
      email: 'demo@example.com',
    },
    update: {
      username: 'demo',
      displayName: 'Demo User',
      passwordHash: demoPasswordHash,
      emailVerifiedAt: new Date(),
    },
    create: {
      username: 'demo',
      email: 'demo@example.com',
      displayName: 'Demo User',
      passwordHash: demoPasswordHash,
      emailVerifiedAt: new Date(),
    },
  });

  const directKey = [soren.id, demo.id].sort().join(':');

  const conversation = await prisma.conversation.upsert({
    where: {
      directKey,
    },
    update: {},
    create: {
      type: 'DIRECT',
      directKey,
      createdById: soren.id,
      members: {
        create: [
          {
            userId: soren.id,
            role: 'MEMBER',
          },
          {
            userId: demo.id,
            role: 'MEMBER',
          },
        ],
      },
    },
  });

  console.log('Seed completed.');
  console.log(`Soren: ${soren.email}`);
  console.log(`Demo: ${demo.email}`);
  console.log(`Conversation: ${conversation.id}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
