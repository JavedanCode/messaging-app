import { z } from 'zod';

export const conversationMemberParamsSchema = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const addConversationMemberSchema = z.object({
  userId: z.string().uuid(),
});

export const conversationIdOnlySchema = z.object({
  conversationId: z.string().uuid(),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['MEMBER', 'ADMIN']),
});

export const updateGroupNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Group name cannot be empty.')
    .max(100, 'Group name cannot exceed 100 characters.'),
});
