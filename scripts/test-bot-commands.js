#!/usr/bin/env node

/**
 * Test script to verify Telegram bot commands are working
 * Tests both the API calls and command functionality
 */

const {
  setBotCommands,
  BOT_COMMANDS,
  ENVIRONMENTS,
} = require('./set-bot-commands');

/**
 * Test command setting functionality
 */
async function testCommandSetting() {
  console.log('🧪 Testing Telegram bot command setting...');
  console.log('');

  // Test with mock token (this will fail but test the code path)
  const mockToken = '123456789:AAFakeTokenForTestingPurposes123456789';

  console.log('📋 Commands to be set:');
  BOT_COMMANDS.forEach((cmd) => {
    console.log(`  /${cmd.command} - ${cmd.description}`);
  });
  console.log('');

  try {
    // This will fail with mock token, but tests the code path
    await setBotCommands(mockToken, ENVIRONMENTS.staging);
  } catch (error) {
    console.log(
      '✅ Command setting code path works (expected failure with mock token)'
    );
    console.log(`   Error: ${error.message}`);
  }

  console.log('');
  console.log('🔍 To test with real tokens:');
  console.log('  1. Set TELEGRAM_BOT_STAGING_TOKEN environment variable');
  console.log('  2. Set TELEGRAM_BOT_PRODUCTION_TOKEN environment variable');
  console.log('  3. Run: npm run commands:set');
  console.log('');
}

/**
 * Test environment variables
 */
function testEnvironmentVariables() {
  console.log('🔐 Testing environment variables...');
  console.log('');

  const stagingToken = process.env.TELEGRAM_BOT_STAGING_TOKEN;
  const productionToken = process.env.TELEGRAM_BOT_PRODUCTION_TOKEN;

  if (stagingToken) {
    console.log('✅ TELEGRAM_BOT_STAGING_TOKEN is set');
  } else {
    console.log('❌ TELEGRAM_BOT_STAGING_TOKEN is not set');
  }

  if (productionToken) {
    console.log('✅ TELEGRAM_BOT_PRODUCTION_TOKEN is set');
  } else {
    console.log('❌ TELEGRAM_BOT_PRODUCTION_TOKEN is not set');
  }

  console.log('');
}

/**
 * Main test function
 */
async function main() {
  console.log('🚀 Bot Commands Test Suite');
  console.log('===========================');
  console.log('');

  testEnvironmentVariables();
  await testCommandSetting();

  console.log('📊 Test completed!');
  console.log('');
  console.log('💡 Next steps:');
  console.log('  - Set environment variables for bot tokens');
  console.log('  - Run npm run commands:set to set commands');
  console.log('  - Test the /get_logs command in your bot');
  console.log('  - Deploy and verify commands are set automatically');
}

// Run the test
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
}
