# 🔑 GitHub Repository Secrets Setup

Quick guide for setting up GitHub Actions with Cloudflare Workers deployment.

## 📋 Required GitHub Secrets

Set these in **Settings** → **Secrets and variables** → **Actions**:

### Step 1: Get your Cloudflare credentials

1. **Get Cloudflare API Token:**
   - Go to: https://dash.cloudflare.com/profile/api-tokens
   - Click "Create Token" → "Custom Token"
   - **Permissions needed:**
     - Account: `Cloudflare Workers:Edit`
     - Zone: `Zone Settings:Read`
     - Zone: `Zone:Read`
   - Copy the generated token

2. **Get Cloudflare Account ID:**
   - Go to: https://dash.cloudflare.com/
   - Copy the Account ID from the right sidebar
   - Format looks like: `c8f793821e2b05647f669d4f13b51f0e`

3. **Get OpenAI API Keys:**
   - Go to: https://platform.openai.com/api-keys
   - Create separate keys for staging and production

4. **Create Telegram Bots:**
   - Message @BotFather on Telegram
   - Create separate bots for staging and production
   - Save the bot tokens

### Step 2: Add secrets to GitHub repository

1. Go to your GitHub repository: `https://github.com/kobzevvv/help-find-job`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** and add these:

#### Core Infrastructure Secrets
| Secret Name | Value | Required |
|-------------|-------|----------|
| `CLOUDFLARE_API_TOKEN` | Your Cloudflare API token | ✅ **Required** |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | ✅ **Required** |

#### Staging Environment Secrets
| Secret Name | Value | Required |
|-------------|-------|----------|
| `OPENAI_API_KEY_STAGING` | OpenAI API key for staging | ⚠️ Optional but recommended |

#### Production Environment Secrets
| Secret Name | Value | Required |
|-------------|-------|----------|
| `TELEGRAM_BOT_TOKEN_PRODUCTION` | Production Telegram bot token | ✅ **Required for Production** |
| `OPENAI_API_KEY_PRODUCTION` | OpenAI API key for production | ⚠️ Optional but recommended |
| `WEBHOOK_SECRET_PRODUCTION` | Strong random string for webhook security | ⚠️ Optional |
| `ADMIN_PASSWORD_PRODUCTION` | Strong password for admin access | ⚠️ Optional |

### Step 3: Test the deployment

Once secrets are added:
1. Push a new commit to trigger CI
2. Check the "Actions" tab in GitHub
3. The deployment should now succeed! 🎉

## 📋 What happens after setup

Once secrets are configured:

### Staging Environment (Automatic)
- ✅ **Auto-deploy to staging** on every push to `main`
- ✅ **Deploy PR branches** for testing  
- ✅ **Set webhook automatically**
- ✅ **Comment on PRs** with staging bot link
- ✅ **Health check** deployments

### Production Environment (Automatic on PR merge)
- ✅ **Auto-deploy to production** when PRs are merged to `main`
- ✅ **Set production webhook automatically**
- ✅ **Health check** production deployment
- ✅ **Create tracking issues** for deployment monitoring
- ✅ **Manual deployment** option for emergency releases

## 🤖 Staging Bot Info

- **Bot Username:** [@job_search_help_staging_bot](https://t.me/job_search_help_staging_bot)
- **Staging URL:** https://help-with-job-search-telegram-bot-staging.workers.dev
- **Bot Token:** `8358869176:AAGo9WKrpUnbLBD-Zq40DIPpfdoBZroPVfI` (public, safe for testing)

## 🔍 Troubleshooting

### Common issues:

**"Invalid API token" error:**
- ✅ Check token has correct permissions
- ✅ Verify account ID is correct
- ✅ Make sure token hasn't expired

**"Workers subdomain not found" error:**
- ✅ Enable Workers on your Cloudflare account
- ✅ Check if account has Workers plan activated

**"OpenAI API errors" in staging:**
- ⚠️ This is optional - bot will work without AI features
- ✅ Check API key has credits available
- ✅ Verify key is valid

## 📞 Need Help?

If you encounter issues:
1. Check the detailed setup guide: [.github/SECRETS_SETUP.md](./.github/SECRETS_SETUP.md)
2. Look at GitHub Actions logs for specific error messages
3. Test your Cloudflare credentials manually with `wrangler whoami`

---

**🎯 Next Steps:** Add the GitHub secrets above, then your deployment will work perfectly!
