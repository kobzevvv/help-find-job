# 🚀 Quick Setup Guide - Get Your Credentials in 5 Minutes

## 📋 Step 1: Get CLOUDFLARE_ACCOUNT_ID (2 minutes)

### Method 1: From Cloudflare Dashboard (Easiest)
1. **Go to**: https://dash.cloudflare.com/
2. **Look at the right sidebar** - you'll see "Account ID" 
3. **Copy the value** - it looks like: `c8f793821e2b05647f669d4f13b51f0e`

### Method 2: From URL (Alternative)
1. **Go to**: https://dash.cloudflare.com/
2. **Look at the URL** - it will be: `https://dash.cloudflare.com/1234567890abcdef...`
3. **The Account ID is the long string after the last `/`**

### Method 3: Using Wrangler CLI (If you have it installed)
```bash
# Login first
npx wrangler auth login

# Get account info
npx wrangler whoami
```
 
## 🔑 Step 2: Get CLOUDFLARE_API_TOKEN (3 minutes)

1. **Go to**: https://dash.cloudflare.com/profile/api-tokens
2. **Click**: "Create Token"
3. **Click**: "Custom Token" → "Get started"
4. **Fill in**:
   - **Token name**: `GitHub Actions Workers Deploy`
   - **Permissions**:
     - Account: `Cloudflare Workers:Edit`
     - Zone: `Zone Settings:Read` 
     - Zone: `Zone:Read`
   - **Account Resources**: Include `All accounts` (or select your specific account)
   - **Zone Resources**: Include `All zones`
5. **Click**: "Continue to summary" → "Create Token"
6. **Copy the token** - it starts with something like: `1234567890abcdef...`

⚠️ **Important**: Save this token immediately - you can't see it again!

## 🤖 Step 3: Get OpenAI API Key (1 minute)

1. **Go to**: https://platform.openai.com/api-keys
2. **Click**: "Create new secret key" 
3. **Name it**: `GitHub Actions Staging`
4. **Copy the key** - it starts with: `sk-...`

## 📝 Step 4: Add to GitHub (2 minutes)

1. **Go to**: https://github.com/kobzevvv/help-find-job/settings/secrets/actions
2. **Click**: "New repository secret" for each:

### Add these 3 secrets:

| Secret Name | Value (what you copied above) |
|-------------|-------------------------------|
| `CLOUDFLARE_ACCOUNT_ID` | Your account ID from Step 1 |
| `CLOUDFLARE_API_TOKEN` | Your API token from Step 2 |
| `OPENAI_API_KEY_STAGING` | Your OpenAI key from Step 3 |

## ✅ Step 5: Test (30 seconds)

1. **Push any small change** to trigger GitHub Actions
2. **Check the Actions tab** - deployment should now work!
3. **Test the bot**: [@job_search_help_staging_bot](https://t.me/job_search_help_staging_bot)

---

## 🆘 Need Help?

### Can't find Account ID?
- **Try**: https://dash.cloudflare.com/ and look in the right sidebar
- **Screenshot**: [Where to find Account ID](https://developers.cloudflare.com/fundamentals/setup/find-account-and-zone-ids/)

### Can't create API token?
- **Make sure** you have a Cloudflare account with Workers enabled
- **Try**: Going to Workers & Pages first, then creating the token

### Don't have OpenAI credits?
- **This is optional** - the bot will work without AI features
- **You can** add a placeholder value like `sk-placeholder` for now

---

**🎯 Total time needed: ~8 minutes**
