#!/usr/bin/env node

/**
 * Test script to demonstrate the improved error handling
 */

const https = require('https');

// Test with a short resume that should trigger the improved error message
async function testErrorHandling() {
  console.log('🧪 Testing Improved Error Handling...\n');

  try {
    // Test with a very short resume (should trigger length validation)
    console.log('1. Testing with short resume (should show length error)...');

    const shortResumeMessage = {
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
        text: 'Короткое резюме',
      },
    };

    // First, simulate sending a resume
    const resumeMessage = {
      update_id: 123456790,
      message: {
        message_id: 2,
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
        text: 'Короткое резюме',
      },
    };

    // Send resume first
    await sendWebhook(resumeMessage);
    console.log('✅ Sent short resume');

    // Now try to structure it
    const structureMessage = {
      update_id: 123456791,
      message: {
        message_id: 3,
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

    const response = await sendWebhook(structureMessage);
    console.log('✅ Structure command processed');
    console.log('   Status Code:', response.statusCode);
    console.log('   Response Length:', response.body.length, 'characters');

    console.log('\n🎉 Error handling test completed!');
    console.log(
      '📱 The bot should now show helpful error messages when resume is too short or incomplete.'
    );
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function sendWebhook(message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(message);

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
}

// Run the test
testErrorHandling();
