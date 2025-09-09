# GitHub Repository Secrets Setup

This document explains the GitHub repository secrets needed for automated staging deployments.

## 🎯 Quick Overview

The repository uses **public staging bot** for easy collaboration:
- **Staging Bot**: [@job_search_help_staging_bot](https://t.me/job_search_help_staging_bot) 
- **Token**: `8358869176:AAGo9WKrpUnbLBD-Zq40DIPpfdoBZroPVfI` (public - safe for testing)
- **Auto-deploys**: Every push to `main` and PR opens

## 🔑 Required Secrets

### For Repository Maintainers

Go to **Settings** → **Secrets and variables** → **Actions** and add these repository secrets:

#### **Cloudflare Configuration**
- `CLOUDFLARE_API_TOKEN`: API token with Workers:Edit permissions
  - Get from: https://dash.cloudflare.com/profile/api-tokens
  - Click "Create Token" → "Custom Token"
  - Permissions: `Account:Cloudflare Workers:Edit`, `Zone:Zone Settings:Read`, `Zone:Zone:Read`

- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
  - Get from: https://dash.cloudflare.com/ (right sidebar)
  - Format: `c8f793821e2b05647f669d4f13b51f0e`

#### **OpenAI Configuration** 
- `OPENAI_API_KEY_STAGING`: OpenAI API key for staging environment
  - Get from: https://platform.openai.com/api-keys
  - Can be the same as your personal key or a separate staging key

## ✅ Public Configurations (No Secrets Needed)

These are **intentionally public** and already configured in the codebase:

- **Staging Bot Token**: `8358869176:AAGo9WKrpUnbLBD-Zq40DIPpfdoBZroPVfI`
- **Staging Webhook Secret**: `3c8a4efeb4b36eed52758eb194300a89d3074567299b3a826ea0922100a16752`
- **Staging Bot Username**: [@job_search_help_staging_bot](https://t.me/job_search_help_staging_bot)

These are safe to be public since they're only used for testing and development.

## 🚀 What Happens After Setup

Once secrets are configured, GitHub Actions will:

1. ✅ **Auto-deploy to staging** on every push to `main`
2. ✅ **Deploy PR branches** for testing
3. ✅ **Set webhook automatically** 
4. ✅ **Comment on PRs** with staging bot link
5. ✅ **Health check** deployments

## 🔍 Verification

### Check if secrets are working:

```bash
# 1. Push to main or create a PR
git push origin main

# 2. Check GitHub Actions tab for successful deployment

# 3. Test the staging bot
# Send /start to @job_search_help_staging_bot

# 4. Check if webhook is set correctly
curl "https://api.telegram.org/bot8358869176:AAGo9WKrpUnbLBD-Zq40DIPpfdoBZroPVfI/getWebhookInfo"
```

## 🐛 Troubleshooting

### Common Issues:

**Deployment fails with "Invalid API token"**
- ✅ Check `CLOUDFLARE_API_TOKEN` has correct permissions
- ✅ Verify token hasn't expired
- ✅ Make sure account ID is correct

**Webhook setup fails**
- ✅ Check if staging bot token is correct in the workflow
- ✅ Verify worker deployed successfully
- ✅ Check Cloudflare Workers dashboard

**OpenAI API errors in staging**
- ✅ Check `OPENAI_API_KEY_STAGING` has sufficient credits
- ✅ Verify API key is valid and not rate-limited
- ✅ Test key manually: `curl -H "Authorization: Bearer sk-..." https://api.openai.com/v1/models`

### Debug Steps:

1. **Check GitHub Actions logs**:
   - Go to Actions tab in GitHub
   - Look for failed deployments
   - Check specific error messages

2. **Verify Cloudflare deployment**:
   - Login to https://dash.cloudflare.com
   - Go to Workers & Pages
   - Check if `help-with-job-search-telegram-bot-dev` exists

3. **Test staging bot manually**:
   - Send `/start` to [@job_search_help_staging_bot](https://t.me/job_search_help_staging_bot)
   - Should respond with bot commands

## 🔒 Production Secrets

Production bot requires additional secrets for automated deployment:

### Required Production Secrets

Add these additional secrets for production deployment:

#### **Production Bot Configuration**
- `TELEGRAM_BOT_TOKEN_PRODUCTION`: Production Telegram bot token
  - **IMPORTANT**: Must be different from staging token
  - Create a new bot with @BotFather for production
  - Format: `1234567890:ABCDEFGHIJKLMNOP...`

- `OPENAI_API_KEY_PRODUCTION`: OpenAI API key for production environment
  - Get from: https://platform.openai.com/api-keys
  - Should be separate from staging for billing/rate limiting

#### **Security Configuration**
- `WEBHOOK_SECRET_PRODUCTION`: Webhook secret for production (optional)
  - Generate a strong random string: `openssl rand -hex 32`
  - If not set, will use a default value

- `ADMIN_PASSWORD_PRODUCTION`: Admin password for production (optional)
  - Set a strong password for production admin access
  - If not set, will use a default value

### Production Deployment

Production deploys automatically when:
1. ✅ Pull requests are merged to `main` branch
2. ✅ All tests pass
3. ✅ Code has been tested in staging first

Manual production deployment is also available via GitHub Actions workflow dispatch for emergency releases.

### Production Bot Information
- **Environment**: `production` in wrangler.toml
- **Worker Name**: `help-with-job-search-telegram-bot`
- **Auto-deploys**: On PR merge to main
- **Manual deploys**: Available via GitHub Actions

### Security Notes
- 🔐 **Never use staging tokens in production**
- 🔐 **Use separate OpenAI keys for billing isolation**
- 🔐 **Set strong webhook secrets and admin passwords**
- 🔐 **Monitor production deployments via GitHub issues**

## 🏗️ Workflow Architecture

### Staging Deployment
```
GitHub Push → GitHub Actions → Cloudflare Workers → Telegram Webhook
     ↓              ↓                    ↓              ↓
   main/PR    Deploy staging      Set webhook    @job_search_help_staging_bot
```

### Production Deployment
```
PR Merge → GitHub Actions → Cloudflare Workers → Telegram Webhook → Issue Tracking
    ↓           ↓                   ↓              ↓              ↓
  main    Deploy production    Set webhook   Production Bot   Deployment Issue
```

### Files involved:
- `.github/workflows/deploy-staging.yml` - Staging deployment workflow
- `.github/workflows/deploy-production.yml` - Production deployment workflow
- `wrangler.toml` - Cloudflare deployment settings
- Repository secrets - Sensitive configuration values

---

**🎯 Need help?** Create an issue or check [Contributing Guide](../CONTRIBUTING.md) for more details.