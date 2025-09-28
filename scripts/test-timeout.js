#!/usr/bin/env node

/**
 * Test script to verify timeout handling
 */

const https = require('https');

async function testTimeout() {
  console.log('🧪 Testing Timeout Handling...\n');

  try {
    // Test with staging bot
    console.log('1. Testing staging bot with timeout...');
    
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
        text: 'Короткое резюме для тестирования',
      },
    };

    // First send resume
    console.log('Sending resume...');
    await sendWebhook('https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev', testMessage);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Now try to structure it
    const structureMessage = {
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
        text: '/structure_my_resume',
      },
    };

    console.log('Sending structure command...');
    const startTime = Date.now();
    
    const response = await sendWebhook('https://help-with-job-search-telegram-bot-staging.vova-likes-smoothy.workers.dev', structureMessage);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ Response received');
    console.log('   Duration:', duration, 'ms');
    console.log('   Status Code:', response.statusCode);
    console.log('   Response Length:', response.body.length, 'characters');
    
    if (duration > 20000) {
      console.log('⚠️ Response took longer than 20 seconds - timeout may not be working');
    } else {
      console.log('✅ Response was fast - timeout is working');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function sendWebhook(url, message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(message);
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
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
testTimeout();
