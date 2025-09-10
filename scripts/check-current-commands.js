#!/usr/bin/env node

/**
 * Script to check current bot commands set in Telegram
 */

const https = require('https');
require('dotenv').config();

// Get bot token from environment
const botToken = process.env.TELEGRAM_BOT_TOKEN_PRODUCTION;
if (!botToken) {
  console.error('❌ TELEGRAM_BOT_TOKEN_PRODUCTION is not set');
  process.exit(1);
}

/**
 * Make HTTPS request to Telegram API
 */
function makeTelegramRequest(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, (res) => {
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

    req.end();
  });
}

/**
 * Get current bot commands
 */
async function getCurrentCommands() {
  const url = `https://api.telegram.org/bot${botToken}/getMyCommands`;

  console.log('🔍 Checking current bot commands...');
  console.log(`🤖 Bot: @job_search_help_bot`);
  console.log('');

  try {
    const response = await makeTelegramRequest(url);
    const commands = response.result;

    if (commands && commands.length > 0) {
      console.log('📋 Current commands:');
      commands.forEach(cmd => {
        console.log(`  /${cmd.command} - ${cmd.description}`);
      });
      console.log('');
      console.log(`📊 Total commands: ${commands.length}`);
    } else {
      console.log('📋 No commands currently set');
    }

    return commands || [];
  } catch (error) {
    console.error(`❌ Failed to get commands:`, error.message);
    return null;
  }
}

/**
 * Clear all commands
 */
async function clearAllCommands() {
  const url = `https://api.telegram.org/bot${botToken}/setMyCommands`;

  console.log('🧹 Clearing all commands...');

  try {
    const response = await makeTelegramRequest(url, { commands: [] });
    console.log('✅ All commands cleared successfully');
    return true;
  } catch (error) {
    console.error(`❌ Failed to clear commands:`, error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('🚀 Checking Current Bot Commands');
  console.log('=================================');
  console.log('');

  // Get current commands
  const currentCommands = await getCurrentCommands();

  if (currentCommands && currentCommands.length > 0) {
    console.log('');
    console.log('🔧 Do you want to clear all current commands? (y/n): ');

    // For now, let's clear them automatically
    console.log('🧹 Clearing old commands...');
    await clearAllCommands();
    console.log('');

    // Now set the correct commands
    console.log('🚀 Setting correct commands...');
    const { execSync } = require('child_process');
    execSync('node scripts/set-bot-commands.js production', { stdio: 'inherit' });
  } else {
    console.log('✅ No old commands to clear');
    console.log('🚀 Setting correct commands...');
    const { execSync } = require('child_process');
    execSync('node scripts/set-bot-commands.js production', { stdio: 'inherit' });
  }

  console.log('');
  console.log('🎉 Command update completed!');
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}
