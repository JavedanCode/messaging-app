import { Router } from 'express';

import {
  createConversationController,
  deleteConversationController,
  getConversationController,
  getConversationsController,
} from '../controllers/conversation.controller.js';

import { authenticate } from '../middleware/authenticate.js';
import { validate, validateParams } from '../middleware/validate.js';

import {
  conversationIdParamsSchema,
  createConversationSchema,
} from '../schemas/conversation.schema.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createConversationSchema), createConversationController);

router.get('/', getConversationsController);

router.get(
  '/:conversationId',
  validateParams(conversationIdParamsSchema),
  getConversationController,
);

router.delete(
  '/:conversationId',
  validateParams(conversationIdParamsSchema),
  deleteConversationController,
);

export default router;
