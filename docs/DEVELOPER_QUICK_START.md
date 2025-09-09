# 🚀 Developer Quick Start Guide

## **⚡ Start Here (5 minutes)**

### **1. Test Immediately** 
```bash
# No setup required - test with public staging bot
# Just message: @job_search_help_staging_bot
```

### **2. Setup Development**
```bash
git clone https://github.com/kobzevvv/help-find-job.git
cd help-find-job
npm install

# Run tests
npm test

# Build and validate
npm run build:ci
```

### **3. Deploy to Development**
```bash
wrangler login
npm run deploy:dev
```

---

## **🏗️ Architecture Overview**

### **Key Components:**
- 🤖 **Telegram Bot** - Main user interface
- 🧠 **AI Services** - GPT-4 powered analysis  
- 📁 **Document Processing** - PDF/DOCX/TXT support
- 🔧 **Dependency Injection** - Clean service architecture
- ☁️ **Cloudflare Workers** - Serverless deployment

### **Deployment Pipeline:**
```
Code Push → Quality Gates → Staging → Manual Production
     ↓           ↓           ↓             ↓
  All tests   Build cache  Health check  Final validation
```

---

## **🔧 Most Common Tasks**

### **Running Tests:**
```bash
npm run test:unit          # Fast unit tests
npm run test:integration   # Service integration tests  
npm run test:e2e          # Full end-to-end tests
npm run test:all          # Everything
```

### **Building & Deploying:**
```bash
npm run build:ci         # Build with validation
npm run deploy:staging   # Deploy to staging
# Production = Manual via GitHub Actions
```

### **Debugging:**
```bash
wrangler tail --env development  # Live logs
npm run lint                     # Code quality
npm run type-check              # TypeScript validation
```

---

## **📋 Key Files & Directories**

### **Source Code:**
- `src/index.ts` - Main entry point
- `src/handlers/` - Webhook and conversation handlers  
- `src/services/` - AI, document, logging services
- `src/container/` - Dependency injection setup

### **Configuration:**
- `wrangler.toml` - Multi-environment Cloudflare config
- `config.json` - Application settings
- `.github/workflows/` - CI/CD pipeline

### **Documentation:**
- `docs/CI_CD_ARCHITECTURE.md` - Complete CI/CD details
- `.github/DEPLOYMENT.md` - Production deployment guide
- `.github/SECRETS_SETUP.md` - Environment configuration

---

## **🚨 Common Issues & Solutions**

### **"Input required and not supplied: key"**
✅ **Fixed** - Cache key reference bug resolved in quality-gates workflow

### **Webhook 404 errors**  
✅ **Check** - Ensure staging/production worker is deployed successfully

### **Deprecated GitHub Actions**
✅ **Fixed** - All workflows use current versions (upload-artifact@v4, cache@v4)

### **Webhook Security**
✅ **Enabled** - Webhook secret validation now properly validates requests

---

## **🛡️ Security Checklist**

- ✅ **Webhook secrets configured** (production)
- ✅ **Separate bot tokens** (dev/staging/prod)  
- ✅ **OpenAI keys isolated** (separate billing)
- ✅ **Admin passwords set** (strong random values)

---

## **📚 Need More Details?**

| Topic | Documentation |
|-------|---------------|
| **Deployment** | `.github/DEPLOYMENT.md` |
| **CI/CD Architecture** | `docs/CI_CD_ARCHITECTURE.md` |
| **Secrets Setup** | `.github/SECRETS_SETUP.md` |
| **API Reference** | `docs/SYSTEM_SUMMARY.md` |

---

## **🎯 Ready to Contribute?**

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/your-feature`
3. **Test locally**: `npm run test:all && npm run build:ci`
4. **Deploy to staging**: Test with staging bot
5. **Create Pull Request**

**✅ CI/CD will automatically validate your changes!**
