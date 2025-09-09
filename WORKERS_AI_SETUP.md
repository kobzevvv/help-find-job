# Workers AI Setup Guide

## Current Status
✅ **Code Implementation**: Complete with fallback support  
⚠️ **Account Setup**: Workers AI needs to be enabled

## Quick Setup Steps

### 1. Enable Workers AI in Cloudflare Dashboard
1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **AI**
3. Look for **Workers AI** section
4. Click **"Enable Workers AI"** or **"Get Started"**

### 2. Account Requirements
- **Free Tier**: Limited to 10,000 requests/month (if available)
- **Paid Tier**: ~$0.01 per 1,000 requests
- **Document Processing**: Included in AI requests

### 3. Test Workers AI
```bash
# Check if Workers AI is available
npx wrangler ai models

# Should show available models like:
# @cf/meta/llama-3.1-8b-instruct
# @cf/microsoft/resnet-50
```

### 4. Deploy and Test
```bash
# Deploy to staging
npm run deploy:staging

# Test with PDF document via Telegram
```

## Current Implementation

### PDF Processing Flow
1. **Primary**: Cloudflare Workers AI (`env.AI.toMarkdown`)
2. **Fallback**: JavaScript `pdf-parse` library
3. **User Guidance**: Clear error messages with setup instructions

### Error Handling
- Detects if Workers AI is available
- Provides helpful setup guidance
- Falls back to JavaScript parsing for PDFs
- Clear instructions for manual text input

## Cost Estimation
- **PDF Processing**: ~1-5 requests per document
- **Monthly Cost**: $0.01-0.05 for 100 PDFs
- **Much cheaper than OpenAI**: ~90% cost reduction

## Next Steps
1. Enable Workers AI in your Cloudflare account
2. Test PDF processing in development
3. Deploy to staging for full testing
4. Monitor usage and costs in dashboard
