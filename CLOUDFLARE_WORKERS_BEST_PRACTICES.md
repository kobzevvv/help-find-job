# Cloudflare Workers Best Practices Guide

## Goal

Focused guide covering the **real problems we solved** in our production Telegram bot project, with practical solutions for common Cloudflare Workers issues.

## Why These Practices Matter

Based on our production experience with a Telegram bot handling PDF processing, AI analysis, and multi-environment deployments:

- **Dependency Hell**: Workers runtime has strict limitations that break common Node.js libraries
- **AI Integration**: Cloudflare AI responses have inconsistent formats that need handling
- **Deployment Issues**: GitHub Actions and Cloudflare deployment have subtle gotchas
- **Environment Management**: Multi-stage deployments require careful secret and configuration management
- **Testing Complexity**: Workers need special testing approaches

## What This Guide Covers

### 1. **Dependency Compatibility Issues**

### 2. **Cloudflare AI Response Format Problems**

### 3. **GitHub Actions Deployment Failures**

### 4. **Environment & Secret Management**

### 5. **Service Architecture for Workers**

---

## 1. Dependency Compatibility Issues

### Problem: PDF Processing Libraries Don't Work

**What happened:** We tried using `pdf-parse` for PDF processing but it failed in Workers runtime.

```bash
❌ Error: Module not found: 'fs'
❌ Error: Module not found: 'zlib'
❌ Error: Module not found: 'crypto'
```

**Root cause:** Cloudflare Workers doesn't support Node.js built-in modules that many libraries depend on.

### Solution: Use Cloudflare AI Instead

```typescript
// ❌ DON'T: Node.js libraries that break in Workers
import * as pdfParse from 'pdf-parse';

// ✅ DO: Use Cloudflare AI binding
export class DocumentService {
  constructor(private ai?: Ai) {}

  async processPDF(fileBuffer: ArrayBuffer): Promise<string> {
    if (!this.ai) {
      throw new Error('AI binding not available');
    }

    try {
      // Use Cloudflare Workers AI for PDF processing
      const result = await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [{ role: 'user', content: 'Extract text from this PDF' }],
        file: fileBuffer,
      });

      // Handle inconsistent response format (see next section)
      return result.response || result.data || result.markdown || '';
    } catch (error) {
      console.error('PDF processing failed:', error);
      throw new Error('Failed to process PDF document');
    }
  }
}
```

### Key Lessons:

- **Always check compatibility** before adding dependencies
- **Use Workers-native features** when possible (AI, KV, D1)
- **Have fallback strategies** for critical functionality
- **Cost optimization**: Cloudflare AI is much cheaper than OpenAI for document processing

---

## 2. Cloudflare AI Response Format Problems

### Problem: Inconsistent AI Response Structure

**What happened:** Cloudflare AI sometimes returns content in different properties, causing our code to break.

```typescript
// ❌ This breaks when AI changes response format
const text = result.markdown; // Sometimes undefined!
```

**Error we got:**

```bash
❌ TypeError: Cannot read property 'markdown' of undefined
❌ AI returns content in 'data' property, not 'markdown'
```

### Solution: Handle Multiple Response Formats

```typescript
export class CloudflareAIService {
  async extractText(file: ArrayBuffer): Promise<string> {
    const result = await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: 'Extract text' }],
      file,
    });

    // ✅ Handle all possible response formats
    const extractedText =
      result?.response || // Format 1
      result?.data || // Format 2
      result?.markdown || // Format 3
      result?.results?.[0]?.data || // Format 4
      result?.results?.[0]?.markdown || // Format 5
      '';

    if (!extractedText) {
      throw new Error('No text content found in AI response');
    }

    return extractedText;
  }
}
```

### Key Lessons:

- **Cloudflare AI response format changes** between updates
- **Always handle multiple response properties** defensively
- **Log the full response** during development to understand structure
- **Have error handling** for when AI fails completely

---

## 3. GitHub Actions Deployment Failures

### Problem: Deprecated Actions Breaking CI/CD

**What happened:** Our deployments started failing with cryptic errors.

```bash
❌ This request has been automatically failed because it uses a deprecated version of actions/upload-artifact: v3
❌ Input required and not supplied: key
❌ GitHub deployment creation failed
```

### Solution: Update Actions and Fix Cache Keys

```yaml
# ❌ OLD (broken)
- uses: actions/upload-artifact@v3
  with:
    cache-key: ${{ steps.cache-build.outputs.cache-primary-key }} # Wrong reference!

# ✅ NEW (working)
- uses: actions/upload-artifact@v4
  with:
    cache-key: ${{ steps.build-cache-key.outputs.cache-key }} # Correct reference
```

### Problem: Manual Production Deployments

**What we learned:** Auto-deploying to production on every push is dangerous.

**Solution:** Manual approval workflow

```yaml
# .github/workflows/deploy-production.yml
name: Deploy Production
on:
  workflow_dispatch: # Manual trigger only
    inputs:
      confirm:
        description: 'Type "deploy" to confirm production deployment'
        required: true

jobs:
  deploy:
    if: github.event.inputs.confirm == 'deploy'
    environment: production # Requires manual approval
```

### Key Lessons:

- **Keep GitHub Actions updated** - v3 actions are deprecated
- **Use manual production deployments** for safety
- **Test in staging first** - always
- **Have rollback plans** ready

---

## 4. Environment & Secret Management

### Problem: Secrets Not Working Across Environments

**What happened:** Bot worked in development but failed in staging/production.

```bash
❌ Error: TELEGRAM_BOT_TOKEN is undefined
❌ Error: Webhook secret validation failed
❌ Error: OpenAI API key not found
```

### Solution: Proper Secret Management Strategy

**Step 1: Use Environment-Specific Secrets**

```bash
# Set secrets for each environment
wrangler secret put TELEGRAM_BOT_TOKEN_STAGING --env staging
wrangler secret put TELEGRAM_BOT_TOKEN_PRODUCTION --env production
wrangler secret put WEBHOOK_SECRET_PRODUCTION --env production
```

**Step 2: Environment Detection**

```typescript
export interface Env {
  // Environment detection
  ENVIRONMENT?: string;

  // Telegram tokens (environment-specific)
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_BOT_TOKEN_STAGING?: string;
  TELEGRAM_BOT_TOKEN_PRODUCTION?: string;

  // Security
  WEBHOOK_SECRET?: string;
  ADMIN_PASSWORD?: string;
}

function getBotToken(env: Env): string {
  const environment = env.ENVIRONMENT || 'development';

  switch (environment) {
    case 'staging':
      return env.TELEGRAM_BOT_TOKEN_STAGING || env.TELEGRAM_BOT_TOKEN || '';
    case 'production':
      return env.TELEGRAM_BOT_TOKEN_PRODUCTION || env.TELEGRAM_BOT_TOKEN || '';
    default:
      return env.TELEGRAM_BOT_TOKEN || '';
  }
}
```

**Step 3: Validate Configuration**

```typescript
function validateEnvironment(env: Env): void {
  const required = ['SESSIONS']; // KV namespace always required
  const missing = required.filter((key) => !env[key as keyof Env]);

  if (missing.length > 0) {
    throw new Error(`Missing required bindings: ${missing.join(', ')}`);
  }

  // Warn about missing optional secrets
  const botToken = getBotToken(env);
  if (!botToken) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN not configured - bot will not work');
  }
}
```

### Key Lessons:

- **Use environment-specific secret names**
- **Have fallback chains** for secret resolution
- **Validate configuration at startup**
- **Make secrets optional in development** but required in production

---

## 5. Service Architecture for Workers

### Problem: Tight Coupling and Hard Testing

**What happened:** Our initial code was monolithic and impossible to test.

```typescript
// ❌ Bad: Everything in one place, hard to test
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const kv = env.SESSIONS;
    const db = env.LOGS_DB;
    const ai = env.AI;

    // 500 lines of mixed logic here...
  },
};
```

### Solution: Clean Service Architecture

**Create a service container for dependency injection:**

```typescript
// container/service-container.ts
export async function createServiceContainer(
  env: Env
): Promise<ServiceContainer> {
  const container = new ServiceContainer(env);

  // Register services with dependencies
  container.register('logging', {
    dependencies: [],
    async create() {
      const loggingService = new LoggingService(env.LOGS_DB);
      await loggingService.initialize();
      return loggingService;
    },
  });

  container.register('session', {
    dependencies: [],
    async create() {
      return new SessionService(env.SESSIONS, 86400); // 24h TTL
    },
  });

  container.register('telegram', {
    dependencies: [],
    async create() {
      const botToken = getBotToken(env);
      return new TelegramService(botToken);
    },
  });

  return container;
}
```

**Clean entry point:**

```typescript
// index.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      validateEnvironment(env);

      const url = new URL(request.url);

      if (url.pathname === '/webhook') {
        const services = await createServiceContainer(env);
        const webhookHandler = await services.get<WebhookHandler>('webhook');
        return await webhookHandler.handleWebhook(request);
      }

      if (url.pathname === '/health') {
        return new Response(
          JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: env.ENVIRONMENT || 'development',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
```

### Key Lessons:

- **Separate concerns** - handlers, services, types
- **Use dependency injection** for testability
- **Validate environment at startup**
- **Keep the main fetch handler clean**

---

## Quick Reference: Common Issues

### 1. **"Module not found" errors**

```bash
❌ Error: Module not found: 'fs'
```

**Solution:** Remove Node.js dependencies, use Workers APIs instead.

### 2. **KV namespace binding issues**

```bash
❌ Error: env.SESSIONS is undefined
```

**Solution:** Check `wrangler.toml` has correct KV namespace IDs:

```toml
[[env.staging.kv_namespaces]]
binding = "SESSIONS"
id = "your-kv-namespace-id"
```

### 3. **AI response format changes**

```bash
❌ TypeError: result.markdown is undefined
```

**Solution:** Handle multiple response properties:

```typescript
const text = result?.response || result?.data || result?.markdown || '';
```

### 4. **GitHub Actions failures**

```bash
❌ uses a deprecated version of actions/upload-artifact: v3
```

**Solution:** Update to v4:

```yaml
- uses: actions/upload-artifact@v4
```

### 5. **Deployment secret issues**

```bash
❌ TELEGRAM_BOT_TOKEN is undefined
```

**Solution:** Set environment-specific secrets:

```bash
wrangler secret put TELEGRAM_BOT_TOKEN_STAGING --env staging
```

### 6. **Webhook security disabled**

```bash
⚠️ Webhook secret validation disabled
```

**Solution:** Re-enable webhook validation:

```typescript
if (this.webhookSecret) {
  const secretHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (secretHeader !== this.webhookSecret) {
    return new Response('Unauthorized', { status: 401 });
  }
}
```

---

## Testing Strategy

### Problem: Workers Need Special Testing

**What we learned:** Regular Node.js testing doesn't work with Workers.

**Solution:** Use Miniflare for realistic testing:

```javascript
// jest.config.integration.js
module.exports = {
  testEnvironment: 'miniflare', // Not 'node'!
  setupFilesAfterEnv: ['<rootDir>/tests/setup/integration.setup.js'],
};
```

**Integration test example:**

```typescript
import { unstable_dev } from 'wrangler';

describe('Webhook Integration', () => {
  let worker: any;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  it('should handle Telegram webhook', async () => {
    const response = await worker.fetch('/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        update_id: 123,
        message: { text: '/start', from: { id: 123 }, chat: { id: 123 } },
      }),
    });

    expect(response.status).toBe(200);
  });
});
```

---

## Deployment Best Practices

### Safe Deployment Script

Based on our production experience:

```bash
#!/bin/bash
set -e

ENVIRONMENT=${1:-staging}

echo "🚀 Safe deployment to $ENVIRONMENT..."

# 1. Pre-deployment validation
npm run type-check
npm run test
npm run build

# 2. Deploy with confirmation for production
if [ "$ENVIRONMENT" = "production" ]; then
  read -p "Deploy to PRODUCTION? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    echo "❌ Cancelled"
    exit 1
  fi
fi

npm run deploy:${ENVIRONMENT}

# 3. Post-deployment validation
sleep 5
curl -f "https://your-worker-${ENVIRONMENT}.workers.dev/health"

echo "✅ Deployment successful!"
```

### Key Deployment Lessons:

- **Always test before deploying**
- **Use staging environment first**
- **Manual approval for production**
- **Health checks after deployment**
- **Have rollback plans ready**

---

## Summary

This guide covers the **real problems** we encountered building a production Telegram bot on Cloudflare Workers:

✅ **Dependency issues** - Use Workers-native features instead of Node.js libraries  
✅ **AI integration** - Handle inconsistent response formats defensively  
✅ **Deployment failures** - Keep GitHub Actions updated, use manual production approval  
✅ **Environment management** - Environment-specific secrets with fallback chains  
✅ **Service architecture** - Dependency injection for clean, testable code

**Key insight:** Cloudflare Workers is powerful but has specific limitations. Work with the platform, not against it, and you'll build fast, reliable, cost-effective applications.

**Next steps:** Use this as a checklist when starting your own Workers project - you'll avoid the painful debugging we went through!
