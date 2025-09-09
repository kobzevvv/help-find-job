# Scripts Directory - Enterprise Deployment & Validation

## 📁 Available Scripts

### 🆕 New Validation Scripts

#### `validate-migration.js`
**Purpose**: Comprehensive migration safety validation
**Usage**: 
```bash
npm run validate:migration
```
**Checks**:
- Configuration migration safety
- Service connectivity (Telegram, OpenAI, Webhook)
- Environment variable validation
- Bot connectivity and identity

#### `validate-container.js` 
**Purpose**: Dependency injection container validation
**Usage**:
```bash
npm run validate:container
```
**Checks**:
- Service container health
- Dependency graph validation  
- Service initialization order
- Health monitoring system

#### `deploy-safely.sh`
**Purpose**: Safe deployment with comprehensive validation
**Usage**:
```bash
npm run deploy:safe:staging
npm run deploy:safe:prod
```
**Features**:
- Pre-deployment validation (TypeScript, tests, build)
- Environment-specific deployment
- Post-deployment validation
- Migration safety checks

### Legacy Testing Scripts

#### `test-enhanced-matching.js`
**Purpose**: AI analysis system validation

### Webhook Management Scripts

#### `set-staging-webhook.js`
**Purpose**: Configure webhook for staging bot without secret validation
**Usage**:
```bash
node scripts/set-staging-webhook.js
```
**Features**:
- Sets webhook URL to staging worker
- Disables secret validation for testing
- Shows current webhook status
- Tests endpoint availability

#### `fix-staging-webhook.js`
**Purpose**: Debug webhook configuration issues
**Usage**:
```bash
node scripts/fix-staging-webhook.js
```
**Features**:
- Identifies correct staging bot
- Checks webhook endpoint health
- Provides troubleshooting guidance

### Legacy/Utility Scripts

#### `set-webhook.js`
**Purpose**: Basic webhook setup (legacy)
**Usage**:
```bash
node scripts/set-webhook.js <worker-url>
```

#### `set-webhook-final.js`
**Purpose**: Set webhook with explicit bot token
**Usage**:
```bash
node scripts/set-webhook-final.js <BOT_TOKEN>
```

## 🔧 Development Workflow Scripts

### Quick Setup Sequence
```bash
# 1. Deploy to staging
wrangler deploy --env staging

# 2. Run system validation
node scripts/test-enhanced-matching.js

# 3. Fix webhook if needed (via worker endpoint)
curl -X POST https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev/fix-webhook

# 4. Test in Telegram
# Send: /test_resume_match to @job_search_help_staging_bot
```

### Debug Workflow
```bash
# 1. Check staging bot identity
node scripts/fix-staging-webhook.js

# 2. Validate system components
node scripts/test-enhanced-matching.js

# 3. Monitor in real-time
wrangler tail --env staging --format pretty
```

## 📊 Script Output Examples

### Successful System Validation
```
🧪 Enhanced Resume Matching Test Runner
==========================================
✅ PASS prerequisites
✅ PASS dataLoading
✅ PASS compilation
✅ PASS aiService
✅ PASS analysisWorkflow
✅ PASS botCommands

🎯 Overall Result: ✅ ALL TESTS PASSED
```

### Webhook Configuration Success
```
✅ Webhook set successfully!
📱 Bot is now listening on: https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev/webhook
```

## 🚨 Common Issues and Solutions

### Issue: "OPENAI_API_KEY not set"
**Solution**: 
```bash
export OPENAI_API_KEY="your-openai-api-key"
node scripts/test-enhanced-matching.js
```

### Issue: "Test files not found"
**Check**: Files exist in `tests/resume_job_post_match/`
- `resume_test_input.txt`
- `job_post_test_input.txt`

### Issue: TypeScript compilation errors
**Solution**:
```bash
npm run build
# Fix any compilation errors
node scripts/test-enhanced-matching.js
```

### Issue: Webhook returns "Unauthorized"
**Solution**: Use worker's fix-webhook endpoint instead:
```bash
curl -X POST https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev/fix-webhook
```

## 📋 Script Maintenance

### Adding New Scripts
1. Place in `scripts/` directory
2. Add executable permissions: `chmod +x script-name.js`
3. Document in this README
4. Include in development workflow

### Environment Variables
Scripts may require:
- `OPENAI_API_KEY` - For AI functionality testing
- `TELEGRAM_BOT_TOKEN` - For webhook configuration (optional)

### Dependencies
- Node.js runtime
- `fetch` API (built-in in modern Node.js)
- Access to staging worker endpoints

---

**All scripts are designed to work with the enhanced resume matching system and support the refactoring process while maintaining functionality.**
