#!/usr/bin/env node

/**
 * Script to set Telegram bot commands for production using Cloudflare secrets
 * Gets the bot token from Cloudflare secrets and sets commands via Telegram API
 */

const https = require('https');
const { execSync } = require('child_process');

// Bot commands in Russian as requested
const BOT_COMMANDS = [
  {
    command: 'start',
    description: 'Запустить бота',
  },
  {
    command: 'help',
    description: 'Показать справку',
  },
  {
    command: 'send_resume',
    description: 'Отправить резюме',
  },
  {
    command: 'send_job_ad',
    description: 'Отправить вакансию',
  },
  {
    command: 'get_logs',
    description: 'Получить логи',
  },
  {
    command: 'show_structured_resume_text',
    description: 'Показать структурированное резюме',
  },
  {
    command: 'structure_my_resume',
    description: 'Структурировать мое резюме',
  },
  {
    command: 'show_raw_text_resume',
    description: 'Показать сырой текст резюме (отладка)',
  },
];

/**
 * Get bot token from Cloudflare secrets using wrangler
 */
function getBotTokenFromCloudflare() {
  try {
    console.log('🔐 Getting bot token from Cloudflare secrets...');

    // Use wrangler to get the secret (this will prompt for the secret value)
    // We'll use a different approach - get it from the worker environment
    console.log(
      '⚠️  Note: This script needs the bot token to be available in the environment'
    );
    console.log('   You can either:');
    console.log('   1. Set TELEGRAM_BOT_TOKEN in your local environment');
    console.log('   2. Use wrangler secret put to set it locally');
    console.log('   3. Get it from Cloudflare dashboard and set it manually');

    return null;
  } catch (error) {
    console.error('❌ Failed to get bot token from Cloudflare:', error.message);
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

    req.on('error', (error) => {
      reject(error);
    });

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
    const response = await makeTelegramRequest(url, {
      commands: BOT_COMMANDS,
    });

    console.log('✅ Commands set successfully for Production bot');
    console.log('🤖 Bot: @job_search_help_bot');
    console.log(
      `📋 Commands: ${BOT_COMMANDS.map((cmd) => `/${cmd.command}`).join(', ')}`
    );

    return true;
  } catch (error) {
    console.error(
      '❌ Failed to set commands for Production bot:',
      error.message
    );
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Setting Telegram bot commands for production...');
  console.log('');

  // Try to get bot token from environment
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN environment variable is not set');
    console.log('');
    console.log('To fix this, you can:');
    console.log('1. Set the token in your environment:');
    console.log('   export TELEGRAM_BOT_TOKEN="your_bot_token_here"');
    console.log('');
    console.log('2. Or create a .env.production file with:');
    console.log('   TELEGRAM_BOT_TOKEN=your_bot_token_here');
    console.log('');
    console.log('3. Or get it from Cloudflare dashboard and set it manually');
    process.exit(1);
  }

  const success = await setBotCommands(botToken);

  console.log('');
  if (success) {
    console.log('🎉 Production bot commands updated successfully!');
  } else {
    console.log('❌ Failed to update production bot commands');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = { setBotCommands, BOT_COMMANDS };
