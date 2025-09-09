# 🤖 Telegram Resume Matcher Bot

**Enterprise-grade AI-powered Telegram bot with advanced configuration management and dependency injection**

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kobzevvv/help-find-job)

## 📋 Overview

This production-ready Telegram bot analyzes resume-job compatibility using GPT-4, featuring enterprise-grade architecture:

### **🎯 Analysis Capabilities**
- **📄 General Matching**: Document structure, formatting, and basic information alignment
- **🛠️ Skills Analysis**: Technical and soft skills comparison with detailed gap identification  
- **💼 Experience Evaluation**: Work experience relevance with seniority assessment
- **📍 Job Conditions**: Location, salary, schedule, and work format compatibility

### **🏗️ Enterprise Architecture** 
- **🔧 Dependency Injection Container**: Eliminates complex constructors, automatic service resolution
- **⚙️ Centralized Configuration**: Environment-specific config with real-time validation
- **🛡️ Safe Migration System**: Dual configuration support with comprehensive validation
- **📊 Real-time Monitoring**: Service health checks, dependency graphs, performance metrics

## ✨ Features

### **Core Functionality**
- 🔄 **Conversational Interface**: Simple step-by-step interaction via Telegram
- 📁 **Multiple File Formats**: Supports PDF, DOCX, and TXT documents
- 🧠 **Enhanced AI Analysis**: Multi-dimensional analysis with GPT-4
- ⚡ **Fast Processing**: Sub-30 second response times with parallel AI requests
- 🌍 **Global Deployment**: Cloudflare Workers with worldwide edge distribution

### **Enterprise Features** 
- 🏗️ **Dependency Injection**: Clean service architecture with automatic resolution
- ⚙️ **Configuration Management**: Environment-specific settings with validation
- 📊 **Real-time Monitoring**: Service health checks and dependency visualization
- 🔒 **Security First**: Webhook validation, rate limiting, input sanitization
- 🔍 **Advanced Debugging**: Comprehensive logging with masked secret display
- 🚀 **Safe Deployments**: Automated validation and migration safety checks

## 🚀 Quick Start

### **Option A: Instant Testing** (Recommended)
```bash
git clone https://github.com/kobzevvv/help-find-job.git
cd help-find-job
npm install

# Test immediately with public staging bot
# No setup required - just try: @job_search_help_staging_bot
```

### **Option B: Full Development Setup**

#### Prerequisites
- [Node.js](https://nodejs.org/) 18+ 
- [Cloudflare Account](https://dash.cloudflare.com/sign-up) (free tier works)
- [OpenAI API Key](https://platform.openai.com/api-keys) (optional)

#### Safe Deployment with Validation
```bash
# Authenticate with Cloudflare
wrangler login

# Deploy with comprehensive validation
npm run deploy:safe:staging

# Validate all services and configuration
npm run validate:staging
```

#### **New: Advanced Commands**
```bash
# Service container status
curl https://worker-url/services

# Environment validation
curl https://worker-url/validate-environment

# Migration safety checks
npm run validate:migration
npm run validate:container
```

## 🤖 Bot Setup Guide

### Test Bots (Ready to Use)

#### **🎯 Staging Bot** - [@job_search_help_staging_bot](https://t.me/job_search_help_staging_bot)
- ✅ **Public for all contributors** to test features
- ✅ **Auto-deploys** from `main` branch  
- ✅ **No setup required** - just use `.env.staging`
- ✅ **Bot Token**: `8358869176:AAGo9WKrpUnbLBD-Zq40DIPpfdoBZroPVfI` (public)
- ✅ **Webhook Secret**: `3c8a4efeb4b36eed52758eb194300a89d3074567299b3a826ea0922100a16752` (public)

#### **🏭 Production Bot** - [@job_search_help_bot](https://t.me/job_search_help_bot)
- 🔒 **Private** - for live users
- 🔒 **Maintainer access only**

### Create Your Own Development Bot

If you want your own bot for development:

1. **Go to [@BotFather](https://t.me/BotFather)** in Telegram
2. **Create bot**: `/newbot`
3. **Name**: "Your Resume Bot - Dev" 
4. **Username**: "your_resume_bot_dev"
5. **Copy token** to `.env` as `TELEGRAM_BOT_TOKEN`
6. **Set webhook**: 
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-worker.workers.dev/webhook"}'
   ```

## 🔐 Admin Commands

The bot includes simple admin commands for debugging and monitoring:

### Usage
```bash
# Staging Environment (public password for testing)
/get_last_10_messages 12354678
/get_last_100_messages 12354678
/log_summary 12354678

# Production Environment (secure password - contact developer)
/get_last_10_messages <secure_password>
/get_last_100_messages <secure_password>
/log_summary <secure_password>
```

### Current Passwords:
- **🎯 Staging**: `12354678` (public for all developers)
- **🏭 Production**: Secure password (contact maintainer)

### How It Works
- 🔑 **One command authentication** - no login sessions
- 📊 **D1 database logging** - all interactions tracked
- 🚫 **No persistent state** - clean and simple
- 🔍 **Real-time debugging** - perfect for troubleshooting

## 🚀 Safe Deployment System

### **Quick Setup**
```bash
# One-command safe deployment with validation
npm run deploy:safe:staging

# Comprehensive validation
npm run validate:staging
```

### **Advanced Setup**
```bash
# Authentication
wrangler login && wrangler whoami

# Create required resources (automatically documented in wrangler.toml)
wrangler kv namespace create "SESSIONS" --env development
wrangler d1 create telegram-bot-logs

# Environment-specific secret management
wrangler secret put BOT_TOKEN_PRODUCTION --env production
wrangler secret put OPENAI_API_KEY --env production
```

### **New Monitoring & Debugging**
```bash
# Service container status (NEW)
curl https://worker-url/services

# Configuration validation (NEW)
curl https://worker-url/validate-environment

# Migration safety checks (NEW)
npm run validate:migration
npm run validate:container

# Safe deployment with full validation (NEW)
npm run deploy:safe:staging
npm run deploy:safe:prod
```

## 📊 Usage Examples

### Basic Conversation Flow

```
User: /start
Bot:  🤖 Resume Matcher Bot Commands

      /resume_and_job_post_match - Start resume analysis
      /help - Show this help message
      /cancel - Cancel current process

      Or just type "help match resume" to get started!

User: /resume_and_job_post_match
Bot:  📄 I'll help you analyze how well your resume matches a job description! 
      Please send me your resume (PDF, DOCX, or TXT format).

User: [uploads resume.pdf]
Bot:  ✅ Resume received! Now please send me the job description.

User: [sends job posting text]
Bot:  🔄 Analyzing your resume against the job requirements...
      
      📊 ANALYSIS RESULTS
      
      📄 **General Matching (85/100)**
      ✅ Strong professional formatting
      ✅ Contact information clearly presented
      ⚠️  Consider adding a professional summary
      
      🛠️ **Skills Analysis (78/100)**
      ✅ 8/10 required technical skills present
      ⚠️  Missing: Docker, Kubernetes
      💡 Recommended: Add cloud platform experience
      
      💼 **Experience Evaluation (82/100)**
      ✅ Relevant project management experience
      ✅ Leadership roles align with requirements
      ⚠️  Consider highlighting specific achievements with metrics
      
      📈 **Overall Match: 82/100 - Strong Candidate**
```

### Admin Usage Example

```
Developer: /get_last_10_messages 12345678Bot:       📊 Fetching last 10 log messages...

           📊 Last 10 Log Messages

           🤖 12/08 15:32 | INFO | BOT_RESPONSE
           🔗 User 1714048 in chat 1714048
           📝 Bot sent: Analysis complete!

           👤 12/08 15:31 | INFO | USER_MESSAGE
           🔗 User 1714048 in chat 1714048
           📝 User sent: /resume_and_job_post_match

           ---
           📈 Total entries: 10 | 🕐 Last 5 minutes | 🌍 production
```

## 🏗️ Enterprise Architecture

### **System Overview**
```
[Telegram API] ↔️ [Cloudflare Workers] ↔️ [OpenAI GPT-4]
                           ↕️
             [Service Container + Config Management]
                           ↕️
               [Cloudflare KV + D1 Storage]
```

### **Project Structure** 
```
help-find-job/
├── src/
│   ├── config/            # 🆕 Centralized configuration management
│   ├── container/         # 🆕 Dependency injection container
│   ├── handlers/          # Telegram message and webhook handlers
│   ├── services/          # AI, document, logging, session services
│   ├── types/             # TypeScript definitions
│   └── index.ts           # Main entry point
├── scripts/              # 🆕 Deployment & validation scripts
├── tests/                # Comprehensive test suite
├── wrangler.toml         # Multi-environment Cloudflare config
└── package.json          # 🆕 Enhanced with safe deployment commands
```

### **New Architecture Features**
- **🏗️ Dependency Injection**: Eliminates 8+ parameter constructors
- **⚙️ Configuration Management**: Environment-specific with real-time validation  
- **🔍 Service Monitoring**: Real-time health checks and dependency graphs
- **🛡️ Safe Migration**: Dual configuration support with comprehensive testing

## 🔐 Security & Privacy

### Data Protection
- 🗑️ **Zero Persistence**: Documents are processed and immediately deleted
- 🔒 **Secure Transmission**: All communications encrypted via HTTPS
- 🚫 **No Tracking**: No personal data stored beyond session duration
- ⏰ **Session Expiry**: All user data auto-expires after 24 hours

### Security Features
- ✅ Telegram webhook signature validation
- ✅ Rate limiting per user
- ✅ Input sanitization and validation
- ✅ API key protection via environment variables
- ✅ Simple password-based admin access

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Quick Contribution Workflow
```bash
# 1. Fork and clone the repository
git clone https://github.com/yourusername/help-find-job.git
cd help-find-job

# 2. Install dependencies
npm install

# 3. Use staging environment for testing
cp .env.staging .env
# Add your OpenAI API key to .env

# 4. Deploy to development
npm run deploy:dev

# 5. Test with @job_search_help_staging_bot
# Send /start to the bot and test your changes

# 6. Create feature branch and submit PR
git checkout -b feature/amazing-feature
# Make your changes
git commit -am "Add amazing feature"
git push origin feature/amazing-feature
```

### Development Guidelines
- 📝 Write tests for new features
- 🎨 Follow TypeScript best practices
- 📚 Update documentation
- 🔍 Test with the staging bot

## 🐛 Troubleshooting

### Common Issues

**Bot not responding:**
```bash
# Check webhook status
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Check worker logs
wrangler tail --env development
```

**Deployment fails:**
```bash
# Check authentication
wrangler whoami

# Verify secrets
wrangler secret list --env development
```

**Admin commands not working:**
```bash
# Verify D1 database exists
wrangler d1 list

# Check logs for errors
wrangler tail --env production
```

### Getting Help

- 📖 [Contributing Guide](CONTRIBUTING.md)
- 🐛 [Issue Tracker](https://github.com/kobzevvv/help-find-job/issues)
- 💬 [Discussions](https://github.com/kobzevvv/help-find-job/discussions)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Telegram Bot API](https://core.telegram.org/bots/api) for messaging platform
- [OpenAI](https://openai.com/) for AI analysis capabilities
- [Cloudflare Workers](https://workers.cloudflare.com/) for serverless infrastructure

---

**⭐ Star this repository if it helped you land your dream job!**

**🚀 Ready to get started? Use the staging bot [@job_search_help_staging_bot](https://t.me/job_search_help_staging_bot) right now!**

---
*✅ Status: Staging deployment redeployed and tested - GitHub Actions ready for testing*