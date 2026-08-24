# Messaging App

A full-stack real-time messaging application built with React and Node.js.

The project was built as a production-oriented application rather than a simple CRUD exercise, with a focus on authentication, authorization, reusable backend architecture, real-time communication, database design, file handling, and a clean separation between the client and server.

## Live Demo

**Frontend:**  
https://javedancode.github.io/messaging-app/

**Backend API:**  
https://messaging-app-0rx7.onrender.com

> **Important — Local Account Registration**
>
> The deployed application currently does not have a custom domain configured for Resend email authentication. As a result, email delivery for local accounts may not work in the deployed environment.
>
> Local accounts depend on email verification and password-reset emails. If you are testing the deployed application, use an available OAuth authentication method if configured, or run the application locally with the required email configuration.
>
> This limitation is related to the deployment/email provider configuration and does not affect the application's local development setup.

---

## Features

### Authentication

- Local email/password authentication
- Google OAuth authentication
- GitHub OAuth authentication
- HTTP-only authentication cookies
- Short-lived access tokens
- Refresh token sessions
- Session revocation
- Email verification
- Password reset
- Password change handling
- Authentication middleware
- Protected routes
- Rate limiting
- Server-side validation with Zod

### User Management

- User profiles
- Usernames
- Display names
- Profile avatars
- Account management
- Session management

### Friend System

- Send friend requests
- Accept friend requests
- Reject friend requests
- Remove friends
- View friends
- View incoming requests
- View outgoing requests
- Real-time friendship events
- Online/offline presence for friends
- Multiple simultaneous connections per user

### Conversations

- Direct conversations
- Group conversations
- Conversation membership
- Group administrators
- Add members
- Remove members
- Promote members
- Change member roles
- Leave group conversations
- Ownership transfer when the group creator leaves
- Rename group conversations
- Conversation deletion
- Duplicate direct-conversation prevention

### Messaging

- Real-time text messaging
- Image messages
- File messages
- Edit messages
- Delete messages
- Message pagination
- Message ownership authorization
- Conversation membership authorization
- Real-time message creation
- Real-time message updates
- Real-time message deletion
- Typing indicators

### File Attachments

- File uploads up to 4 MB
- Image uploads
- Document uploads
- MIME-type validation
- Memory-based upload handling
- Cloudflare R2 object storage
- Signed attachment URLs
- Attachment cleanup when messages are deleted
- Cleanup of uploaded files when message creation fails

### Real-Time Communication

The application uses Socket.IO for real-time functionality.

Current socket functionality includes:

- User presence
- Online/offline events
- Multiple connections per user
- Conversation joining/leaving
- Typing indicators
- New message events
- Message update events
- Message deletion events
- Friendship events
- Conversation events
- Conversation membership events

Socket connections are authenticated using the same access-token authentication system used by the API.

---

## Tech Stack

### Frontend

- React
- Vite
- React Router
- TanStack React Query
- Socket.IO Client
- Tailwind CSS
- Lucide React
- Emoji Picker React

### Backend

- Node.js
- Express
- Prisma
- PostgreSQL
- Passport
- JWT
- Socket.IO
- Zod
- Multer
- bcrypt
- Vitest
- Supertest

### External Services

- Render — backend deployment
- GitHub Pages — frontend deployment
- Cloudflare R2 — file storage
- Resend — transactional email

---

## Authentication

Authentication uses HTTP-only cookies rather than exposing authentication tokens directly to client-side JavaScript.

The system uses:

- Access tokens for authenticated requests
- Refresh tokens for session renewal
- Hashed refresh tokens stored in the database
- Revocable sessions
- Secure cookie configuration in production
- OAuth through Passport
- Server-side authentication middleware

Socket connections authenticate using the access token stored in the authentication cookie.

---

## Authorization

Authorization is handled on the server.

Examples include:

- Users can only access conversations they belong to.
- Users can only edit their own messages.
- Users can only delete their own messages.
- Only group administrators can manage members.
- Only group administrators can rename groups.
- Group creators cannot be removed from their own groups.
- Only the receiver of a friend request can accept or reject it.
- Presence events are only sent to accepted friends.

Client-side restrictions are treated as UI behavior, not security boundaries.

---

## Database

The application uses PostgreSQL through Prisma.

The main models include:

- `User`
- `Account`
- `Session`
- `VerificationToken`
- `Conversation`
- `ConversationMember`
- `Message`
- `Friendship`

The friendship system uses a deterministic friendship key to ensure that two users cannot create duplicate friendship relationships regardless of which user sends the request.

Direct conversations use the same concept through a deterministic `directKey`.

---

## Real-Time Presence

Presence is maintained in memory on the Socket.IO server.

A user is considered online when they have at least one active socket connection.

Multiple connections from the same user are supported:

```text
User
 ├── Browser tab
 ├── Browser tab
 └── Mobile / another client
```

The user remains online until their final connection disconnects.

Presence events are only emitted to accepted friends.

> Presence is intentionally kept as application-level ephemeral state. It is not persisted in PostgreSQL because online status is inherently transient.

---

## File Storage

Attachments are stored in Cloudflare R2 rather than directly in the application server or PostgreSQL.

The upload flow is:

```text
Client
   ↓
Multer
   ↓
Validation
   ↓
Cloudflare R2
   ↓
Message record
```

The database stores attachment metadata and the R2 object key.

Clients receive short-lived signed URLs when they request access to an attachment.

---

## Validation

Request data is validated at the API boundary using Zod.

Validation covers:

- Request bodies
- Route parameters
- Query parameters
- Conversation creation
- Group names
- Friend request parameters
- Message content
- Message updates
- Pagination
- Conversation membership actions

Invalid requests are rejected before reaching the service layer.

---

## Error Handling

The backend uses a centralized application error system.

Expected application errors return structured HTTP responses with appropriate status codes.

Examples:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
```

Unexpected errors are handled by the application's global error middleware.

---

## Testing

The backend contains automated tests using Vitest and Supertest.

Test coverage includes:

- Authentication
- Registration
- Login
- Conversations
- Group management
- Conversation membership
- Messaging
- Message authorization
- Friendships
- Presence
- Socket authentication
- Real-time events

The project uses a dedicated test database through `.env.test`.

Run the test suite with:

```bash
npm test
```

Run tests in watch mode with:

```bash
npm run test:watch
```

Run linting with:

```bash
npm run lint
```

---

## Local Development

### Requirements

- Node.js
- PostgreSQL
- npm
- Cloudflare R2 credentials for attachment functionality
- Resend credentials for transactional email
- OAuth credentials if OAuth authentication is enabled

### Clone the repository

```bash
git clone https://github.com/JavedanCode/messaging-app.git
cd messaging-app
```

### Install dependencies

Backend:

```bash
cd server
npm install
```

Frontend:

```bash
cd ../client
npm install
```

### Environment Variables

The backend requires environment variables for:

- PostgreSQL
- JWT secrets
- Authentication configuration
- OAuth providers
- Resend
- Cloudflare R2
- Client URL
- Server configuration

The frontend requires:

```env
VITE_API_URL=http://localhost:3000
```

Use the project's environment example files as the starting point for local configuration.

### Database

From the server directory:

```bash
npx prisma generate
npx prisma migrate dev
```

Start the backend:

```bash
npm run dev
```

Start the frontend:

```bash
cd ../client
npm run dev
```

---

## Deployment

The frontend is deployed using GitHub Pages.

The backend is deployed using Render.

The production architecture is:

```text
                    ┌─────────────────────┐
                    │    GitHub Pages     │
                    │      React App      │
                    └──────────┬──────────┘
                               │
                    HTTPS / REST / Socket.IO
                               │
                               ▼
                    ┌─────────────────────┐
                    │       Render        │
                    │   Express / Node    │
                    └───────┬─────┬───────┘
                            │     │
                 ┌──────────┘     └──────────┐
                 ▼                           ▼
        ┌────────────────┐          ┌────────────────┐
        │   PostgreSQL   │          │  Cloudflare R2 │
        └────────────────┘          └────────────────┘

                            │
                            ▼
                       ┌─────────┐
                       │ Resend  │
                       └─────────┘
```

---

## Known Deployment Limitation

The application currently uses Resend for transactional email such as:

- Email verification
- Password reset
- Other authentication-related email

Resend requires a domain that the application owner controls so that the necessary DNS records can be configured and the sending domain can be verified.

The current deployment uses:

```text
GitHub Pages
https://javedancode.github.io/messaging-app/

Render
https://messaging-app-0rx7.onrender.com
```

No separately owned custom domain has been configured for Resend.

Therefore, **local email/password accounts may not be usable on the deployed instance when email verification or password-reset emails are required.**

This is a deployment configuration limitation, not a limitation of the authentication implementation itself.

For development, the application can be run locally with the appropriate Resend configuration.

---

## Security Considerations

The application implements several security-oriented practices:

- HTTP-only authentication cookies
- Secure cookies in production
- Password hashing with bcrypt
- Hashed refresh tokens
- Revocable sessions
- Server-side authorization
- Request validation
- Rate limiting
- OAuth authentication
- Restricted file MIME types
- File size limits
- Signed attachment URLs
- Conversation membership checks
- Message ownership checks

Security decisions are enforced on the server rather than relying on frontend behavior.

---

## Project Goals

This project was built to practice and demonstrate production-oriented full-stack development.

The primary goals were:

1. Build a reusable authentication foundation.
2. Design a clean RESTful backend.
3. Separate business logic from HTTP controllers.
4. Implement real-time communication with Socket.IO.
5. Build secure conversation and message authorization.
6. Handle file uploads using external object storage.
7. Implement a friendship and presence system.
8. Maintain automated backend tests.
9. Deploy both the frontend and backend.
10. Build an architecture that can be extended rather than discarded after the assignment.

---

## Status

The core application is complete and deployed.

Current functionality includes:

- Authentication
- OAuth
- User accounts
- Friendships
- Online presence
- Direct conversations
- Group conversations
- Group administration
- Real-time messaging
- Typing indicators
- Message editing
- Message deletion
- File and image attachments
- Cloud storage
- Automated tests
- Frontend deployment
- Backend deployment

Future improvements may include additional production infrastructure, improved email/domain configuration, expanded realtime functionality, and further frontend refinement.

---

## License

This project is available for educational and portfolio purposes.
