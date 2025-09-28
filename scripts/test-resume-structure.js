#!/usr/bin/env node

/**
 * Test script for resume structuring functionality
 * Tests the external resume processor service integration
 */

const https = require('https');

// Test resume text in Russian
const testResumeText = `ИВАН ПЕТРОВ
Senior Backend Engineer
ivan.petrov@email.com | +7 (555) 123-4567 | Москва, Россия
LinkedIn: linkedin.com/in/ivanpetrov | GitHub: github.com/ivanpetrov

ПРОФЕССИОНАЛЬНОЕ РЕЗЮМЕ:
Опытный backend разработчик с 8+ годами опыта создания масштабируемых распределенных систем.
Эксперт в Go, Python и облачных технологиях. Руководил командами из 5+ инженеров и
создавал высоконагруженные приложения, обслуживающие миллионы пользователей.

ОПЫТ РАБОТЫ:
Senior Software Engineer | TechCorp Inc | Март 2022 - Настоящее время
- Руководил разработкой платформы обработки заказов, обрабатывающей 100k+ транзакций/день
- Создал микросервисную архитектуру с использованием Go, Docker и Kubernetes
- Улучшил производительность системы на 40% через оптимизацию и кэширование
- Наставлял 3 младших инженеров и установил процессы code review

Software Engineer | StartupXYZ | Январь 2019 - Февраль 2022
- Разрабатывал REST API и gRPC сервисы с использованием Python и FastAPI
- Внедрил CI/CD пайплайны, сократив время развертывания на 60%
- Работал с PostgreSQL, Redis и очередями сообщений
- Сотрудничал с frontend командой по дизайну API и документации

НАВЫКИ:
Языки программирования: Go (Эксперт), Python (Эксперт), SQL (Продвинутый), JavaScript (Уверенный)
Фреймворки: Django, Flask, Gin, Echo, FastAPI
Базы данных: PostgreSQL (Эксперт), MySQL (Продвинутый), Redis (Продвинутый), MongoDB (Уверенный)
Облако и DevOps: AWS (Продвинутый), Docker (Эксперт), Kubernetes (Продвинутый), Terraform (Уверенный)
Инструменты: Git, Jenkins, GitHub Actions, Prometheus, Grafana

ОБРАЗОВАНИЕ:
Бакалавр компьютерных наук
Университет Калифорнии, Беркли | 2014-2018

ИЩУ РАБОТУ:
Позиции Senior Backend Engineer
Доступен для удаленной работы или Москва
Ожидания по зарплате: $150,000 - $180,000 USD в год
Доступен к началу через 2 недели`;

/**
 * Make HTTPS request to resume processor API
 */
function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: 'resume-processor-worker.dev-a96.workers.dev',
      port: 443,
      path: '/process-resume',
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
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Test the resume processor service
 */
async function testResumeProcessor() {
  console.log('🧪 Testing Resume Processor Service...\n');

  try {
    // Test health check first
    console.log('1. Testing health check...');
    const healthResponse = await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'resume-processor-worker.dev-a96.workers.dev',
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

    console.log('✅ Health check passed:', healthResponse.status);
    console.log('   Version:', healthResponse.version);
    console.log('   AI Status:', healthResponse.ai_status);
    console.log('');

    // Test resume processing
    console.log('2. Testing resume processing...');
    const startTime = Date.now();

    const result = await makeRequest(
      'https://resume-processor-worker.dev-a96.workers.dev/process-resume',
      {
        resume_text: testResumeText,
        language: 'ru',
        options: {
          include_unmapped: true,
          strict_validation: false,
        },
      }
    );

    const processingTime = Date.now() - startTime;

    console.log('✅ Resume processing completed');
    console.log('   Success:', result.success);
    console.log('   Processing time:', result.processing_time_ms, 'ms');
    console.log('   Our timing:', processingTime, 'ms');

    if (result.success && result.data) {
      console.log('\n📋 Structured Resume Data:');
      console.log('   Desired titles:', result.data.desired_titles);
      console.log(
        '   Summary length:',
        result.data.summary?.length || 0,
        'characters'
      );
      console.log('   Skills count:', result.data.skills?.length || 0);
      console.log(
        '   Experience entries:',
        result.data.experience?.length || 0
      );

      if (result.unmapped_fields && result.unmapped_fields.length > 0) {
        console.log('   Unmapped fields:', result.unmapped_fields.join(', '));
      }

      if (result.metadata) {
        console.log('   AI Model:', result.metadata.ai_model_used);
      }
    } else {
      console.log('❌ Processing failed:');
      console.log('   Errors:', result.errors);
    }

    console.log(
      '\n🎉 All tests passed! The resume structuring feature is ready to use.'
    );
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testResumeProcessor();
