import { z } from 'zod';

import { passwordSchema } from './common.schema.js';

// Profile updates are partial, but at least one supported field must be provided.
export const updateProfileSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .max(100, 'Display name must not exceed 100 characters.')
      .nullable()
      .optional(),

    avatarUrl: z
      .string()
      .trim()
      .url('Avatar URL must be a valid URL.')
      .max(2048, 'Avatar URL must not exceed 2048 characters.')
      .nullable()
      .optional(),
  })
  .refine((data) => data.displayName !== undefined || data.avatarUrl !== undefined, {
    message: 'At least one profile field must be provided.',
  });

export const updateUsernameSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters long.')
    .max(30, 'Username must not exceed 30 characters.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores.'),
});

export const requestEmailChangeSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address.'),
});

export const confirmEmailChangeSchema = z.object({
  token: z.string().min(1, 'Email change token is required.'),
});

// The new password uses the same requirements as registration and password reset.
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: passwordSchema,
});

export const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.').optional(),
});
