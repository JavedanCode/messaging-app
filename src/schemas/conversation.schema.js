import { z } from 'zod';

const conversationIdSchema = z.object({
  conversationId: z.uuid(),
});

const createDirectConversationSchema = z.object({
  type: z.literal('DIRECT'),
  userId: z.uuid(),
});

const createGroupConversationSchema = z.object({
  type: z.literal('GROUP'),
  name: z.string().trim().min(1).max(100),
  userIds: z.array(z.uuid()).min(1).max(50),
});

export const createConversationSchema = z.discriminatedUnion('type', [
  createDirectConversationSchema,
  createGroupConversationSchema,
]);

export const conversationParamsSchema = conversationIdSchema;

export const conversationIdParamsSchema = z.object({
  conversationId: z.uuid(),
});
