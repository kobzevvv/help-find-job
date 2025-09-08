# 🤖 Telegram Resume Matcher Bot

**AI-powered Telegram bot that analyzes how well your resume matches job descriptions**

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kobzevvv/help-find-job)

## 📋 Overview

This Telegram bot helps job seekers improve their chances by analyzing resume-job post compatibility using AI. The bot provides detailed feedback across three key dimensions:

- **📄 General Matching**: Document structure, formatting, and basic information alignment
- **🛠️ Skills Analysis**: Technical and soft skills comparison with gap identification  
- **💼 Experience Evaluation**: Work experience relevance and achievement alignment

## ✨ Features

- 🔄 **Conversational Interface**: Simple step-by-step interaction via Telegram
- 📁 **Multiple File Formats**: Supports PDF, DOCX, and TXT documents
- 🧠 **AI-Powered Analysis**: Uses GPT-4 for intelligent resume-job matching
- ⚡ **Fast Processing**: Serverless architecture with sub-30 second response times
- 🌍 **Global Deployment**: Runs on Cloudflare Workers for worldwide accessibility
- 🔒 **Privacy First**: Documents are processed and immediately deleted
- 🆓 **Open Source**: Easy to deploy your own instance
- 🔍 **Admin Logging**: Simple password-based log access for debugging

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ 
- [Cloudflare Account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Telegram Bot Token](https://core.telegram.org/bots#botfather)
- [OpenAI API Key](https://platform.openai.com/api-keys)

### 1️⃣ Clone and Install

```bash
git clone https://github.com/kobzevvv/help-find-job.git
cd help-find-job
npm install
```

### 2️⃣ Environment Setup

#### **Option A: Quick Testing** (Recommended for contributors)
```bash
cp .env.staging .env
# Edit .env and add your OpenAI API key - everything else is pre-configured
```

Use the public staging bot [@job_search_help_staging_bot](https://t.me/job_search_help_staging_bot) for testing!

#### **Option B: Full Development Setup**
```bash
cp .env.example .env
# Edit .env with your bot token, OpenAI API key, and other credentials
```

💡 **See `.env.example` for detailed step-by-step instructions on getting each credential.**

### 3️⃣ Deploy and Test

```bash
# Authenticate with Cloudflare
wrangler login

# Deploy to development
npm run deploy:dev

# Test with the staging bot or your own bot
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
# View recent logs (replace with actual password)
/get_last_10_messages AdminPass2024_Secure_9X7mK2pL8qR3nF6j
/get_last_100_messages AdminPass2024_Secure_9X7mK2pL8qR3nF6j

# Get log summary  
/log_summary AdminPass2024_Secure_9X7mK2pL8qR3nF6j
```

### How It Works
- 🔑 **One command authentication** - no login sessions
- 📊 **D1 database logging** - all interactions tracked
- 🚫 **No persistent state** - clean and simple
- 🔍 **Real-time debugging** - perfect for troubleshooting

## 🔧 Cloudflare Workers Setup

### Authentication
```bash
# Login to Cloudflare (opens browser for OAuth)
wrangler login

# Verify authentication
wrangler whoami
```

### Create Required Resources
```bash
# Create KV storage namespaces
wrangler kv namespace create "SESSIONS" --env development
wrangler kv namespace create "CACHE" --env development

# Create D1 database
wrangler d1 create telegram-bot-logs

# Update wrangler.toml with the generated IDs
```

### Set Secrets
```bash
# For your development environment
wrangler secret put TELEGRAM_BOT_TOKEN --env development
wrangler secret put OPENAI_API_KEY --env development
wrangler secret put WEBHOOK_SECRET --env development
```

### Deploy
```bash
# Development
npm run deploy:dev

# Staging (for maintainers)
npm run deploy:staging

# Production (for maintainers)
npm run deploy:prod
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
Developer: /get_last_10_messages AdminPass2024_Secure_9X7mK2pL8qR3nF6j
Bot:       📊 Fetching last 10 log messages...

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

## 🏗️ Architecture

### System Overview
```
[Telegram] ↔️ [Cloudflare Workers] ↔️ [OpenAI GPT-4]
                      ↕️
            [Cloudflare KV + D1 Storage]
```

### Project Structure
```
help-find-job/
├── src/
│   ├── handlers/           # Telegram message and webhook handlers
│   ├── services/          # AI, document, logging, session services
│   ├── types/            # TypeScript definitions
│   └── index.ts          # Main entry point
├── .env.example          # Environment variables template
├── .env.staging          # Public staging configuration
├── wrangler.toml         # Cloudflare Workers config
├── package.json
└── README.md
```

### Environment Configuration

- **`.env.example`** - Template for private environment variables
- **`.env.staging`** - Public staging bot configuration (safe to commit)
- **`.env`** - Your actual secrets (gitignored)
- **`wrangler.toml`** - Cloudflare deployment settings

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