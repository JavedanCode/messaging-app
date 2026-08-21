# Security Policy

## Supported Versions

Security fixes are applied to the latest version of the repository.

| Version        | Supported |
| -------------- | --------- |
| `main`         | Yes       |
| Older versions | No        |

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues.

If you discover a potential security vulnerability, please report it privately through the contact information available on the maintainer's GitHub profile.

When reporting a vulnerability, please include:

- A clear description of the vulnerability
- Steps to reproduce the issue
- The potential security impact
- Any relevant logs, screenshots, or proof-of-concept code
- A suggested mitigation, if you have one

Please allow reasonable time for the vulnerability to be investigated and addressed before publicly disclosing the issue.

## Security Considerations

This project provides an authentication foundation intended to be adapted to individual applications.

Before deploying an application based on this template, review and configure:

- Environment variables and secrets
- Database access and credentials
- CORS configuration
- OAuth provider configuration
- Cookie settings
- Rate limits
- Email delivery configuration
- Production HTTPS configuration
- Application-specific authorization requirements

Do not commit `.env` files, API keys, OAuth secrets, JWT secrets, database credentials, or other sensitive information to the repository.
