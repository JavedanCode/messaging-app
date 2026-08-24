import { Router } from 'express';

import {
  sendFriendRequestController,
  acceptFriendRequestController,
  rejectFriendRequestController,
  removeFriendController,
  getFriendsController,
  getIncomingRequestsController,
  getOutgoingRequestsController,
} from '../controllers/friendship.controller.js';

import { authenticate } from '../middleware/authenticate.js';
import { validateParams } from '../middleware/validate.js';

import {
  friendshipUserParamsSchema,
  friendshipIdParamsSchema,
} from '../schemas/friendship.schema.js';

const router = Router();

router.use(authenticate);

router.post(
  '/request/:userId',
  validateParams(friendshipUserParamsSchema),
  sendFriendRequestController,
);

router.patch(
  '/requests/:friendshipId/accept',
  validateParams(friendshipIdParamsSchema),
  acceptFriendRequestController,
);

router.patch(
  '/requests/:friendshipId/reject',
  validateParams(friendshipIdParamsSchema),
  rejectFriendRequestController,
);

router.delete('/:userId', validateParams(friendshipUserParamsSchema), removeFriendController);

router.get('/', getFriendsController);

router.get('/requests/incoming', getIncomingRequestsController);

router.get('/requests/outgoing', getOutgoingRequestsController);

export default router;
