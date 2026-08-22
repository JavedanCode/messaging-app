import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/AppError.js';
import { verifyPassword, hashPassword } from './password.service.js';
import { revokeAllUserSessions } from './session.service.js';

export async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: {
      email,
    },
  });
}

export async function findUserById(userId) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
}

export async function createUser({ username, email, passwordHash }) {
  // Perform friendly application-level checks before attempting the database insert.
  // The database unique constraints remain the final protection against race conditions.
  const existingEmail = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingEmail) {
    throw new AppError('Email is already registered.', 409, 'EMAIL_ALREADY_EXISTS');
  }

  const existingUsername = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (existingUsername) {
    throw new AppError('Username is already taken.', 409, 'USERNAME_ALREADY_EXISTS');
  }

  return prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
    },
  });
}

export async function changeUserPassword({ userId, currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user || !user.passwordHash) {
    throw new AppError('Current password is incorrect.', 401, 'INVALID_CURRENT_PASSWORD');
  }

  const currentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);

  // Require the existing password for local accounts before allowing a password change.
  if (!currentPasswordValid) {
    throw new AppError('Current password is incorrect.', 401, 'INVALID_CURRENT_PASSWORD');
  }

  const samePassword = await verifyPassword(newPassword, user.passwordHash);

  if (samePassword) {
    throw new AppError(
      'New password must be different from your current password.',
      400,
      'PASSWORD_UNCHANGED',
    );
  }

  const passwordHash = await hashPassword(newPassword);

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
    },
  });

  // Changing a password invalidates all existing sessions so previously issued
  // refresh tokens cannot continue authenticating the account.
  await revokeAllUserSessions(userId);

  return updatedUser;
}

export async function updateUserProfile({ userId, displayName, avatarUrl }) {
  // Only update fields explicitly supplied by the caller so omitted fields remain unchanged.
  const user = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      ...(displayName !== undefined && { displayName }),
      ...(avatarUrl !== undefined && { avatarUrl }),
    },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      avatarUrl: true,
    },
  });

  return user;
}

export async function changeUsername({ userId, username }) {
  // Check for conflicts before updating, while the database unique constraint
  // remains the final protection against concurrent updates.
  const existingUser = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (existingUser && existingUser.id !== userId) {
    throw new AppError('Username is already taken.', 409, 'USERNAME_ALREADY_EXISTS');
  }

  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      username,
    },
  });
}

export async function deleteUserAccount({ userId, currentPassword }) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  }

  // OAuth-only accounts may not have a password, so password confirmation is
  // required only when the account has a local password credential.
  if (user.passwordHash) {
    if (!currentPassword) {
      throw new AppError('Current password is required.', 400, 'CURRENT_PASSWORD_REQUIRED');
    }

    const currentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);

    if (!currentPasswordValid) {
      throw new AppError('Current password is incorrect.', 401, 'INVALID_CURRENT_PASSWORD');
    }
  }

  await prisma.user.delete({
    where: {
      id: userId,
    },
  });
}
