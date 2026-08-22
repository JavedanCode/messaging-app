import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/AppError.js';

export async function findAccountByProvider({ provider, providerAccountId }) {
  return prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId,
      },
    },
    include: {
      user: true,
    },
  });
}

export async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: {
      email,
    },
  });
}

function createUsernameBase({ email, provider }) {
  const emailUsername = email.split('@')[0];

  const normalized = emailUsername
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);

  return normalized || `${provider.toLowerCase()}_user`;
}

async function generateUniqueUsername({ email, provider }) {
  const base = createUsernameBase({
    email,
    provider,
  });

  let username = base;
  let counter = 1;

  while (
    await prisma.user.findUnique({
      where: {
        username,
      },
      select: {
        id: true,
      },
    })
  ) {
    username = `${base}_${counter}`;
    counter += 1;
  }

  return username;
}

export async function findOrCreateOAuthUser({
  provider,
  providerAccountId,
  email,
  displayName,
  avatarUrl,
}) {
  const existingAccount = await findAccountByProvider({
    provider,
    providerAccountId,
  });

  // If this provider account is already linked, return the existing application
  // user instead of creating another account.
  if (existingAccount) {
    return existingAccount.user;
  }

  const existingUser = await findUserByEmail(email);

  // Do not automatically link OAuth credentials to an existing account based
  // only on a matching email address; account linking must be an explicit action.
  if (existingUser) {
    throw new AppError(
      'An account with this email already exists. Please log in using your existing account and link your OAuth provider from your account settings.',
      409,
      'OAUTH_ACCOUNT_LINK_REQUIRED',
    );
  }

  // OAuth providers do not guarantee a username that satisfies the application's
  // username rules, so generate a valid unique username from the user's email.
  const username = await generateUniqueUsername({
    email,
    provider,
  });

  // Create the user and provider account atomically so an OAuth account can never
  // be persisted without its corresponding application user.
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username,
        email,
        displayName,
        avatarUrl,
      },
    });

    await tx.account.create({
      data: {
        userId: user.id,
        provider,
        providerAccountId,
      },
    });

    return user;
  });
}
