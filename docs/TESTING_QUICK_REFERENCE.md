# Enhanced Resume Matching - Quick Testing Reference

## 🚀 Quick Test Commands

### Instant Testing (Recommended)
```bash
# In Telegram: @job_search_help_staging_bot
/test_resume_match
```
**Result**: Complete analysis using provided test data (60-90 seconds)

### Full Workflow Testing
```bash
# In Telegram: @job_search_help_staging_bot
/resume_and_job_post_match
# Then follow prompts to upload resume and job posting
```

### Admin/Debug Commands
```bash
/get_last_10_messages 12354678    # View recent logs
/help                             # Command list
```

## 🔧 Developer Testing

### 1. Deploy and Test Cycle
```bash
# Deploy to staging
wrangler deploy --env staging

# Fix webhook if needed
curl -X POST https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev/fix-webhook

# Test in Telegram
# Send: /test_resume_match to @job_search_help_staging_bot
```

### 2. Automated Tests
```bash
# Set API key
export OPENAI_API_KEY="your-key"

# Run validation script
node scripts/test-enhanced-matching.js

# Run e2e tests
npm test tests/e2e/enhanced-resume-match.test.ts
```

### 3. Debug Endpoints
```bash
# Health check
curl https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev/health

# Bot status
curl -X POST https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev/debug-bot

# Monitor logs
wrangler tail --env staging
```

## 📊 Expected Results

### Successful Test Output
1. **Summary message** with overall score
2. **Headlines analysis** (65-75/100 typical)
3. **Skills analysis** (45-55/100 typical) 
4. **Experience analysis** (55-65/100 typical)
5. **Job conditions** (85-95/100 typical)

### Test Data Context
- **Resume**: Russian product manager (technical background)
- **Job**: Russian sales manager (advertising industry)
- **Challenge**: Cross-domain matching test
- **Expected Overall Score**: 60-70/100

## 🚨 Troubleshooting

### Issue: Bot not responding
**Solution**: 
```bash
curl -X POST .../fix-webhook
```

### Issue: Analysis fails
**Check**: OpenAI API key and staging deployment

### Issue: Wrong results
**Verify**: Using `@job_search_help_staging_bot` (not production bot)

## 📋 Test Checklist

- [ ] Deploy to staging successful
- [ ] Webhook configured correctly  
- [ ] `/help` command responds
- [ ] `/test_resume_match` completes successfully
- [ ] All 5 analysis sections appear
- [ ] Overall score between 50-80
- [ ] Admin commands work with password `12354678`

---

**For detailed documentation, see `ENHANCED_RESUME_MATCHING.md`**
