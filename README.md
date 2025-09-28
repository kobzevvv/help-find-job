# 🤖 Simple Resume & Job Collection Bot

**Lightweight Telegram bot for collecting resumes and job descriptions**

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kobzevvv/help-find-job)

## 📋 What It Does

A simple Telegram bot that collects resumes and job descriptions with minimal complexity:

### **🎯 Core Features**
- **📄 Resume Collection**: Text or PDF files (up to 10MB)
- **💼 Job Ad Collection**: Text or PDF files (up to 10MB)  
- **🔄 Multi-message Support**: Send content across multiple messages
- **✅ One-click Completion**: "Done" buttons for easy finishing
- **🔐 Admin Commands**: Secure logging and monitoring

### **📱 How It Works**
1. `/send_resume` - Start resume collection
2. Send text or PDF files
3. Click "Done" button when finished
4. `/send_job_ad` - Start job description collection
5. Repeat process for job ads

## 🚀 Quick Start

### **🧪 Try It Now** (No Setup Required!)
Just message the public test bot: [@job_search_help_staging_bot](https://t.me/job_search_help_staging_bot)

### **💻 For Developers**

#### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [Cloudflare Account](https://dash.cloudflare.com/sign-up) (free tier works)

#### Simple Setup
```bash
git clone https://github.com/kobzevvv/help-find-job.git
cd help-find-job
npm install

# Deploy to staging (includes automatic bot command setup)
npm run deploy:staging

# Or deploy safely with full validation
npm run deploy:safe:staging
```

#### Bot Command Management
```bash
# Set commands for all environments
npm run telegram-bot-commands

# Set commands for specific environment
npm run telegram-bot-commands staging
npm run telegram-bot-commands production
```

## 🤖 Test the Bot

### **🧪 Public Test Bot**
**[@job_search_help_staging_bot](https://t.me/job_search_help_staging_bot)** - Try it right now!

### **🏭 Production Bot**
**[@job_search_help_bot](https://t.me/job_search_help_bot)** - Live production bot
- ✅ **Deployed & Live** - Ready for production use
- 🔒 **Secure admin commands** - Use your custom admin password
- 🌐 **Production URL**: https://help-with-job-search-telegram-bot.vova-likes-smoothy.workers.dev

**To update production admin password:**
```bash
wrangler secret put ADMIN_PASSWORD --env production
# Then enter your secure password when prompted
```

### **🔧 Create Your Own Bot** (Optional)

1. Message [@BotFather](https://t.me/BotFather) in Telegram
2. Type `/newbot` and follow instructions
3. Copy the bot token
4. Set webhook:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-worker.workers.dev/webhook"}'
   ```

## 🤖 Bot Commands

### **👥 User Commands**
| Command | Description |
|---------|-------------|
| `/start` | Start the bot |
| `/help` | Show help |
| `/send_resume` | Send resume |
| `/send_job_ad` | Send job ad |

### **🔐 Admin Commands**
| Command | Description | Usage |
|---------|-------------|-------|
| `/get_last_10_messages` | Last 10 messages | `/get_last_10_messages YOUR_PASSWORD` |
| `/get_last_100_messages` | Last 100 messages | `/get_last_100_messages YOUR_PASSWORD` |
| `/log_summary` | Log summary | `/log_summary YOUR_PASSWORD` |
| `/get_logs` | Admin help | Shows admin command guide |

### **📝 Command Declaration**

Bot commands are centrally declared in [`scripts/set-bot-commands.js`](scripts/set-bot-commands.js) for easy maintenance and consistency across environments.

**For Developers:**
- Commands are automatically set during deployment via `npm run telegram-bot-commands`
- Environment-specific commands are configured for staging and production
- Use `npm run telegram-bot-commands [staging|production]` to update commands manually

## 📱 Usage Examples

### **Basic Conversation Flow**

```
User: /start
Bot: 👋 Welcome! Use:
/send_resume - send resume
/send_job_ad - send job ad
/help - help

User: /send_resume
Bot: 📄 Send your resume. You can send text or PDF files.

User: [sends resume text]
Bot: ✅ Added to resume. Continue or click button:
[✅ Done with resume button]

User: [clicks button]
Bot: ✅ Resume received!

User: /send_job_ad
Bot: 💼 Send job description. You can send text or PDF files.

User: [sends job text]
Bot: ✅ Added to job ad. Continue or click button:
[✅ Done with job ad button]

### **🔐 Admin Usage**

Admin commands require a secure password:

```bash
# View recent logs
/get_last_10_messages YOUR_PASSWORD

# Get log summary
/log_summary YOUR_PASSWORD

# Get admin help
/get_logs
```

**Setting Admin Password:**
```bash
# For production
wrangler secret put ADMIN_PASSWORD --env production

# For staging  
wrangler secret put ADMIN_PASSWORD --env staging
```

## 🛠️ Technical Details

### **Tech Stack**
- **Runtime**: Cloudflare Workers (serverless)
- **Language**: TypeScript
- **Storage**: Cloudflare KV (sessions), D1 (logs)
- **AI**: Cloudflare AI (PDF text extraction)
- **Deployment**: Automated CI/CD

### **Project Structure**
```
help-find-job/
├── src/
│   ├── handlers/          # Telegram message handling
│   ├── services/          # Core business logic
│   └── types/             # TypeScript definitions
├── docs/                 # Documentation
├── scripts/
│   ├── set-bot-commands.js  # 🤖 Bot command management
│   └── deploy-safely.sh     # 🚀 Safe deployment script
└── wrangler.toml         # Cloudflare configuration
```

### **🤖 Deployment**
```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production  
npm run deploy:prod

# Set bot commands (if needed)
npm run telegram-bot-commands production
```

## 🌐 Live Bots

### **🏭 Production Bot**
**[@job_search_help_bot](https://t.me/job_search_help_bot)** - Live production bot
- ✅ **Deployed & Live** - Ready for production use
- 🔒 **Secure admin commands** - Use your custom admin password
- 🌐 **Production URL**: https://help-with-job-search-telegram-bot.vova-likes-smoothy.workers.dev

**To update production admin password:**
```bash
wrangler secret put ADMIN_PASSWORD --env production
# Then enter your secure password when prompted
```

### **🧪 Staging Bot**  
**[@job_search_help_staging_bot](https://t.me/job_search_help_staging_bot)** - Test environment
- 🧪 **Testing & Development** - Safe environment for testing changes
- 🔓 **Open admin access** - No password required for staging
- 🌐 **Staging URL**: https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev

## 🔒 Security

- **Secure admin access**: Password-protected admin commands
- **Environment isolation**: Separate staging and production environments  
- **Session-based storage**: Temporary data that expires automatically
- **HTTPS encryption**: All communications secured

## 🤝 Contributing

We welcome contributions! See [DEVELOPER_QUICK_START.md](docs/DEVELOPER_QUICK_START.md) for setup instructions.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**🧪 Try the staging bot: [@job_search_help_staging_bot](https://t.me/job_search_help_staging_bot)**

**🏭 Use the production bot: [@job_search_help_bot](https://t.me/job_search_help_bot)**