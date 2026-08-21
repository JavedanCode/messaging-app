import { Router } from 'express';

import {
  changePassword,
  updateProfile,
  changeUsernameController,
  requestEmailChangeController,
  confirmEmailChangeController,
  deleteAccount,
} from '../controllers/user.controller.js';

import { authenticate } from '../middleware/authenticate.js';

import { validate } from '../middleware/validate.js';

import {
  updateProfileSchema,
  updateUsernameSchema,
  requestEmailChangeSchema,
  confirmEmailChangeSchema,
  deleteAccountSchema,
  changePasswordSchema,
} from '../schemas/user.schema.js';

const router = Router();

router.patch('/me', authenticate, validate(updateProfileSchema), updateProfile);

router.patch('/me/password', authenticate, validate(changePasswordSchema), changePassword);

router.patch(
  '/me/username',
  authenticate,
  validate(updateUsernameSchema),
  changeUsernameController,
);

router.patch(
  '/me/email',
  authenticate,
  validate(requestEmailChangeSchema),
  requestEmailChangeController,
);

router.post(
  '/me/email/confirm',
  authenticate,
  validate(confirmEmailChangeSchema),
  confirmEmailChangeController,
);

router.delete('/me', authenticate, validate(deleteAccountSchema), deleteAccount);

export default router;
