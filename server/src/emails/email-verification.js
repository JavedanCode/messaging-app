export function buildEmailVerificationEmail({ code }) {
  return {
    subject: 'Verify your email address',
    html: `
      <div>
        <h1>Verify your email address</h1>
        <p>Use the verification code below to verify your email address:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">
          ${code}
        </p>
        <p>This code expires in 15 minutes.</p>
        <p>If you did not create this account, you can safely ignore this email.</p>
      </div>
    `,
  };
}
