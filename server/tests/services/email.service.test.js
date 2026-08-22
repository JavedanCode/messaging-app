import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: vi.fn(
    class MockResend {
      constructor() {
        this.emails = {
          send: sendMock,
        };
      }
    },
  ),
}));

import { sendEmail } from '../../src/services/email.service.js';

describe('email service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends an email through Resend', async () => {
    sendMock.mockResolvedValue({
      data: {
        id: 'email-123',
      },
      error: null,
    });

    const result = await sendEmail({
      to: 'user@example.com',
      subject: 'Test email',
      html: '<p>Hello!</p>',
    });

    expect(sendMock).toHaveBeenCalledWith({
      from: expect.any(String),
      to: 'user@example.com',
      subject: 'Test email',
      html: '<p>Hello!</p>',
    });

    expect(result).toEqual({
      id: 'email-123',
    });
  });

  it('throws an AppError when Resend returns an error', async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: {
        message: 'Invalid API key',
      },
    });

    const promise = sendEmail({
      to: 'user@example.com',
      subject: 'Test email',
      html: '<p>Hello!</p>',
    });

    await expect(promise).rejects.toMatchObject({
      statusCode: 503,
      code: 'EMAIL_DELIVERY_FAILED',
      message: 'Unable to deliver the email. Please try again later.',
    });
  });
});
