#!/usr/bin/env node

/**
 * Script to set Telegram bot commands via API
 * Sets commands for both staging and production bots
 */

const https = require('https');

// Load environment variables based on target environment
const targetEnvironment = process.argv[2]; // staging, production, or undefined for both

// Load the appropriate .env file
if (targetEnvironment === 'staging') {
  require('dotenv').config({ path: '.env.staging' });
} else if (targetEnvironment === 'production') {
  require('dotenv').config({ path: '.env' });
} else {
  // For both environments, load both files (staging takes precedence for conflicts)
  require('dotenv').config({ path: '.env' });
  require('dotenv').config({ path: '.env.staging', override: false });
}

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

// Environment configuration
const ENVIRONMENTS = {
  staging: {
    name: 'staging',
    botTokenEnv: 'TELEGRAM_BOT_TOKEN_STAGING',
    botUsername: 'job_search_help_staging_bot',
    description: 'Staging bot',
  },
  production: {
    name: 'production',
    botTokenEnv: 'TELEGRAM_BOT_TOKEN_PRODUCTION',
    botUsername: 'job_search_help_bot',
    description: 'Production bot',
  },
};

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
 * Set commands for a specific bot
 */
async function setBotCommands(botToken, environment) {
  const url = `https://api.telegram.org/bot${botToken}/setMyCommands`;

  console.log(`🔧 Setting commands for ${environment.description}...`);

  try {
    const response = await makeTelegramRequest(url, {
      commands: BOT_COMMANDS,
    });

    console.log(`✅ Commands set successfully for ${environment.description}`);
    console.log(`🤖 Bot: @${environment.botUsername}`);
    console.log(
      `📋 Commands: ${BOT_COMMANDS.map((cmd) => `/${cmd.command}`).join(', ')}`
    );
    console.log('');

    return true;
  } catch (error) {
    console.error(
      `❌ Failed to set commands for ${environment.description}:`,
      error.message
    );
    return false;
  }
}

/**
 * Get bot token from environment variables
 */
function getBotToken(envVar) {
  const token = process.env[envVar];
  if (!token) {
    throw new Error(`Environment variable ${envVar} is not set`);
  }
  return token;
}

/**
 * Main function
 */
async function main() {
  const targetEnvironment = process.argv[2]; // staging, production, or undefined for both

  console.log('🚀 Setting Telegram bot commands...');
  console.log('');

  if (targetEnvironment && !ENVIRONMENTS[targetEnvironment]) {
    console.error(`❌ Invalid environment: ${targetEnvironment}`);
    console.error('Valid environments: staging, production');
    process.exit(1);
  }

  const environmentsToUpdate = targetEnvironment
    ? [ENVIRONMENTS[targetEnvironment]]
    : [ENVIRONMENTS.staging, ENVIRONMENTS.production];

  let successCount = 0;

  for (const env of environmentsToUpdate) {
    try {
      const botToken = getBotToken(env.botTokenEnv);
      const success = await setBotCommands(botToken, env);
      if (success) successCount++;
    } catch (error) {
      console.error(
        `❌ Failed to get token for ${env.description}: ${error.message}`
      );
    }
  }

  console.log('📊 Summary:');
  console.log(
    `✅ Successfully updated: ${successCount}/${environmentsToUpdate.length} bots`
  );
  console.log('');

  if (successCount === environmentsToUpdate.length) {
    console.log('🎉 All bot commands updated successfully!');
  } else {
    console.log(
      '⚠️ Some bot commands failed to update. Check the errors above.'
    );
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

module.exports = { setBotCommands, BOT_COMMANDS, ENVIRONMENTS };
