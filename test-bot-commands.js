#!/usr/bin/env node

/**
 * Simple script to test and set bot commands
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
          resolve(response);
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

async function testBotToken(botToken) {
  console.log('🔍 Testing bot token...');

  try {
    const response = await makeTelegramRequest(
      `https://api.telegram.org/bot${botToken}/getMe`,
      {}
    );

    if (response.ok) {
      console.log('✅ Bot token is valid');
      console.log(`🤖 Bot: @${response.result.username}`);
      console.log(`📝 Bot name: ${response.result.first_name}`);
      return true;
    } else {
      console.log('❌ Bot token is invalid:', response.description);
      return false;
    }
  } catch (error) {
    console.log('❌ Error testing bot token:', error.message);
    return false;
  }
}

async function setBotCommands(botToken) {
  console.log('🔧 Setting bot commands...');

  try {
    const response = await makeTelegramRequest(
      `https://api.telegram.org/bot${botToken}/setMyCommands`,
      {
        commands: BOT_COMMANDS,
      }
    );

    if (response.ok) {
      console.log('✅ Bot commands set successfully');
      console.log(
        `📋 Commands: ${BOT_COMMANDS.map((cmd) => `/${cmd.command}`).join(', ')}`
      );
      return true;
    } else {
      console.log('❌ Failed to set bot commands:', response.description);
      return false;
    }
  } catch (error) {
    console.log('❌ Error setting bot commands:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing and setting bot commands...');
  console.log('');

  // Try to get bot token from environment
  const botToken = process.env.TELEGRAM_BOT_PRODUCTION_TOKEN;

  if (!botToken) {
    console.log('❌ TELEGRAM_BOT_PRODUCTION_TOKEN not found in environment');
    console.log('');
    console.log('Please set it:');
    console.log('export TELEGRAM_BOT_PRODUCTION_TOKEN="your_bot_token"');
    process.exit(1);
  }

  console.log('✅ Found bot token in environment');

  // Test the bot token
  const isValid = await testBotToken(botToken);
  if (!isValid) {
    console.log('❌ Bot token is invalid, cannot proceed');
    process.exit(1);
  }

  // Set bot commands
  const success = await setBotCommands(botToken);
  if (success) {
    console.log('');
    console.log('🎉 Bot commands updated successfully!');
    console.log('You can now test the bot with /show_raw_text_resume');
  } else {
    console.log('');
    console.log('❌ Failed to update bot commands');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}
