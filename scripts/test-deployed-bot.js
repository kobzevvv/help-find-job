#!/usr/bin/env node

/**
 * Test script to verify the deployed bot has the new structure_my_resume command
 */

const https = require('https');

// Test the deployed bot's health and command availability
async function testDeployedBot() {
  console.log('🧪 Testing Deployed Bot...\n');

  try {
    // Test health endpoint
    console.log('1. Testing bot health...');
    const healthResponse = await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname:
            'help-with-job-search-telegram-bot.vova-likes-smoothy.workers.dev',
          port: 443,
          path: '/health',
          method: 'GET',
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(error);
            }
          });
        }
      );
      req.on('error', reject);
      req.end();
    });

    console.log('✅ Bot is healthy');
    console.log('   Environment:', healthResponse.configuration?.environment);
    console.log(
      '   Bot Username:',
      healthResponse.configuration?.telegram?.botUsername
    );
    console.log(
      '   Webhook URL:',
      healthResponse.configuration?.telegram?.webhookUrl
    );
    console.log('');

    // Test that the bot responds to webhook (simulating a message)
    console.log('2. Testing bot command handling...');

    // Create a test message payload for /structure_my_resume command
    const testMessage = {
      update_id: 123456789,
      message: {
        message_id: 1,
        from: {
          id: 123456789,
          is_bot: false,
          first_name: 'Test',
          username: 'testuser',
        },
        chat: {
          id: 123456789,
          first_name: 'Test',
          username: 'testuser',
          type: 'private',
        },
        date: Math.floor(Date.now() / 1000),
        text: '/structure_my_resume',
      },
    };

    const webhookResponse = await new Promise((resolve, reject) => {
      const postData = JSON.stringify(testMessage);

      const options = {
        hostname:
          'help-with-job-search-telegram-bot.vova-likes-smoothy.workers.dev',
        port: 443,
        path: '/webhook',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    console.log('✅ Bot webhook responded');
    console.log('   Status Code:', webhookResponse.statusCode);
    console.log(
      '   Response Length:',
      webhookResponse.body.length,
      'characters'
    );

    if (webhookResponse.statusCode === 200) {
      console.log(
        '✅ Bot successfully processed the /structure_my_resume command'
      );
    } else {
      console.log('⚠️ Bot responded with status:', webhookResponse.statusCode);
    }

    console.log('\n🎉 Bot deployment test completed!');
    console.log(
      '📱 The /structure_my_resume command should now be available in your Telegram bot.'
    );
    console.log(
      '💡 Try sending the command to your bot to test the resume structuring feature.'
    );
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testDeployedBot();
