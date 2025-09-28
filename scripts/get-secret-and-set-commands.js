#!/usr/bin/env node

/**
 * Script to get Cloudflare secret and set Telegram bot commands
 * Uses wrangler to get the secret and then sets bot commands
 */

const { execSync } = require('child_process');
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
 * Get bot token from Cloudflare using wrangler
 */
function getBotTokenFromCloudflare() {
  try {
    console.log('🔐 Getting bot token from Cloudflare secrets...');

    // Use wrangler to get the secret value
    // Note: This requires the secret to be available in the environment
    const result = execSync('wrangler secret list --env production', {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    console.log('✅ Found production secrets');
    console.log('📋 Available secrets:', result);

    // The secret is stored in Cloudflare, we need to get it differently
    console.log('⚠️  To get the actual secret value, you need to:');
    console.log('   1. Go to Cloudflare Workers dashboard');
    console.log('   2. Find your worker: help-with-job-search-telegram-bot');
    console.log('   3. Go to Settings → Secrets');
    console.log('   4. Copy the TELEGRAM_BOT_TOKEN value');

    return null;
  } catch (error) {
    console.error('❌ Failed to get secrets from Cloudflare:', error.message);
    return null;
  }
}

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
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

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
    console.log('❌ No valid bot token found');
    console.log('');
    console.log('To fix this:');
    console.log('1. Get your bot token from Cloudflare dashboard');
    console.log('2. Set it in your environment:');
    console.log('   export TELEGRAM_BOT_TOKEN="your_actual_token"');
    console.log('3. Or update .env.production with the real token');
    console.log('');
    console.log('Then run this script again.');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}
