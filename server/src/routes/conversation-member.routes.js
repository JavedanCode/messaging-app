import { Router } from 'express';
import { z } from 'zod';

import {
  addGroupMemberController,
  removeGroupMemberController,
  leaveGroupController,
  updateMemberRoleController,
  updateGroupNameController,
} from '../controllers/conversation-member.controller.js';

import { authenticate } from '../middleware/authenticate.js';

import { validate, validateParams } from '../middleware/validate.js';

import {
  conversationMemberParamsSchema,
  addConversationMemberSchema,
  updateMemberRoleSchema,
  conversationIdOnlySchema,
  updateGroupNameSchema,
} from '../schemas/conversation-member.schema.js';

import { conversationIdParamsSchema } from '../schemas/conversation.schema.js';

const router = Router();

router.use(authenticate);

router.post(
  '/:conversationId/members',
  validateParams(
    z.object({
      conversationId: z.string().uuid(),
    }),
  ),
  validate(addConversationMemberSchema),
  addGroupMemberController,
);

router.post(
  '/:conversationId/leave',
  validateParams(conversationIdOnlySchema),
  leaveGroupController,
);

router.patch(
  '/:conversationId/members/:userId',
  validateParams(conversationMemberParamsSchema),
  validate(updateMemberRoleSchema),
  updateMemberRoleController,
);

router.patch(
  '/:conversationId',
  validateParams(conversationIdParamsSchema),
  validate(updateGroupNameSchema),
  updateGroupNameController,
);

router.delete(
  '/:conversationId/members/:userId',
  validateParams(conversationMemberParamsSchema),
  removeGroupMemberController,
);

export default router;
