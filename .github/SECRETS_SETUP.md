# GitHub Repository Secrets Setup

This document explains the GitHub repository secrets that need to be configured for the CI/CD pipeline to work.

## Required Secrets

### For Maintainers/Repository Admins

Go to **Settings** → **Secrets and variables** → **Actions** and add these repository secrets:

#### **Cloudflare Configuration**
- `CLOUDFLARE_API_TOKEN`: API token with Workers:Edit permissions
  - Get from: https://dash.cloudflare.com/profile/api-tokens
  - Click "Create Token" → "Custom Token"
  - Permissions: `Account:Cloudflare Workers:Edit`, `Zone:Zone Settings:Read`, `Zone:Zone:Read`

- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
  - Get from: https://dash.cloudflare.com/ (right sidebar)

#### **OpenAI Configuration** 
- `OPENAI_API_KEY_STAGING`: OpenAI API key for staging environment
  - Get from: https://platform.openai.com/api-keys
  - Can be the same as your personal key or a separate staging key

#### **Security Configuration**
- `WEBHOOK_SECRET_STAGING`: Random secure string for staging webhook validation
  - Generate with: `openssl rand -hex 32`
  - Used to validate webhooks from Telegram

## Public Configurations

These are **intentionally public** and do NOT need to be added as secrets:

- **Staging Bot Token**: `8358869176:AAGo9WKrpUnbLBD-Zq40DIPpfdoBZroPVfI`
  - This is the [@job_search_help_staging_bot](https://t.me/job_search_help_staging_bot) token
  - Safe to be public since it's only for testing
  - Already included in the GitHub Actions workflow

## Verification

After setting up secrets, the GitHub Actions should:

1. ✅ Deploy to staging on every push to `main`
2. ✅ Deploy to staging on every PR
3. ✅ Automatically set staging webhook
4. ✅ Comment on PRs with staging bot link

## Troubleshooting

### Common Issues:

**Deployment fails with "Invalid API token"**
- Check `CLOUDFLARE_API_TOKEN` has correct permissions
- Verify token hasn't expired

**Webhook setup fails**
- Check `WEBHOOK_SECRET_STAGING` is set
- Verify staging bot token is correct

**OpenAI API errors in staging**
- Check `OPENAI_API_KEY_STAGING` has sufficient credits
- Verify API key is valid and not rate-limited

## Production Secrets (Future)

When ready for production deployment, additional secrets will be needed:

- `TELEGRAM_BOT_TOKEN_PROD`: Production bot token (private)
- `OPENAI_API_KEY_PROD`: Production OpenAI key
- `WEBHOOK_SECRET_PROD`: Production webhook secret

These will be configured by project maintainers only.
