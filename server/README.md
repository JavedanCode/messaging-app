# Messaging App API

Backend API for the Messaging App. It provides authentication, account management, friendships, direct and group conversations, messages, attachments, presence, and realtime Socket.IO events.

## Stack

- Node.js and Express
- PostgreSQL and Prisma
- JWT access and refresh tokens in HTTP-only cookies
- Passport local, Google, and GitHub authentication
- Zod request validation
- Socket.IO realtime events
- Vitest and Supertest tests

## Features

### Authentication and accounts

- Local registration and login with email verification
- Google and GitHub OAuth login and account linking
- Short-lived access tokens and rotating refresh tokens
- Server-side session tracking and revocation
- Password changes and password reset
- Email address changes with verification
- Profile and username updates
- Account deletion

### Messaging

- Direct conversations
- Group conversations with administrators and members
- Add, remove, and leave group members
- Promote and demote group administrators
- Rename groups
- Text messages and file attachments
- Message editing and deletion
- Typing indicators
- Online and offline presence for friends

## Project Structure

```text
server/
├── prisma/          Database schema and migrations
├── src/
│   ├── config/      Environment, cookies, Passport, and storage config
│   ├── controllers/ HTTP request and response handlers
│   ├── db/          Prisma client setup
│   ├── emails/      Email templates
│   ├── errors/      Application error types
│   ├── middleware/  Authentication, validation, uploads, and error handling
│   ├── routes/      HTTP route definitions
│   ├── schemas/     Zod request schemas
│   ├── services/    Business logic and persistence operations
│   ├── sockets/     Socket.IO authentication, rooms, and events
│   ├── strategies/  Passport authentication strategies
│   └── utils/       Shared utilities
└── tests/           API, service, strategy, and socket tests
```

## Requirements

- Node.js 22 or newer
- npm
- PostgreSQL
- A database for local development
- A separate database for tests

Google OAuth, GitHub OAuth, Resend email delivery, and Cloudflare R2 attachments are optional integrations.

## Installation

From the `server` directory:

```bash
npm install
```

Create `.env` from `.env.example` and configure the database, frontend URL, token secrets, and email settings. Keep `.env` and all credentials out of version control.

For local development, the important variables are:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
CLIENT_URL="http://localhost:5173"
JWT_ACCESS_SECRET="long-access-token-secret"
JWT_REFRESH_SECRET="long-refresh-token-secret"
RESEND_API_KEY="your-resend-api-key"
EMAIL_FROM="sender@example.com"
PASSWORD_RESET_URL="http://localhost:5173/reset-password"
EMAIL_CHANGE_URL="http://localhost:5173/change-email"
```

The complete variable list is documented in `.env.example`.

## Database

Apply development migrations and generate the Prisma client:

```bash
npm run db:migrate
npm run db:generate
```

For deployed environments, apply committed migrations with:

```bash
npm run db:migrate:deploy
```

Optional seed data can be created with:

```bash
npm run db:seed
```

## Running the API

```bash
npm run dev
```

The API runs at `http://localhost:3000` by default. Use `GET /health` to confirm that it is available.

## HTTP API

Authentication is stored in HTTP-only cookies. Access-token authentication is required for account, friendship, conversation, and message endpoints unless noted otherwise.

### Authentication routes

| Method | Endpoint                | Purpose                               |
| ------ | ----------------------- | ------------------------------------- |
| `POST` | `/auth/register`        | Create a local account                |
| `POST` | `/auth/login`           | Log in with email and password        |
| `POST` | `/auth/logout`          | Revoke the current refresh session    |
| `POST` | `/auth/refresh`         | Rotate the refresh token              |
| `GET`  | `/auth/me`              | Return the authenticated user         |
| `POST` | `/auth/email/verify`    | Verify an email address               |
| `POST` | `/auth/email/resend`    | Resend email verification             |
| `POST` | `/auth/password/forgot` | Request a password reset email        |
| `POST` | `/auth/password/reset`  | Set a new password with a reset token |
| `GET`  | `/auth/google`          | Start Google OAuth                    |
| `GET`  | `/auth/github`          | Start GitHub OAuth                    |

### User routes

| Method   | Endpoint                  | Purpose                   |
| -------- | ------------------------- | ------------------------- |
| `PATCH`  | `/users/me`               | Update profile fields     |
| `PATCH`  | `/users/me/password`      | Change the local password |
| `GET`    | `/users/search`           | Search for users          |
| `PATCH`  | `/users/me/username`      | Change username           |
| `PATCH`  | `/users/me/email`         | Request an email change   |
| `POST`   | `/users/me/email/confirm` | Confirm an email change   |
| `DELETE` | `/users/me`               | Delete the account        |

### Friendship routes

| Method   | Endpoint                                 | Purpose                |
| -------- | ---------------------------------------- | ---------------------- |
| `POST`   | `/friends/request/:userId`               | Send a friend request  |
| `PATCH`  | `/friends/requests/:friendshipId/accept` | Accept a request       |
| `PATCH`  | `/friends/requests/:friendshipId/reject` | Reject a request       |
| `DELETE` | `/friends/:userId`                       | Remove a friendship    |
| `GET`    | `/friends`                               | List friends           |
| `GET`    | `/friends/requests/incoming`             | List incoming requests |
| `GET`    | `/friends/requests/outgoing`             | List outgoing requests |

### Conversation and message routes

Conversation routes create, list, inspect, and delete conversations. Message routes create text or attachment messages, list messages, edit text messages, and delete messages. Group-management routes add, remove, or promote members, rename groups, and allow members to leave.

All conversation and message paths are rooted at `/conversations`.

## Realtime API

Clients connect to the Socket.IO server using the same origin and authentication cookies. Each authenticated socket joins a personal `user:<id>` room. Conversation clients can join `conversation:<id>` rooms after membership is verified.

The server emits:

- `message:new`
- `message:updated`
- `message:deleted`
- `friendship:request`
- `friendship:accepted`
- `friendship:rejected`
- `friendship:removed`
- `conversation:updated`
- `conversation:member:added`
- `conversation:member:removed`
- `conversation:member:role:updated`
- `presence:online`
- `presence:offline`
- `typing:start`
- `typing:stop`

## Testing and Checks

Configure `.env.test` with a separate PostgreSQL database. Apply test migrations when needed:

```bash
npm run test:migrate
npm run test:generate
```

Run the full validation suite:

```bash
npm run check
```

Individual checks are also available:

```bash
npm test
npm run lint
npm run format:check
```

The GitHub Actions workflow runs these checks against PostgreSQL on pushes and pull requests targeting `main`.

## Security

Do not commit environment files, database credentials, OAuth secrets, JWT secrets, email API keys, or storage credentials. Report potential vulnerabilities privately as described in `.github/SECURITY.md`.
