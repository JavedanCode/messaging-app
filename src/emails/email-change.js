export function buildEmailChangeEmail({ verificationUrl, targetEmail }) {
  return {
    subject: 'Confirm your new email address',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Confirm your new email address</h2>

        <p>
          A request was made to change your account email address to:
        </p>

        <p>
          <strong>${targetEmail}</strong>
        </p>

        <p>
          Click the button below to confirm this change.
        </p>

        <p>
          <a
            href="${verificationUrl}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background: #1f3a5f;
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
            "
          >
            Confirm Email Change
          </a>
        </p>

        <p>
          This link will expire in 15 minutes.
        </p>

        <p>
          If you did not request this change, you can safely ignore this email.
        </p>
      </div>
    `,
  };
}
