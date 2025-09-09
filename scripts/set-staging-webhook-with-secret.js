#!/usr/bin/env node

/**
 * Set Telegram webhook for staging environment with proper secret
 */

require('dotenv').config();

const STAGING_WORKER_URL = 'https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
  process.exit(1);
}

async function setWebhookWithSecret() {
  try {
    console.log('🔗 Setting webhook for staging bot WITH secret...');
    console.log('📍 Staging URL:', STAGING_WORKER_URL);
    
    const webhookUrl = `${STAGING_WORKER_URL}/webhook`;
    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`;
    
    // Generate a simple secret for testing
    const webhookSecret = 'staging-webhook-secret-123';
    
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: webhookSecret, // This will be sent in X-Telegram-Bot-Api-Secret-Token header
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true,
      }),
    });

    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Webhook set successfully with secret!');
      console.log('📱 Bot is now listening on:', webhookUrl);
      console.log('🔐 Secret configured for security');
      console.log('\n🔧 To update worker secret, run:');
      console.log(`wrangler secret put WEBHOOK_SECRET --env staging`);
      console.log(`And enter: ${webhookSecret}`);
    } else {
      console.error('❌ Failed to set webhook:', result);
    }
    
  } catch (error) {
    console.error('❌ Error setting webhook:', error);
  }
}

// Alternative: Set webhook without secret for testing
async function setWebhookWithoutSecret() {
  try {
    console.log('🔗 Setting webhook for staging bot WITHOUT secret (for testing)...');
    
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
        drop_pending_updates: true,
        // No secret_token - this means no secret validation
      }),
    });

    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Webhook set successfully WITHOUT secret!');
      console.log('📱 Bot is now listening on:', webhookUrl);
      console.log('⚠️ No secret validation (suitable for testing)');
    } else {
      console.error('❌ Failed to set webhook:', result);
    }
    
  } catch (error) {
    console.error('❌ Error setting webhook:', error);
  }
}

async function getWebhookInfo() {
  try {
    console.log('\n📋 Current webhook info:');
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    const result = await response.json();
    
    if (result.ok) {
      console.log('Current webhook URL:', result.result.url || 'Not set');
      console.log('Pending updates:', result.result.pending_update_count || 0);
      console.log('Has secret:', result.result.has_custom_certificate || 'Unknown');
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
  
  // For testing, let's set without secret first
  console.log('\n🧪 Setting up for testing (no secret validation)...');
  await setWebhookWithoutSecret();
  
  await getWebhookInfo();
}

main();
