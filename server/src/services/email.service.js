import { Resend } from 'resend';

import { env } from '../config/env.js';

import { AppError } from '../errors/AppError.js';

// Keep the email provider behind a single service so the rest of the application
// does not depend directly on Resend's API.
const resend = new Resend(env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html }) {
  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });

  // Convert provider failures into a stable application error instead of exposing
  // provider-specific details to API clients.
  if (error) {
    throw new AppError(
      'Unable to deliver the email. Please try again later.',
      503,
      'EMAIL_DELIVERY_FAILED',
    );
  }

  return data;
}
