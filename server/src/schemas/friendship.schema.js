import { z } from 'zod';

export const friendshipUserParamsSchema = z.object({
  userId: z.uuid(),
});

export const friendshipIdParamsSchema = z.object({
  friendshipId: z.uuid(),
});
