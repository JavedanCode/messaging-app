import { Router } from 'express';

import {
  createMessageController,
  getConversationMessagesController,
} from '../controllers/message.controller.js';

import { authenticate } from '../middleware/authenticate.js';
import { validate, validateParams } from '../middleware/validate.js';

import { conversationIdParamsSchema } from '../schemas/conversation.schema.js';

import { createMessageSchema, messagePaginationSchema } from '../schemas/message.schema.js';

const router = Router();

router.use(authenticate);

router.post(
  '/:conversationId/messages',
  validateParams(conversationIdParamsSchema),
  validate(createMessageSchema),
  createMessageController,
);

router.get(
  '/:conversationId/messages',
  validateParams(conversationIdParamsSchema),
  getConversationMessagesController,
);

export default router;
