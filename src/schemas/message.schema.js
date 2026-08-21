import { z } from 'zod';

export const createMessageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

export const messagePaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const messageParamsSchema = z.object({
  conversationId: z.uuid(),
  messageId: z.uuid(),
});
