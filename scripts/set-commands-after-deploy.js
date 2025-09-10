#!/usr/bin/env node

/**
 * Post-deployment script to set bot commands
 * Automatically called after successful deployment
 */

const { execSync } = require('child_process');
const https = require('https');
const path = require('path');

// Get the target environment from command line arguments
const targetEnvironment = process.argv[2] || 'staging';

console.log(`🤖 Setting bot commands for ${targetEnvironment} environment...`);

async function setCommandsAfterDeploy() {
  try {
    // Load environment variables
    require('dotenv').config({
      path: targetEnvironment === 'staging' ? '.env.staging' : '.env'
    });

    // Verify the deployment was successful by checking health endpoint
    const healthUrl = targetEnvironment === 'staging'
      ? 'https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev/health'
      : 'https://help-with-job-search-telegram-bot.vova-likes-smoothy.workers.dev/health';

    console.log(`🔍 Verifying deployment at: ${healthUrl}`);

    const healthResponse = await fetch(healthUrl);
    if (!healthResponse.ok) {
      throw new Error(`Deployment verification failed: ${healthResponse.status}`);
    }

    const health = await healthResponse.json();
    console.log(`✅ Deployment verified - Environment: ${health.configuration?.environment || 'unknown'}`);

    // Run the telegram-bot-commands command
    console.log(`🚀 Setting commands for ${targetEnvironment}...`);

    const command = `npm run telegram-bot-commands ${targetEnvironment}`;
    execSync(command, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    console.log(`✅ Bot commands set successfully for ${targetEnvironment}!`);
    console.log(`🤖 You can now test the bot: @${targetEnvironment === 'staging' ? 'job_search_help_staging_bot' : 'job_search_help_bot'}`);

  } catch (error) {
    console.error(`❌ Failed to set bot commands: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
setCommandsAfterDeploy();
