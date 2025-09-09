#!/usr/bin/env node

/**
 * Set Telegram webhook for staging environment
 */

require('dotenv').config();

const STAGING_WORKER_URL = 'https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
  process.exit(1);
}

async function setWebhook() {
  try {
    console.log('🔗 Setting webhook for staging bot...');
    console.log('📍 Staging URL:', STAGING_WORKER_URL);
    
    const webhookUrl = `${STAGING_WORKER_URL}/webhook`;
    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`;
    
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true, // Clear any pending updates
      }),
    });

    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Webhook set successfully!');
      console.log('📱 Bot is now listening on:', webhookUrl);
      
      // Test the webhook
      console.log('\n🧪 Testing webhook...');
      const testResponse = await fetch(webhookUrl, {
        method: 'GET',
      });
      
      if (testResponse.ok) {
        console.log('✅ Webhook endpoint is responding');
      } else {
        console.log('⚠️ Webhook endpoint returned:', testResponse.status);
      }
      
    } else {
      console.error('❌ Failed to set webhook:', result);
    }
    
  } catch (error) {
    console.error('❌ Error setting webhook:', error);
  }
}

// Also check current webhook info
async function getWebhookInfo() {
  try {
    console.log('\n📋 Current webhook info:');
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    const result = await response.json();
    
    if (result.ok) {
      console.log('Current webhook URL:', result.result.url || 'Not set');
      console.log('Pending updates:', result.result.pending_update_count || 0);
      if (result.result.last_error_date) {
        console.log('Last error:', new Date(result.result.last_error_date * 1000));
        console.log('Last error message:', result.result.last_error_message);
      }
    }
  } catch (error) {
    console.error('Error getting webhook info:', error);
  }
}

async function main() {
  await getWebhookInfo();
  await setWebhook();
  await getWebhookInfo();
}

main();
