/**
 * Script to set Telegram webhook
 */

// Usage: node scripts/set-webhook.js <worker-url>
// Example: node scripts/set-webhook.js https://resume-matcher-dev.your-subdomain.workers.dev

const workerUrl = process.argv[2];

if (!workerUrl) {
  console.error('Usage: node scripts/set-webhook.js <worker-url>');
  process.exit(1);
}

const webhookUrl = `${workerUrl}/webhook`;

console.log(`Setting webhook to: ${webhookUrl}`);

// Make request to the worker's set-webhook endpoint
fetch(`${workerUrl}/set-webhook`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ url: webhookUrl }),
})
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('✅ Webhook set successfully!');
    } else {
      console.error('❌ Failed to set webhook:', data.message);
    }
  })
  .catch(error => {
    console.error('❌ Error setting webhook:', error);
  });
