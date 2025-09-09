# Enhanced Resume Matching System - Testing Documentation

## 📋 Overview

The Enhanced Resume Matching System provides comprehensive AI-powered analysis comparing resumes against job postings. This system uses GPT-3.5 for staging/testing and GPT-4 for production environments.

## 🎯 System Components

### Core Analysis Areas
1. **Headlines Analysis** - Job title vs candidate experience titles
2. **Skills Analysis** - Requested vs possessed skills with detailed breakdown
3. **Experience Analysis** - Including seniority level assessment (under/over/perfect match)
4. **Job Conditions** - Location, salary, schedule, work format compatibility

### Key Files
- `src/services/enhanced-ai.ts` - Main AI analysis service
- `src/handlers/conversation.ts` - Bot conversation handling
- `tests/resume_job_post_match/` - Test data directory
- `tests/e2e/enhanced-resume-match.test.ts` - End-to-end tests
- `tests/integration/telegram-bot-test.ts` - Bot integration tests

## 🧪 Test Data

### Test Files Location
```
tests/resume_job_post_match/
├── resume_test_input.txt     # Russian product manager resume
└── job_post_test_input.txt   # Russian sales manager job posting
```

### Test Data Description
- **Resume**: Russian product manager with ITV experience, detailed technical background
- **Job Post**: Russian sales manager position at Between Exchange (programmatic advertising)
- **Purpose**: Tests cross-domain matching (product manager → sales manager)
- **Language**: Russian (tests international capability)

## 🚀 Testing Methods

### 1. Manual Testing via Telegram Bot

#### Staging Environment
- **Bot**: `@job_search_help_staging_bot`
- **Environment**: Uses GPT-3.5 for cost-effective testing
- **Deployment**: `wrangler deploy --env staging`

#### Available Commands

##### Quick Test Commands
```bash
/test_resume_match
```
- **Purpose**: Instant test using provided test files
- **Duration**: 60-90 seconds
- **Result**: Complete enhanced analysis output

##### Full Workflow Commands
```bash
/resume_and_job_post_match
```
- **Purpose**: Full user workflow simulation
- **Steps**: 
  1. Bot requests resume
  2. User provides resume text/file
  3. Bot requests job posting
  4. User provides job posting text
  5. Bot performs analysis

##### Admin/Debug Commands
```bash
/get_last_10_messages 12354678    # Staging password
/get_last_100_messages 12354678   # View more logs
/help                             # Command list
```

#### Expected Test Results

**Summary Output:**
```
📊 COMPREHENSIVE RESUME ANALYSIS

[Overall assessment with score]

📈 Overall Match Score: XX/100
```

**Detailed Breakdown (5 separate messages):**
1. **Headlines Analysis** - Title matching and problems
2. **Skills Analysis** - Matching, missing, additional skills
3. **Experience Analysis** - Seniority and quantity assessment
4. **Job Conditions** - Location, salary, schedule compatibility
5. **Final message** - Next steps and commands

### 2. Automated Testing

#### Run E2E Tests
```bash
# Set environment variable
export OPENAI_API_KEY="your-openai-api-key"

# Run tests
npm test tests/e2e/enhanced-resume-match.test.ts
```

#### Test Structure
```typescript
describe('Enhanced Resume-Job Post Matching E2E Tests', () => {
  test('should perform comprehensive resume-job analysis')
  test('should analyze headlines correctly')
  test('should analyze skills correctly') 
  test('should analyze experience with seniority assessment')
  test('should analyze job conditions')
  test('should generate comprehensive summary')
})
```

#### Manual Integration Test
```bash
# Run integration test script
node -e "
const { runManualIntegrationTest } = require('./tests/e2e/enhanced-resume-match.test');
runManualIntegrationTest().then(result => {
  console.log('Test completed:', !!result);
  process.exit(result ? 0 : 1);
});
"
```

### 3. System Validation Script

#### Test Runner Script
```bash
node scripts/test-enhanced-matching.js
```

#### Validation Checklist
- ✅ Prerequisites (API key, test files)
- ✅ Data loading and processing
- ✅ TypeScript compilation
- ✅ AI service initialization
- ✅ Analysis workflow structure
- ✅ Bot commands structure

## 🔧 Development Setup

### Environment Configuration

#### Staging Setup
1. **Deploy to staging**: `wrangler deploy --env staging`
2. **Set secrets** (if needed):
   ```bash
   wrangler secret put TELEGRAM_BOT_TOKEN --env staging
   wrangler secret put OPENAI_API_KEY --env staging
   ```
3. **Fix webhook** (if commands don't work):
   ```bash
   curl -X POST https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev/fix-webhook
   ```

#### Bot Configuration
- **Staging**: `@job_search_help_staging_bot` → Staging worker
- **Production**: Different bot → Production worker  
- **Admin Password**: `12354678` (staging environment)

### Debug Endpoints

#### Health Check
```bash
curl https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev/health
```

#### Bot Status Check
```bash
curl -X POST https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev/debug-bot
```

#### Webhook Status
```bash
curl -X POST https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev/fix-webhook
```

## 📊 Expected Analysis Output Structure

### 1. Headlines Analysis
```json
{
  "jobTitle": "Ведущий менеджер по продажам / Senior sales manager",
  "candidateTitles": ["Продакт-менеджер", "Ведущий продакт-менеджер"],
  "matchScore": 65,
  "explanation": "Detailed analysis of title alignment",
  "problems": ["Cross-domain role transition", "Different skill focus"],
  "recommendations": ["Highlight transferable skills", "Emphasize client interaction"]
}
```

### 2. Skills Analysis
```json
{
  "requestedSkills": ["B2B Продажи", "Медийная реклама", "Digital Marketing"],
  "candidateSkills": ["Product Strategy", "Agile", "Team Management"],
  "matchingSkills": ["B2B Experience"],
  "missingSkills": ["Sales Experience", "Media Advertising"],
  "additionalSkills": ["Product Development", "Technical Leadership"],
  "matchScore": 45,
  "explanation": "Skills gap analysis",
  "problems": ["Limited sales experience", "No advertising background"],
  "recommendations": ["Develop sales skills", "Learn programmatic advertising"]
}
```

### 3. Experience Analysis
```json
{
  "candidateExperience": ["Product management", "Team leadership", "B2B platforms"],
  "jobRequirements": ["Sales management", "Client relationships", "Media sales"],
  "experienceMatch": 55,
  "seniorityMatch": "over-qualified",
  "seniorityExplanation": "Product manager role typically senior to sales manager",
  "quantityMatch": 85,
  "quantityExplanation": "5+ years experience meets 3-6 years requirement"
}
```

### 4. Job Conditions Analysis
```json
{
  "location": {
    "jobLocation": "Москва",
    "candidateLocation": "Москва", 
    "compatible": true,
    "explanation": "Same city - perfect match"
  },
  "salary": {
    "jobSalary": "280,000-350,000₽",
    "candidateExpectation": "350,000₽",
    "compatible": true,
    "explanation": "Salary expectations align with upper range"
  }
}
```

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. Bot Not Responding
**Symptoms**: Commands sent but no response
**Diagnosis**: 
```bash
# Check if webhook is set correctly
curl -X POST .../fix-webhook

# Verify bot identity
curl -X POST .../debug-bot
```
**Solutions**:
- Ensure using correct bot (`@job_search_help_staging_bot`)
- Run webhook fix endpoint
- Check staging deployment status

#### 2. Analysis Errors
**Symptoms**: "Internal server error" or analysis failure
**Diagnosis**:
```bash
# Check logs
wrangler tail --env staging

# Test with health endpoint
curl .../health
```
**Solutions**:
- Verify OpenAI API key is set
- Check rate limits
- Ensure GPT-3.5 model availability

#### 3. Test Data Issues
**Symptoms**: "Document too short" or validation errors
**Diagnosis**: Check test file content and processing
**Solutions**:
- Verify test files exist and contain data
- Check DocumentService validation rules
- Ensure proper text encoding

### Log Monitoring
```bash
# Real-time monitoring (auto-stops after 3 minutes per user preference)
wrangler tail --env staging --format pretty

# Get recent logs
wrangler logs --env staging --lines 50
```

## 📈 Performance Expectations

### Timing Benchmarks
- **Simple commands** (`/help`): < 1 second
- **Test analysis** (`/test_resume_match`): 60-90 seconds
- **Full workflow**: 2-3 minutes (including user input)

### Resource Usage
- **Model**: GPT-3.5-turbo (staging), GPT-4 (production)
- **Token usage**: ~2000-4000 tokens per analysis
- **Parallel requests**: 4 simultaneous API calls for speed
- **Memory**: Minimal worker memory footprint

## 🔄 Refactoring Guidelines

### What to Preserve During Refactoring
1. **Test data structure** - Keep test files as-is
2. **Command interface** - Maintain `/test_resume_match` functionality
3. **Analysis output format** - Preserve JSON structure for tests
4. **Debug endpoints** - Keep health, debug-bot, fix-webhook endpoints
5. **Environment separation** - Staging vs production configuration

### Key Integration Points
- `EnhancedAIService.analyzeResumeJobMatch()` - Main analysis method
- Test data loading from `tests/resume_job_post_match/`
- Command handling in `ConversationHandler`
- Webhook configuration and debugging endpoints

## 📚 Additional Resources

### Related Files
- `wrangler.toml` - Environment configuration
- `src/index.ts` - Main worker entry point
- `src/services/telegram.ts` - Telegram API integration
- `src/types/session.ts` - Type definitions

### Documentation
- `DEPLOYMENT_SETUP.md` - Deployment procedures
- `CONTRIBUTING.md` - Development guidelines
- `README.md` - Project overview

---

**This documentation ensures the enhanced resume matching system remains testable and maintainable during refactoring while preserving all functionality and test capabilities.**
