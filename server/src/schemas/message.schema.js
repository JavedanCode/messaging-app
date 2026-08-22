import { z } from 'zod';
import { conversationIdParamsSchema } from './conversation.schema.js';

export const createMessageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

export const messagePaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const updateMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Message content is required.')
    .max(5000, 'Message content must not exceed 5000 characters.'),
});

export const messageParamsSchema = z.object({
  conversationId: z.uuid(),
  messageId: z.uuid(),
});

export const messageAttachmentParamsSchema = conversationIdParamsSchema.extend({
  messageId: z.uuid(),
});
