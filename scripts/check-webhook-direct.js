#!/usr/bin/env node

/**
 * Check webhook configuration using staging bot token from worker
 */

async function checkWebhook() {
  try {
    console.log('🔍 Getting staging bot token from worker...');
    
    // Get the bot info from our staging worker 
    const debugResponse = await fetch('https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev/debug-bot', {
      method: 'POST'
    });
    const debug = await debugResponse.json();
    
    if (!debug.botInfo?.ok) {
      console.error('❌ Cannot get bot info from staging worker');
      return;
    }
    
    const botId = debug.botInfo.result.id;
    const botUsername = debug.botInfo.result.username;
    console.log(`🤖 Bot: @${botUsername} (ID: ${botId})`);
    
    // We need to extract the token from somewhere since we can't get it directly
    // Let's check if webhook is set to our staging URL
    console.log('\n📍 Expected webhook: https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev/webhook');
    
    // Test if our webhook endpoint responds
    const webhookTest = await fetch('https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev/webhook', {
      method: 'GET'
    });
    
    console.log('🧪 Webhook endpoint test:', webhookTest.status, webhookTest.statusText);
    
    if (webhookTest.status === 405) {
      console.log('✅ Webhook endpoint is responding (405 Method Not Allowed for GET is expected)');
    } else {
      console.log('⚠️ Unexpected webhook response');
    }
    
    console.log('\n🔧 To manually check webhook, you would need to:');
    console.log('1. Get the bot token from Wrangler secrets');
    console.log('2. Call https://api.telegram.org/bot<TOKEN>/getWebhookInfo');
    console.log('3. Verify it points to our staging URL');
    
    console.log('\n💡 The issue might be:');
    console.log('- Webhook not set for this specific bot token');
    console.log('- Different bot token in staging vs what webhook was set for');
    console.log('- Webhook pointing to wrong URL');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkWebhook();
