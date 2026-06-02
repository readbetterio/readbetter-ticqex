# Security Policy

We take the security of Ticqex seriously. Thank you for helping keep the project
and its users safe.

## Supported versions

Ticqex is pre-1.0 and under active development. Security fixes are applied to the
`main` branch and the latest release. Older releases are not maintained.

## Reporting a vulnerability

**Please do not open public issues for security vulnerabilities.**

Report privately using **GitHub Security Advisories**: open a draft advisory via
the repository's **Security → Report a vulnerability** tab. This keeps the report
private until a fix is published, and lets us collaborate on a patch with you.

Please include:

- A description of the issue and its impact.
- Steps to reproduce (proof of concept if possible).
- Affected version/commit and environment details.

## What to expect

- **Acknowledgement** within 3 business days.
- **Status update** within 7 business days, including an initial assessment.
- **Coordinated disclosure**: we'll work with you on a fix and a disclosure
  timeline, and credit you in the advisory unless you prefer to remain anonymous.

## Scope

In scope: authentication and session handling, API key handling, webhook
signature verification, access control on `/api/v1/*`, SQL/RLS issues, and
secret/credential exposure.

Out of scope: vulnerabilities in third-party dependencies (report upstream),
issues requiring physical access to a user's machine, and findings against
self-hosted misconfigurations that do not stem from the default setup.
