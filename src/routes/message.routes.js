import { Router } from 'express';

import {
  createAttachmentMessageController,
  createMessageController,
  getConversationMessagesController,
  deleteMessageController,
  updateMessageController,
  getMessageAttachmentUrlController,
} from '../controllers/message.controller.js';

import { authenticate } from '../middleware/authenticate.js';
import { uploadAttachment } from '../middleware/upload.js';

import { validate, validateParams, validateQuery } from '../middleware/validate.js';

import { conversationIdParamsSchema } from '../schemas/conversation.schema.js';

import {
  createMessageSchema,
  messagePaginationSchema,
  updateMessageSchema,
  messageParamsSchema,
  messageAttachmentParamsSchema,
} from '../schemas/message.schema.js';

const router = Router();

router.use(authenticate);

router.post(
  '/:conversationId/messages',
  validateParams(conversationIdParamsSchema),
  validate(createMessageSchema),
  createMessageController,
);

router.post(
  '/:conversationId/messages/attachment',
  validateParams(conversationIdParamsSchema),
  uploadAttachment,
  createAttachmentMessageController,
);

router.patch(
  '/:conversationId/messages/:messageId',
  validateParams(messageParamsSchema),
  validate(updateMessageSchema),
  updateMessageController,
);

router.get(
  '/:conversationId/messages/:messageId/attachment',
  validateParams(messageAttachmentParamsSchema),
  getMessageAttachmentUrlController,
);

router.get(
  '/:conversationId/messages',
  validateParams(conversationIdParamsSchema),
  validateQuery(messagePaginationSchema),
  getConversationMessagesController,
);

router.delete(
  '/:conversationId/messages/:messageId',
  validateParams(messageParamsSchema),
  deleteMessageController,
);

export default router;
