# 🤖 Resume & Job Matching Bot

**Simple Telegram bot to collect resumes and job descriptions**

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kobzevvv/help-find-job)

## 📋 What It Does

This Telegram bot helps you collect resumes and job descriptions through simple commands:

### **🎯 Core Features**
- **📄 Resume Collection**: Send your resume as text or PDF file
- **💼 Job Ad Collection**: Send job descriptions as text or PDF file
- **🔄 Multi-message Support**: Send content in multiple messages
- **✅ One-click Completion**: Use buttons to finish sending content
- **🌍 Simple Interface**: Easy to use with clear instructions

### **📱 How It Works**
1. Send `/send_resume` to start sending your resume
2. Send text or PDF files (up to 10MB)
3. Click "Done" button or type "готово" when finished
4. Send `/send_job_ad` to start sending job description
5. Repeat the process for job ads

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

The bot supports the following commands (available in Russian for user interface):

| Command | Description | Russian Description |
|---------|-------------|-------------------|
| `/start` | Start the bot | Запустить бота |
| `/help` | Show help | Показать справку |
| `/send_resume` | Send resume | Отправить резюме |
| `/send_job_ad` | Send job ad | Отправить вакансию |
| `/get_logs` | Get logs (admin) | Получить логи |

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

### **🤖 Command Management**
- **File**: [`scripts/set-bot-commands.js`](scripts/set-bot-commands.js)
- **Purpose**: Central command definition and deployment
- **Commands**: `npm run telegram-bot-commands [environment]`
- **Integration**: Automatically runs during deployment

## 🔒 Privacy & Security

- **No data storage**: Files are processed and immediately discarded
- **Encrypted communication**: All messages secured via HTTPS
- **Session-based**: Data expires automatically after use
- **No tracking**: Only essential bot functionality, no analytics

## 🤝 Contributing

We welcome contributions! See [DEVELOPER_QUICK_START.md](docs/DEVELOPER_QUICK_START.md) for setup instructions.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**🧪 Try the bot now: [@job_search_help_staging_bot](https://t.me/job_search_help_staging_bot)**