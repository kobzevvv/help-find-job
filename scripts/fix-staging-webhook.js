#!/usr/bin/env node

/**
 * Fix staging webhook by getting the correct bot token from worker
 */

async function fixStagingWebhook() {
  try {
    console.log('🔍 Getting staging bot info...');
    
    // Get bot info from staging worker
    const healthResponse = await fetch('https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev/health');
    const health = await healthResponse.json();
    
    console.log('📊 Staging worker status:', health);
    
    if (!health.botTokenPresent) {
      console.error('❌ No bot token in staging worker');
      return false;
    }
    
    // Use the debug endpoint to get actual bot info
    const debugResponse = await fetch('https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev/debug-bot', {
      method: 'POST'
    });
    const debug = await debugResponse.json();
    
    console.log('🤖 Bot info:', debug.botInfo);
    
    if (!debug.botInfo?.ok) {
      console.error('❌ Bot token invalid in staging worker');
      return false;
    }
    
    const botUsername = debug.botInfo.result.username;
    console.log(`✅ Found staging bot: @${botUsername}`);
    
    // The worker has the correct token, webhook should work
    // Problem might be that webhook is set for wrong bot
    console.log('\n🔧 The issue is that you might be testing the wrong bot!');
    console.log(`📱 Make sure you're sending commands to: @${botUsername}`);
    console.log('📍 Not to your production bot!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

fixStagingWebhook();
