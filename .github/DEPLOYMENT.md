# 🚀 Production Deployment Guide

## New Deployment Process (v2)

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
Use the **"Skip staging validation"** option only for critical fixes.

## Previous Automatic Deployment

The old workflow that deployed automatically on every push to `main` has been replaced with this safer manual process. This prevents:
- Accidental production deployments
- Untested code reaching users
- Deploy conflicts during development

---

**Need help?** Check the workflow file: `.github/workflows/deploy-production.yml`
