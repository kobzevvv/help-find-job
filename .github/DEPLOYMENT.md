# 🚀 Production Deployment Guide

## Manual Deployment Process

The production deployment is now **manual-only** for enhanced safety and control.

## How to Deploy to Production

### 1. Via GitHub Actions UI
1. Go to **Actions** → **Deploy to Production**
2. Click **"Run workflow"**
3. Fill in the required fields:
   - **Reason**: Why you're deploying (required)
   - **Staging commit**: Leave empty to deploy current main (optional)
   - **Skip staging validation**: Only for emergencies (optional)
   - **Force rebuild**: Force fresh build instead of using cache (optional)

### 2. Required Information
- **Reason**: Always provide a clear deployment reason
- **Examples**: 
  - "Bug fix for user login issue"
  - "New resume analysis features"
  - "Security update"
  - "Emergency rollback to stable version"

## Safety Features

✅ **Manual approval required** - No accidental deployments  
✅ **Staging validation** - Ensures staging works before production  
✅ **Build artifact caching** - Faster, more reliable deployments  
✅ **Comprehensive health checks** - Validates deployment success  
✅ **Automatic rollback procedures** - Clear instructions if issues occur  
✅ **GitHub deployment tracking** - Full audit trail  

## Deployment Flow

```
1. Quality Gates → 2. Staging Deploy → 3. Manual Production Deploy
     ↓                    ↓                       ↓
   All tests pass      Health checks         Final validation
   Build cached        Smoke tests          Production ready
```

## Emergency Procedures

### Quick Rollback
```bash
wrangler rollback --env production
```

### Emergency Deployment
For critical fixes that can't wait for staging validation:
1. Go to Actions → Deploy to Production
2. Check **"Skip staging validation"** 
3. Provide clear emergency reason
4. Deploy immediately

**⚠️ Only use for genuine emergencies!**

## Why Manual Deployment?

Production deployment is now **manual-only** instead of automatic. This safer approach prevents:
- Accidental production deployments from every push
- Untested code reaching users automatically
- Deploy conflicts during active development
- GitHub Actions deprecation warnings causing failed deployments

## Troubleshooting

### GitHub Actions Errors
If you see: `This request has been automatically failed because it uses a deprecated version of actions/upload-artifact: v3`

**This has been fixed** - all workflows now use current GitHub Actions versions (v4).

### GitHub Deployment Creation Failure
If you see: `❌ ARCHITECTURAL ISSUE: GitHub deployment creation failed`

**This has been fixed** - The deployment now uses a **robust fallback strategy**:

1. **First:** Attempts to create GitHub deployment record for full tracking
2. **If that fails:** Continues with Cloudflare deployment anyway 
3. **Result:** Your bot gets deployed even if GitHub API has issues

**Common causes:**
- Branch protection rules requiring status checks
- Repository permission limitations
- GitHub API rate limiting

**Impact:** Cloudflare deployment succeeds, but GitHub deployment tracking may be disabled.

### Production Deployment Not Running Automatically
This is **by design**. Production deployments require manual approval for safety.

---

**Need help?** Check the workflow file: `.github/workflows/deploy-production.yml`
