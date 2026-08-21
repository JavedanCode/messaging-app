import { findUserByEmail } from './user.service.js';

import { buildEmailVerificationEmail } from '../emails/email-verification.js';

import { sendEmail } from './email.service.js';

import {
  canRequestEmailVerification,
  createEmailVerificationToken,
} from './verification-token.service.js';

export async function sendEmailVerification(user) {
  // Create the verification token before sending the email so the delivered
  // code corresponds to a token already persisted by the application.
  const code = await createEmailVerificationToken(user.id);

  const email = buildEmailVerificationEmail({
    code,
  });

  await sendEmail({
    to: user.email,
    subject: email.subject,
    html: email.html,
  });
}

export async function resendEmailVerification(email) {
  const user = await findUserByEmail(email);

  // Do not reveal whether an email belongs to an account or whether it has
  // already been verified.
  if (!user || user.emailVerifiedAt) {
    return;
  }

  const canRequest = await canRequestEmailVerification(user.id);

  if (!canRequest) {
    return;
  }

  await sendEmailVerification(user);
}
