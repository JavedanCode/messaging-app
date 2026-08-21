# Express Auth API Template

A production-oriented, reusable authentication and user-management REST API built with **Express**, **PostgreSQL**, **Prisma**, **Passport**, **JWT**, **Zod**, and secure HTTP-only cookies.

This project is designed to be used as a **starting point for future web applications**. It provides the authentication and account-management foundation so application-specific features can be built on top of it without repeatedly rebuilding authentication infrastructure.

The template is intentionally modular: authentication, sessions, OAuth, validation, email workflows, and user management are separated into focused modules that can be reused or extended as needed.

---

## Features

### Authentication

- Local email/password authentication
- Google OAuth 2.0
- GitHub OAuth
- JWT access tokens
- JWT refresh tokens
- HTTP-only authentication cookies
- Refresh-token rotation
- Server-side session tracking
- Session revocation
- Authentication middleware
- Secure logout
- Password changes
- Password reset flow
- Email verification
- Email address change verification
- Account deletion

### Security

- Password hashing with `bcryptjs`
- Separate access-token and refresh-token secrets
- Refresh-token hashes stored in the database instead of raw tokens
- Refresh-token rotation and reuse detection
- Session revocation after password changes and password resets
- Cryptographically secure verification codes and tokens
- OAuth state validation using `crypto.timingSafeEqual`
- Rate limiting on authentication-sensitive endpoints
- Zod request validation
- Helmet security headers
- Credentialed CORS restricted to the configured frontend origin
- Centralized error handling
- Prisma database constraints as the final protection against race conditions
- Generic authentication errors that avoid unnecessarily exposing account information
- Secure cookie configuration for production environments

### Developer Experience

- ES modules
- Prisma ORM
- PostgreSQL
- Vitest
- Supertest
- ESLint
- Prettier
- Environment validation with Zod
- Modular service/controller architecture
- Reusable authentication foundation
- Comprehensive automated test suite

---

## Why This Template Exists

Authentication is infrastructure.

It is something almost every full-stack application needs, but it is also an area where small implementation mistakes can create serious security problems.

Instead of rebuilding registration, login, sessions, password resets, email verification, OAuth, rate limiting, and account management for every application, this project provides a reusable foundation.

The intended workflow is:

```text
                 Express Auth API
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   Authentication   User Accounts   Sessions
        │              │              │
        └──────────────┼──────────────┘
                       │
                Your Application
                       │
        ┌──────────────┼──────────────┐
        │              │              │
     Posts          Messages        Projects
```

Application-specific functionality should be built **on top of** the authentication layer rather than tightly coupling business logic to it.

For example, a future application could add:

```text
src/
├── controllers/
│   ├── auth.controller.js
│   ├── oauth.controller.js
│   └── user.controller.js
│
├── services/
│   ├── auth.service.js
│   ├── session.service.js
│   ├── user.service.js
│   └── ...
│
└── ...
```

and then introduce its own application-specific modules without having to redesign authentication.

---

## Architecture

The API follows a layered architecture:

```text
HTTP Request
     │
     ▼
   Routes
     │
     ▼
 Middleware
 ├── Rate limiting
 ├── Authentication
 ├── Validation
 └── Passport
     │
     ▼
 Controllers
     │
     ▼
 Services
     │
     ▼
 Prisma
     │
     ▼
 PostgreSQL
```

### Responsibilities

| Layer          | Responsibility                                                  |
| -------------- | --------------------------------------------------------------- |
| `routes/`      | Defines HTTP endpoints and middleware composition               |
| `middleware/`  | Authentication, validation, rate limiting, error handling       |
| `controllers/` | Handles HTTP requests and responses                             |
| `services/`    | Contains application and authentication business logic          |
| `strategies/`  | Passport authentication strategies and OAuth profile processing |
| `schemas/`     | Zod request validation schemas                                  |
| `config/`      | Environment, cookies, and Passport configuration                |
| `db/`          | Prisma client/database configuration                            |
| `emails/`      | Email content/templates                                         |
| `errors/`      | Application-specific error types                                |
| `utils/`       | Small reusable utility functions                                |

The goal is to keep HTTP concerns, authentication logic, persistence, and reusable utilities from becoming unnecessarily intertwined.

---

# Authentication Architecture

## Local Authentication

The local login flow is:

```text
POST /auth/login
       │
       ▼
Request validation
       │
       ▼
Rate limiter
       │
       ▼
Passport Local Strategy
       │
       ├── Find user
       ├── Verify password
       └── Verify email
       │
       ▼
Create session
       │
       ├── Generate access token
       └── Generate refresh token
       │
       ▼
HTTP-only cookies
```

The API does not return authentication tokens in the JSON response.

Instead, tokens are stored in HTTP-only cookies.

---

## Access Tokens

Access tokens are short-lived JWTs containing the authenticated user's identifier.

They are used to authenticate normal API requests.

```text
Client
  │
  │ accessToken cookie
  ▼
authenticate middleware
  │
  ├── Verify JWT
  ├── Find user
  └── Attach user to req.user
```

---

## Refresh Tokens

Refresh tokens are longer-lived JWTs associated with a server-side session.

The database stores a SHA-256 hash of the refresh token rather than the raw token.

A refresh request:

```text
Refresh Token
      │
      ▼
Verify JWT
      │
      ▼
Find Session
      │
      ▼
Compare Token Hash
      │
      ▼
Rotate Token
      │
      ├── Replace stored hash
      ├── Update lastUsedAt
      └── Extend expiration
      │
      ▼
Issue New Access + Refresh Tokens
```

If a previously rotated refresh token is reused, the session is revoked.

This gives the application server-side control over otherwise stateless JWT refresh credentials.

---

# OAuth Architecture

Google and GitHub authentication are implemented through Passport.

The flow is intentionally separated into multiple stages:

```text
OAuth Provider
      │
      ▼
Passport Strategy
      │
      ▼
Provider Profile Processor
      │
      ▼
OAuth Service
      │
      ├── Find existing account
      ├── Find existing user
      ├── Generate username
      └── Create user + account
      │
      ▼
Create Authentication Session
      │
      ▼
HTTP-only Cookies
```

Provider-specific profile processing is kept separate from database operations so additional OAuth providers can be added without placing provider-specific logic inside the core OAuth service.

Google and GitHub are optional. The application only configures a provider when its required environment variables are present.

---

# Project Structure

```text
server/
├── generated/
│   └── prisma/
│
├── prisma/
│   └── schema.prisma
│
├── src/
│   ├── config/
│   │   ├── cookies.js
│   │   ├── env.js
│   │   └── passport.js
│   │
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── oauth.controller.js
│   │   └── user.controller.js
│   │
│   ├── db/
│   │   └── prisma.js
│   │
│   ├── emails/
│   │   ├── email-change.js
│   │   ├── email-verification.js
│   │   └── password-reset.js
│   │
│   ├── errors/
│   │   └── AppError.js
│   │
│   ├── middleware/
│   │   ├── authenticate.js
│   │   ├── error-handler.js
│   │   ├── passport.js
│   │   ├── rate-limit.js
│   │   └── validate.js
│   │
│   ├── routes/
│   │   ├── auth.routes.js
│   │   └── user.routes.js
│   │
│   ├── schemas/
│   │   ├── auth.schema.js
│   │   ├── common.schema.js
│   │   └── user.schema.js
│   │
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── email-change.service.js
│   │   ├── email-verification.service.js
│   │   ├── email.service.js
│   │   ├── oauth.service.js
│   │   ├── oauth.state.service.js
│   │   ├── password-reset.service.js
│   │   ├── password.service.js
│   │   ├── session.service.js
│   │   ├── token.service.js
│   │   ├── user.service.js
│   │   └── verification-token.service.js
│   │
│   ├── strategies/
│   │   ├── github-profile.js
│   │   ├── github.strategy.js
│   │   ├── google-profile.js
│   │   ├── google.strategy.js
│   │   └── local.strategy.js
│   │
│   ├── utils/
│   │   └── duration.js
│   │
│   ├── app.js
│   └── server.js
│
├── tests/
│   ├── auth/
│   ├── strategies/
│   ├── users/
│   └── setup.js
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

# Requirements

Before starting, make sure you have:

- Node.js
- npm
- PostgreSQL
- A PostgreSQL database for the application
- A PostgreSQL database for tests

Optional:

- Google OAuth credentials
- GitHub OAuth credentials
- Resend account/API key

---

# Installation

Clone the repository:

```bash
git clone https://github.com/JavedanCode/express-auth-api-template.git
```

Enter the project:

```bash
cd express-auth-api-template
```

Install dependencies:

```bash
npm install
```

---

# Environment Configuration

Create your local environment file from the provided example:

```text
.env.example
```

Copy it to:

```text
.env
```

Then configure the required values.

The repository intentionally does **not** include real credentials.

## Required Variables

```env
NODE_ENV=development
PORT=3000

DATABASE_URL="postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME"

CLIENT_URL="http://localhost:5173"

JWT_ACCESS_SECRET="your-access-token-secret"
JWT_REFRESH_SECRET="your-refresh-token-secret"

RESEND_API_KEY="your-resend-api-key"
EMAIL_FROM="your-sender@example.com"

PASSWORD_RESET_URL="http://localhost:5173/reset-password"
EMAIL_CHANGE_URL="http://localhost:5173/change-email"
```

JWT secrets should be long, unpredictable values and should be different from one another.

## OAuth Variables

Google and GitHub authentication are optional.

### Google

```env
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"
```

### GitHub

```env
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GITHUB_CALLBACK_URL="http://localhost:3000/auth/github/callback"
```

If a provider is not configured, its Passport strategy is simply not registered.

---

# Database Setup

The project uses PostgreSQL through Prisma.

After configuring `DATABASE_URL`, run:

```bash
npx prisma migrate dev
```

Generate the Prisma client if necessary:

```bash
npx prisma generate
```

The database schema is located at:

```text
prisma/schema.prisma
```

For production deployments, use Prisma migrations rather than manually modifying the production database schema.

---

# Running the Application

Start the development server:

```bash
npm run dev
```

Start the application normally:

```bash
npm start
```

The API will be available at:

```text
http://localhost:3000
```

The health endpoint can be used to verify that the API is running:

```http
GET /health
```

Example response:

```json
{
  "success": true,
  "message": "API is running."
}
```

---

# Testing

The project includes integration and unit tests using Vitest and Supertest.

Tests use a separate environment file:

```text
.env.test
```

Make sure the test database is configured before running the test suite.

Run all tests:

```bash
npm test
```

Run a specific test file:

```bash
npm test -- tests/auth/login.test.js
```

The test suite covers authentication, sessions, OAuth profile processing, email verification, password reset, account management, validation, rate limiting, and other authentication behavior.

---

# Code Quality

Run ESLint:

```bash
npm run lint
```

Format the project:

```bash
npm run format
```

Check formatting without modifying files:

```bash
npm run format:check
```

Before opening a pull request or using the template as the foundation for another project, it is recommended to run:

```bash
npm test
npm run lint
npm run format:check
```

---

# API Reference

All authentication and account-management endpoints are grouped into two primary route namespaces:

```text
/auth
/users
```

Authentication state is primarily maintained through secure HTTP-only cookies.

---

## Authentication

### `POST /auth/register`

Creates a new local user account.

#### Request

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "StrongPassword123!"
}
```

A successful registration creates the account and sends an email verification message.

#### Response

```json
{
  "success": true,
  "message": "Registration successful. Please verify your email address.",
  "user": {
    "id": "...",
    "username": "johndoe",
    "email": "john@example.com",
    "displayName": null,
    "avatarUrl": null,
    "emailVerifiedAt": null
  }
}
```

---

## `POST /auth/login`

Authenticates a verified local user.

```json
{
  "email": "john@example.com",
  "password": "StrongPassword123!"
}
```

Successful authentication sets:

- `accessToken`
- `refreshToken`

as HTTP-only cookies.

Authentication tokens are not returned in the JSON response.

---

## `POST /auth/logout`

Logs the current session out and clears authentication cookies.

The endpoint is intentionally safe to call even when the refresh token is missing, invalid, or expired.

---

## `POST /auth/refresh`

Rotates the current refresh token and issues a new access token.

The refresh token must be supplied through the authentication cookie.

---

## `GET /auth/me`

Returns the currently authenticated user.

Requires authentication.

---

# Email Verification

## `POST /auth/email/verify`

Verifies a user's email address.

```json
{
  "email": "john@example.com",
  "code": "123456"
}
```

Verification codes are:

- Cryptographically generated
- Hashed before database storage
- Short-lived
- Single-use
- Protected by resend cooldowns

---

## `POST /auth/email/resend`

Requests another verification email.

The endpoint intentionally returns a generic success response so that it does not unnecessarily reveal whether a specific email belongs to an account.

---

# Password Reset

## `POST /auth/password/forgot`

Requests a password reset email.

```json
{
  "email": "john@example.com"
}
```

The endpoint intentionally uses a generic response regardless of whether the account exists.

---

## `POST /auth/password/reset`

Resets a password using a valid reset token.

```json
{
  "token": "reset-token",
  "newPassword": "NewStrongPassword123!"
}
```

Resetting a password also revokes the user's active sessions.

---

# User Account Management

All user-management endpoints require authentication.

---

## `PATCH /users/me`

Updates the user's profile.

```json
{
  "displayName": "John Doe",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

At least one profile field must be supplied.

---

## `PATCH /users/me/password`

Changes the authenticated user's password.

```json
{
  "currentPassword": "CurrentPassword123!",
  "newPassword": "NewPassword123!"
}
```

Changing the password revokes all active sessions.

---

## `PATCH /users/me/username`

Changes the username.

```json
{
  "username": "newusername"
}
```

---

## `PATCH /users/me/email`

Requests an email address change.

```json
{
  "email": "new@example.com"
}
```

The new address must be confirmed through the verification email before the account's email address is changed.

---

## `POST /users/me/email/confirm`

Confirms an email address change.

```json
{
  "token": "email-change-token"
}
```

---

## `DELETE /users/me`

Deletes the authenticated user's account.

Local-password accounts must provide the current password.

```json
{
  "currentPassword": "CurrentPassword123!"
}
```

OAuth-only accounts do not have a local password and therefore do not require password confirmation.

---

# OAuth Endpoints

## Google

Start authentication:

```http
GET /auth/google
```

Google authorization:

```http
GET /auth/google/authorize
```

Google callback:

```http
GET /auth/google/callback
```

## GitHub

Start authentication:

```http
GET /auth/github
```

GitHub authorization:

```http
GET /auth/github/authorize
```

GitHub callback:

```http
GET /auth/github/callback
```

OAuth authentication uses a cryptographically random state value stored in an HTTP-only cookie and validated during the callback.

---

# Error Handling

The API uses a consistent error response structure.

Example:

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "Email is already registered."
  }
}
```

Validation errors additionally include field-level details:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [
      {
        "field": "password",
        "message": "Password must be at least 8 characters long."
      }
    ]
  }
}
```

Application-specific errors use `AppError`.

Database errors that represent expected conditions, such as unique-constraint violations, are translated into appropriate API responses by the centralized error handler.

Unexpected errors are intentionally exposed as a generic:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred."
  }
}
```

---

# Validation

Request bodies are validated using Zod before reaching controllers.

The validation flow is:

```text
Request
   │
   ▼
Zod Schema
   │
   ├── Invalid → 400 Validation Error
   │
   └── Valid
        │
        ▼
    req.body
        │
        ▼
    Controller
```

Validation schemas are kept separate from business logic.

Common validation rules are shared through:

```text
src/schemas/common.schema.js
```

This prevents rules such as password requirements from being duplicated across authentication endpoints.

---

# Rate Limiting

Authentication-sensitive endpoints use dedicated rate limiters.

Current protected operations include:

| Operation                 |     Window | Limit |
| ------------------------- | ---------: | ----: |
| Login                     | 15 minutes |    10 |
| Registration              |     1 hour |     5 |
| Refresh                   | 15 minutes |    20 |
| Email verification        | 15 minutes |    10 |
| Verification email resend |     1 hour |     5 |
| Password reset request    | 15 minutes |     5 |
| Password reset            | 15 minutes |     5 |

These limits are intended as sensible defaults for the template and should be reviewed according to the requirements and threat model of the application where the template is deployed.

---

# Security Model

This template is designed with several security boundaries in mind.

## Passwords

Passwords are never stored in plaintext.

They are hashed using `bcryptjs` before being persisted.

```text
Plaintext password
       │
       ▼
    bcrypt
       │
       ▼
Password hash
       │
       ▼
   PostgreSQL
```

---

## Refresh Tokens

Raw refresh tokens are not stored in the database.

Instead:

```text
Refresh Token
      │
      ▼
   SHA-256
      │
      ▼
Token Hash
      │
      ▼
 PostgreSQL
```

This means database access alone does not expose usable refresh credentials.

---

## Token Rotation

Every successful refresh operation replaces the stored refresh-token hash.

A previously used refresh token therefore cannot be used again.

If token reuse is detected, the associated session is revoked.

---

## Session Revocation

Sessions can be revoked individually or for an entire user.

All active sessions are revoked when:

- A user changes their password
- A user resets their password
- A refresh-token reuse attempt is detected

This provides server-side invalidation even though authentication uses JWTs.

---

## Cookies

Authentication cookies are configured with:

- `httpOnly`
- `sameSite`
- `secure` in production
- Restricted paths
- Explicit expiration

The access token and refresh token use separate cookie configurations.

---

## OAuth State Protection

OAuth flows generate a cryptographically random state value.

The callback verifies the received state using a timing-safe comparison before accepting the authentication result.

This helps protect the OAuth callback from forged or unsolicited authorization responses.

---

## Email Security

Verification and reset credentials are not stored in plaintext.

The system uses:

- Cryptographically secure random values
- SHA-256 hashes
- Expiration times
- Single-use tokens
- Request cooldowns

Password-reset and email-change flows also invalidate previously active tokens where appropriate.

---

# CORS

The API allows credentialed cross-origin requests only from the configured frontend origin:

```env
CLIENT_URL="http://localhost:5173"
```

The frontend must therefore be explicitly configured as the allowed origin.

For production deployments, `CLIENT_URL` should point to the actual frontend origin rather than using a wildcard.

---

# Email Delivery

Email delivery is implemented through Resend.

The email service is intentionally isolated behind:

```text
src/services/email.service.js
```

Application services do not need to know how email is delivered.

They simply call:

```js
await sendEmail({
  to,
  subject,
  html,
});
```

This keeps email infrastructure replaceable if a future application needs a different provider.

---

# Extending the Template

The authentication layer is intended to remain independent from application-specific functionality.

For example, if this template is used for a social application, application-specific functionality could be organized separately:

```text
src/
├── controllers/
│   ├── auth.controller.js
│   ├── oauth.controller.js
│   ├── user.controller.js
│   ├── post.controller.js
│   └── comment.controller.js
│
├── routes/
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── post.routes.js
│   └── comment.routes.js
│
└── services/
    ├── auth.service.js
    ├── user.service.js
    ├── session.service.js
    ├── post.service.js
    └── comment.service.js
```

The authentication system should not need to know what the application does with authenticated users.

Instead, application-specific routes can simply use:

```js
authenticate;
```

to establish the authenticated user context.

---

# Customizing the Template

When starting a new project from this repository, the recommended process is:

### 1. Clone the template

```bash
git clone https://github.com/JavedanCode/express-auth-api-template.git my-new-project
```

### 2. Create a new repository

Create a new Git repository for the actual application rather than continuing development directly on the template repository.

### 3. Configure the environment

Create `.env` from `.env.example`.

### 4. Configure PostgreSQL

Create a project-specific database and update `DATABASE_URL`.

### 5. Configure the frontend

Set:

```env
CLIENT_URL="..."
```

### 6. Configure email

Set the Resend API key and sender address.

### 7. Configure OAuth if required

Add Google and/or GitHub credentials if the application needs social authentication.

### 8. Update the Prisma schema

Add application-specific models while preserving the authentication models and relationships required by the application.

### 9. Add application-specific routes and services

Keep new business logic separate from the authentication infrastructure.

---

# Production Considerations

This template provides the application-level foundation for production-oriented authentication, but deploying a real application still requires environment and infrastructure configuration appropriate for the deployment.

Before deploying:

- Use HTTPS/TLS
- Set `NODE_ENV=production`
- Use strong, unique JWT secrets
- Never commit `.env`
- Use production PostgreSQL credentials
- Configure the correct frontend origin
- Configure OAuth callback URLs for the production domain
- Configure a production email sender
- Review rate limits for the application's traffic and threat model
- Keep Node.js and dependencies up to date
- Run database migrations as part of the deployment process
- Use appropriate process management and infrastructure for the hosting environment
- Monitor application errors and authentication activity
- Review the application's CORS, cookie, and proxy configuration

The template is deliberately not tied to a specific hosting provider.

---

# Development Philosophy

This project follows a few principles:

### Keep authentication infrastructure reusable

Authentication should not depend on whether the application is a blog, social network, messaging application, dashboard, marketplace, or something else.

### Prefer clear service boundaries

Controllers handle HTTP.

Services handle business logic.

Prisma handles persistence.

Middleware handles cross-cutting request concerns.

### Validate at the boundary

Incoming data is validated before it reaches application logic.

### Let the database enforce integrity

Application-level checks provide useful errors, but database constraints remain the final authority for uniqueness and relational integrity.

### Keep security decisions explicit

Authentication behavior that is security-sensitive should be easy to locate and understand.

### Avoid unnecessary abstraction

The template is modular, but it intentionally avoids introducing abstractions that do not provide meaningful value.

---

# Contributing

Contributions are welcome.

If you find a bug, security issue, documentation problem, or improvement that would make the template more useful to other developers, feel free to open an issue or submit a pull request.

When contributing:

1. Keep changes focused.
2. Preserve the existing architecture unless there is a strong reason to change it.
3. Add or update tests for behavioral changes.
4. Run the test suite.
5. Run ESLint.
6. Run the formatter.
7. Avoid introducing application-specific functionality into the authentication core.
8. Document security-sensitive architectural changes.

For significant architectural changes, open an issue first so the proposed approach can be discussed before implementation.

---

# Security Issues

Please do not publicly disclose a potentially exploitable security vulnerability in an issue before giving the maintainer an opportunity to investigate it.

For serious security issues, contact the repository maintainer privately through the contact information available on the maintainer's GitHub profile.

---

# License

This project is licensed under the **MIT License**.

You are free to:

- Use the template in personal projects
- Use the template in commercial projects
- Modify the source code
- Distribute modified versions
- Build proprietary applications using the template

See the `LICENSE` file for the complete license text.

---

# Acknowledgements

This project is built on the following open-source technologies:

- Express
- Prisma
- PostgreSQL
- Passport
- JSON Web Tokens
- Zod
- bcryptjs
- Helmet
- express-rate-limit
- Resend
- Vitest
- Supertest

---

# Project Status

This repository is intended to serve as a **reusable authentication API foundation** rather than a finished end-user application.

The authentication and user-management functionality is implemented and covered by automated tests. The template can be extended with application-specific functionality as required.

---

## Author

**JavedanCode**

Built as a reusable foundation for future full-stack applications and client projects.

If you find the project useful, feel free to fork it, adapt it, and build something great with it.
