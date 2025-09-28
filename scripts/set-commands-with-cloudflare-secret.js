#!/usr/bin/env node

/**
 * Script to set Telegram bot commands using Cloudflare secrets
 * This script will help you get the secret and set the commands
 */

const https = require('https');

// Bot commands
const BOT_COMMANDS = [
  { command: 'start', description: 'Запустить бота' },
  { command: 'help', description: 'Показать справку' },
  { command: 'send_resume', description: 'Отправить резюме' },
  { command: 'send_job_ad', description: 'Отправить вакансию' },
  { command: 'get_logs', description: 'Получить логи' },
  {
    command: 'show_structured_resume_text',
    description: 'Показать структурированное резюме',
  },
  { command: 'structure_my_resume', description: 'Структурировать мое резюме' },
  {
    command: 'show_raw_text_resume',
    description: 'Показать сырой текст резюме (отладка)',
  },
];

/**
 * Make HTTPS request to Telegram API
 */
function makeTelegramRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.ok) {
            resolve(response);
          } else {
            reject(new Error(`Telegram API error: ${response.description}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', (error) => reject(error));
    req.write(postData);
    req.end();
  });
}

/**
 * Set bot commands using Telegram API
 */
async function setBotCommands(botToken) {
  const url = `https://api.telegram.org/bot${botToken}/setMyCommands`;

  console.log('🔧 Setting commands for Production bot...');

  try {
    const response = await makeTelegramRequest(url, { commands: BOT_COMMANDS });

    console.log('✅ Commands set successfully for Production bot');
    console.log('🤖 Bot: @job_search_help_bot');
    console.log(
      `📋 Commands: ${BOT_COMMANDS.map((cmd) => `/${cmd.command}`).join(', ')}`
    );

    return true;
  } catch (error) {
    console.error('❌ Failed to set commands:', error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Setting Telegram bot commands for production...');
  console.log('');

  // Check if token is in environment
  const botToken = process.env.TELEGRAM_BOT_PRODUCTION_TOKEN;

  if (botToken && botToken !== 'your_production_bot_token_here') {
    console.log('✅ Found bot token in environment');
    const success = await setBotCommands(botToken);

    if (success) {
      console.log('🎉 Production bot commands updated successfully!');
    } else {
      console.log('❌ Failed to update production bot commands');
      process.exit(1);
    }
  } else {
    console.log('❌ No valid bot token found in environment');
    console.log('');
    console.log('To get your bot token from Cloudflare:');
    console.log('');
    console.log('1. Go to Cloudflare Workers dashboard:');
    console.log('   https://dash.cloudflare.com/');
    console.log('');
    console.log('2. Find your worker: help-with-job-search-telegram-bot');
    console.log('');
    console.log('3. Go to Settings → Secrets');
    console.log('');
    console.log('4. Copy the TELEGRAM_BOT_TOKEN value');
    console.log('');
    console.log('5. Set it in your environment:');
    console.log('   export TELEGRAM_BOT_PRODUCTION_TOKEN="your_actual_token"');
    console.log('');
    console.log('6. Run this script again:');
    console.log('   node scripts/set-commands-with-cloudflare-secret.js');
    console.log('');
    console.log('Or update .env.production with the real token and run:');
    console.log('   npm run telegram-bot-commands production');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}
