# ADR 003: AWS SES for Transactional Email

**Status:** Accepted  
**Date:** 2026-05-21

## Context

The app sends transactional emails (booking confirmations, reminders). We need an email provider. Options:
1. AWS SES via `@aws-sdk/client-ses`
2. SendGrid / Mailgun (third-party SMTP)
3. Nodemailer with self-hosted SMTP

## Decision

Use AWS SES with `@aws-sdk/client-ses` (native SDK, no SMTP).

## Rationale

- **Cost**: SES is significantly cheaper than SendGrid/Mailgun at scale (~$0.10/1000 emails vs $14.95+/month).
- **AWS-native**: Already deploying on AWS; using SES avoids a third-party dependency and keeps credentials within IAM.
- **No SMTP**: The `@aws-sdk/client-ses` SDK uses HTTPS API calls, not SMTP. This is more reliable and doesn't require port 25/587 to be open.
- **IAM integration**: On EC2/EB, can use an IAM instance role for SES permissions instead of hardcoded access keys.
- **Deliverability**: SES has high deliverability when configured with SPF, DKIM, and DMARC records.

## Trade-offs

- **SES sandbox**: New accounts are in SES sandbox (can only send to verified addresses). Must request production access before go-live.
- **Region-specific**: SES must be used in a region where it's available; verify the domain/email in the same region.
- **No templates API used**: We use raw HTML strings for simplicity. Could migrate to SES Template API for better maintainability.

## Implementation

1. Verify domain or email address in SES console.
2. Request production access (sandbox → production).
3. Set `SES_FROM_EMAIL`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` in EB environment.
4. Prefer IAM instance role over access keys in production.
5. Email templates live in `server/src/emails/templates/` as inline HTML functions.

## Consequences

- `sesEmailService.ts` wraps all SES calls; errors are logged but not thrown (email failure does not break booking).
- `reminderCron.ts` uses `node-cron` to fire the 24h reminder job every hour.
- Tests mock `@aws-sdk/client-ses` to avoid real SES calls in CI.
