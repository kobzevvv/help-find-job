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

## 🔒 Production Secrets (Future)

Production bot is private and managed separately:

- **Production Bot**: [@job_search_help_bot](https://t.me/job_search_help_bot)
- **Secrets**: Configured manually by maintainers
- **Environment**: `production` in wrangler.toml

Production secrets are not stored in GitHub and are managed through direct Cloudflare Workers secret management.

## 🏗️ Workflow Architecture

```
GitHub Push → GitHub Actions → Cloudflare Workers → Telegram Webhook
     ↓              ↓                    ↓              ↓
   main/PR    Deploy staging      Set webhook    @job_search_help_staging_bot
```

### Files involved:
- `.github/workflows/deploy-staging.yml` - GitHub Actions workflow
- `.env.staging` - Public staging configuration  
- `wrangler.toml` - Cloudflare deployment settings

---

**🎯 Need help?** Create an issue or check [Contributing Guide](../CONTRIBUTING.md) for more details.