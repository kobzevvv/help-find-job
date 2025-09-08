# 🤖 Telegram Resume Matcher Bot

**AI-powered Telegram bot that analyzes how well your resume matches job descriptions**

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/yourusername/help-find-job)

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

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ 
- [Cloudflare Account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Telegram Bot Token](https://core.telegram.org/bots#botfather)
- [OpenAI API Key](https://platform.openai.com/api-keys)

### 1️⃣ Clone and Install

```bash
git clone https://github.com/yourusername/help-find-job.git
cd help-find-job
npm install
```

### 2️⃣ Configure Environment

Choose your development approach:

#### **Option A: Personal Development Bot** (Recommended for new features)
```bash
cp env.template .env
# Edit .env with your personal bot token and credentials
```

#### **Option B: Test Against Staging Bot** (Quick testing)
```bash
cp .env.staging .env
# Edit .env with just your OpenAI API key - staging bot is pre-configured
```

💡 **See `.env.example` for detailed step-by-step instructions on getting each credential.**

### 🤝 **For Contributors**

**Quick testing**: Use `.env.staging` to test against [@job_search_help_staging_bot](https://t.me/job_search_help_staging_bot) - you only need an OpenAI API key!

### 3️⃣ Authenticate with Cloudflare

```bash
# Login to Cloudflare (opens browser for OAuth)
wrangler login
```

This opens your browser to authenticate with Cloudflare. If the browser doesn't open automatically, copy the URL from the terminal.

### 4️⃣ Create KV Storage

```bash
# Create storage namespaces for development
wrangler kv:namespace create "SESSIONS" --env development
wrangler kv:namespace create "CACHE" --env development

# Update wrangler.toml with the generated namespace IDs
# (replace the placeholder IDs with the real ones from the command output)
```

### 5️⃣ Deploy to Development

```bash
npm run deploy:dev
```

### 6️⃣ Set Up Telegram Webhook

```bash
# Set webhook URL (replace with your actual worker URL)
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-worker-name.your-subdomain.workers.dev/webhook"}'

# Or use the helper script:
node scripts/set-webhook.js https://your-worker-name.your-subdomain.workers.dev
```

### 7️⃣ Test Your Bot

1. Open Telegram and find your bot
2. Send `/start` or "Help match resume and job post"
3. Follow the conversation flow
4. Upload your resume and job description
5. Get AI-powered matching analysis!

## 🔧 Cloudflare Workers Setup

### Authentication Process

The `wrangler login` command opens your browser for OAuth authentication with Cloudflare:

1. **Run the command**: `wrangler login`
2. **Browser opens automatically** with a Cloudflare OAuth URL
3. **Authorize the application** in your browser
4. **Return to terminal** - you should see "Successfully logged in"

**If browser doesn't open**: Copy the OAuth URL from the terminal and paste it in your browser manually.

### Account Information

After authentication, you can verify your setup:

```bash
# Check your account details
wrangler whoami

# List your workers
wrangler deploy --dry-run
```

### KV Storage Requirements

Your bot needs KV storage for user sessions. The namespaces must be created **before** deployment:

1. **Create the namespaces** (see step 4 above)
2. **Update `wrangler.toml`** with the generated IDs
3. **Deploy your worker**

### Environment Variables vs Secrets

- **Environment variables** (in `wrangler.toml`): Non-sensitive configuration
- **Secrets** (via `wrangler secret put`): Sensitive API keys and tokens

The bot automatically reads from your `.env` file during development.

### Deployment Commands by Environment

```bash
# Development deployment (uses .env for secrets)
npm run deploy:dev

# Staging deployment (requires setting staging secrets first)
wrangler secret put TELEGRAM_BOT_TOKEN --env staging
wrangler secret put OPENAI_API_KEY --env staging
wrangler secret put WEBHOOK_SECRET --env staging
npm run deploy:staging

# Production deployment (requires setting production secrets first)
wrangler secret put TELEGRAM_BOT_TOKEN --env production
wrangler secret put OPENAI_API_KEY --env production
wrangler secret put WEBHOOK_SECRET --env production
npm run deploy:prod
```

### Bot Management

Each environment will have its own:
- ✅ **Telegram bot** (separate @BotFather bots)
- ✅ **Worker URL** (help-with-job-search-telegram-bot-dev.workers.dev)
- ✅ **KV namespaces** (separate storage per environment)
- ✅ **Webhook endpoint** (separate webhook URLs)

## 📚 Additional Resources

## 🤖 **Public Staging Bot** 

**🎯 Try it now**: [@job_search_help_staging_bot](https://t.me/job_search_help_staging_bot)

Our staging bot is **publicly available** for all developers to test features! 

- ✅ **Always up-to-date** with the latest `main` branch
- ✅ **Safe to break** - it's just for testing  
- ✅ **No setup required** - just click and test
- ✅ **Auto-deploys** on every PR merge

### 🚀 **Automated Staging Workflow**

Every time code is pushed to `main` or a PR is opened:

1. **🔄 Auto-deploy** to staging environment
2. **🤖 Update webhook** automatically  
3. **💬 PR comment** with direct bot link for testing
4. **✅ Health checks** verify deployment

### Multi-Environment Bot Setup

#### **Development Bot** (Personal)
Create your own bot for local development:
1. **Go to @BotFather** in Telegram
2. **Create dev bot**: `/newbot`
3. **Name**: "Your Bot Name - Dev" 
4. **Username**: "your_bot_dev_bot"
5. **Use token**: In `.env` as `TELEGRAM_BOT_TOKEN`

#### **Staging Bot** (Shared - PUBLIC)
**🎯 Bot**: [@job_search_help_staging_bot](https://t.me/job_search_help_staging_bot)  
**🔑 Token**: `8358869176:AAGo9WKrpUnbLBD-Zq40DIPpfdoBZroPVfI` (public)
- ✅ **Shared by all developers** for testing features
- ✅ **Auto-deploys** from GitHub Actions
- ✅ **Safe to use publicly** - no sensitive data

#### **Production Bot** (Private - Maintainers Only)
Production bot details are private and only accessible to maintainers.

### Detailed Credential Setup
- See `env.template` for step-by-step instructions on getting each API key and token
- Includes visual guides for finding Cloudflare Account ID
- Security best practices for webhook secrets
- Multi-bot environment configuration

### Troubleshooting Common Issues
- **KV namespace errors**: Make sure IDs in `wrangler.toml` match your created namespaces
- **Authentication errors**: Re-run `wrangler login` if token expires
- **Webhook issues**: Verify your worker URL is correct and accessible

## 🏗️ Architecture

### System Design
```
[Telegram] ↔️ [Cloudflare Workers] ↔️ [OpenAI GPT-4]
                      ↕️
            [Cloudflare KV Storage]
```

### Project Structure
```
help-find-job/
├── src/
│   ├── handlers/           # Telegram message handlers
│   ├── services/          # Business logic services
│   ├── utils/            # Shared utilities
│   ├── types/            # TypeScript definitions
│   └── index.ts          # Main entry point
├── tests/               # Test suites
├── docs/                # Documentation
├── config.json          # Application configuration (non-secret)
├── wrangler.toml        # Cloudflare Workers deployment config
├── env.template         # Environment secrets template
├── .env                # Your actual secrets (not committed)
├── package.json
└── README.md
```

### Configuration Architecture

The project uses a clean separation of concerns for configuration:

- **`config.json`** - Application settings, worker names, feature flags (committed to git)
- **`env.template`** - Template for secret values (committed to git)  
- **`.env.local`** - Your actual secrets and API keys (never committed)
- **`wrangler.toml`** - Cloudflare deployment and infrastructure settings (committed to git)

## 🔧 Development

### Local Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run tests
npm test

# Type checking
npm run type-check

# Lint code
npm run lint
```

### Environment Management

The project supports multiple environments:

- **Development**: Your personal testing environment
- **Staging**: Pre-production testing
- **Production**: Live bot for users

```bash
# Deploy to different environments
npm run deploy:dev      # Development
npm run deploy:staging  # Staging  
npm run deploy:prod     # Production
```

### Testing Workflow

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit       # Unit tests
npm run test:integration # Integration tests
npm run test:e2e        # End-to-end tests

# Test with coverage
npm run test:coverage
```

## 📊 Usage Examples

### Basic Conversation Flow

```
User: Help match resume and job post
Bot:  📄 I'll help you analyze how well your resume matches a job description! 
      Please send me your resume (PDF, DOCX, or TXT format).

User: [uploads resume.pdf]
Bot:  ✅ Resume received! Now please send me the job description you want to match against.

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
- ✅ Error handling without data exposure

## 🌐 Deployment Options

### Option 1: Cloudflare Workers (Recommended)
- ✅ Global edge deployment
- ✅ Zero cold starts
- ✅ Generous free tier
- ✅ Built-in DDoS protection

### Option 2: Yandex Cloud Functions
```bash
# For Russian developers
npm run deploy:yandex
```

### Option 3: Docker Container
```bash
# Build container
docker build -t resume-matcher .

# Run locally
docker run -p 3000:3000 --env-file .env.local resume-matcher

# Deploy to any cloud provider
```

## 📈 Monitoring & Analytics

### Built-in Metrics
- 📊 Request volume and response times
- 🔍 Error rates and types
- 👥 User engagement patterns
- 🎯 Analysis success rates

### Observability
```bash
# View logs
npm run logs

# Monitor performance
npm run metrics

# Check health
npm run health-check
```

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Setup
```bash
# Fork the repository
git clone https://github.com/yourusername/help-find-job.git
cd help-find-job

# Create feature branch
git checkout -b feature/amazing-feature

# Install dependencies
npm install

# Set up development environment
cp .env.example .env.local
# Add your development credentials

# Make your changes and test
npm test
npm run deploy:dev

# Submit pull request
```

### Development Guidelines
- 📝 Write tests for new features
- 🎨 Follow TypeScript best practices
- 📚 Update documentation
- 🔍 Ensure code passes all checks

## 🐛 Troubleshooting

### Common Issues

**Bot not responding to messages:**
```bash
# Check webhook status
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"

# Verify worker is deployed
npx wrangler tail
```

**OpenAI API errors:**
```bash
# Check API key and usage
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  "https://api.openai.com/v1/models"
```

**Deployment issues:**
```bash
# Check Cloudflare authentication
npx wrangler whoami

# Verify configuration
npx wrangler secret list
```

### Getting Help

- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/yourusername/help-find-job/issues)
- 💬 [Discussions](https://github.com/yourusername/help-find-job/discussions)
- 📧 [Email Support](mailto:support@yourproject.com)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Telegram Bot API](https://core.telegram.org/bots/api) for messaging platform
- [OpenAI](https://openai.com/) for AI analysis capabilities
- [Cloudflare Workers](https://workers.cloudflare.com/) for serverless infrastructure
- [Community Contributors](CONTRIBUTORS.md) for making this project better

## 🔮 Roadmap

### Version 1.1
- [ ] 🌐 Multi-language support (Russian, English)
- [ ] 📊 Enhanced analytics dashboard
- [ ] 🎨 Custom analysis prompts

### Version 1.2
- [ ] 🔄 Resume improvement suggestions
- [ ] 🎯 Job recommendation engine
- [ ] 👥 Team collaboration features

### Version 2.0
- [ ] 🌐 Web interface
- [ ] 📱 Mobile app
- [ ] 🤖 Multiple AI providers

---

**⭐ Star this repository if it helped you land your dream job!**

**🚀 Ready to get started? Follow the [Quick Start](#-quick-start) guide above!**

