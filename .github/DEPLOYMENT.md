# 🚀 Production Deployment Guide

## How to Deploy to Production

Production deployments are now **manual-only** for enhanced safety and control.

### Via GitHub Actions UI
1. Go to **Actions** tab
2. Select **"Deploy to Production"** workflow
3. Click **"Run workflow"** button  
4. Fill in the form:
   - **Reason**: Why you're deploying (required)
   - **Staging commit**: Optional - leave empty to use latest main
   - **Skip staging validation**: Only for emergencies 
   - **Force rebuild**: Force fresh build instead of cache

### Example Deployment Reasons
- "Bug fix for user login issue"
- "New resume analysis features" 
- "Security update"
- "Emergency rollback to stable version"

## What Happens During Deployment

1. **Pre-deployment validation** - Checks staging status and prerequisites
2. **Quality gates** - Runs all tests and builds for the specified commit
3. **Production deployment** - Deploys to Cloudflare Workers with health checks
4. **Post-deployment** - Creates tracking issue and monitors deployment

## Safety Features

✅ **Manual approval required** - No accidental deployments  
✅ **Staging validation** - Ensures staging works first  
✅ **Build artifact caching** - Faster, reliable deployments  
✅ **Health checks** - Validates deployment success  
✅ **Rollback procedures** - Quick recovery if needed  
✅ **Full audit trail** - GitHub deployment tracking  

## Emergency Rollback

```bash
wrangler rollback --env production
```

## Why Manual Deployment?

The previous automatic deployment on every push to `main` has been replaced because:
- **Prevents accidental deployments** from development commits
- **Requires explicit deployment decision** with reasoning
- **Allows staging validation** before production
- **Provides better control** during critical periods

---

**Need help?** Check `.github/workflows/deploy-production.yml` for technical details.