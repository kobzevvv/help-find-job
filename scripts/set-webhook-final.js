#!/usr/bin/env node

/**
 * Set webhook for staging bot with the correct token
 */

const BOT_TOKEN = process.argv[2];

if (!BOT_TOKEN) {
  console.error('Usage: node scripts/set-webhook-final.js <BOT_TOKEN>');
  process.exit(1);
}

async function setWebhookFinal() {
  try {
    const webhookUrl = 'https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev/webhook';
    
    console.log('🔗 Setting webhook for staging bot...');
    console.log('📍 Webhook URL:', webhookUrl);
    console.log('🤖 Bot token length:', BOT_TOKEN.length);
    
    // First check current webhook
    const currentResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const current = await currentResponse.json();
    
    if (current.ok) {
      console.log('📋 Current webhook:', current.result.url || 'Not set');
      console.log('📊 Pending updates:', current.result.pending_update_count || 0);
    }
    
    // Set new webhook
    const setResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true
      })
    });
    
    const result = await setResponse.json();
    
    if (result.ok) {
      console.log('✅ Webhook set successfully!');
      
      // Verify it was set
      const verifyResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
      const verify = await verifyResponse.json();
      
      if (verify.ok) {
        console.log('✅ Verified webhook URL:', verify.result.url);
        console.log('📊 Pending updates cleared:', verify.result.pending_update_count || 0);
      }
    } else {
      console.error('❌ Failed to set webhook:', result);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setWebhookFinal();
