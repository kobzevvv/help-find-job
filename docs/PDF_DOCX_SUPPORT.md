# PDF and Microsoft Word Support

## Overview

The system now supports processing PDF and Microsoft Word (.docx) documents for both resumes and job postings. This functionality uses **Cloudflare Workers AI** for document-to-text conversion.

## Supported File Types

✅ **PDF Files** (.pdf)
✅ **Microsoft Word** (.docx) 
✅ **Plain Text** (.txt) - existing functionality

## How It Works

1. **File Upload**: User uploads PDF or DOCX file via Telegram
2. **Cloudflare AI Conversion**: Document is converted to Markdown using `AI.toMarkdown()`
3. **Text Extraction**: Markdown is cleaned and converted to plain text
4. **Analysis**: Extracted text flows through existing AI analysis pipeline

## Technical Implementation

### Cloudflare Workers AI Integration

```typescript
// DocumentService now uses Cloudflare Workers AI
const blob = new Blob([content], { type: mimeType });
const results = await this.ai.toMarkdown([{
  name: 'document.pdf',
  blob
}]);
const text = this.markdownToText(results[0].markdown);
```

### Error Handling

- **AI Service Unavailable**: Graceful error with user-friendly message
- **Conversion Failed**: Fallback error handling with logging
- **File Size Limits**: Existing size limits still apply (10MB default)

## Configuration

### Environment Setup

All environments now have AI binding configured:
- Development: `[env.development.ai] binding = "AI"`
- Staging: `[env.staging.ai] binding = "AI"`
- Production: `[env.production.ai] binding = "AI"`

### Dependencies

No new external dependencies required - uses Cloudflare's native AI capabilities.

## Testing

### Manual Testing

1. Upload a PDF resume via Telegram bot
2. Upload a DOCX job posting
3. Verify text extraction works correctly
4. Check that analysis results are reasonable

### Example Messages

**Success:**
```
✅ Документ обработан успешно
📄 Извлечено 342 слова из resume.pdf
```

**Error:**
```
❌ Ошибка при обработке PDF файла
Попробуйте еще раз или отправьте текстом
```

## Benefits

- **Cost Efficient**: Uses Cloudflare infrastructure (cheaper than OpenAI)
- **Native Integration**: No external API dependencies
- **Reliable**: Built-in fallback error handling
- **Fast**: Processes documents directly in Workers environment

## Limitations

- Requires Cloudflare Workers AI to be available
- Quality depends on document structure and formatting
- Very complex layouts may not convert perfectly

## Implementation Details

### Files Modified

1. **wrangler.toml**: Added AI binding to all environments
2. **src/index.ts**: Added AI interface to Env type
3. **src/services/document.ts**: Implemented PDF/DOCX conversion methods
4. **src/container/service-container.ts**: Updated DocumentService instantiation

### Code Changes Summary

- Added `ai` parameter to DocumentService constructor
- Replaced PDF/DOCX placeholder methods with Cloudflare AI implementation
- Added `markdownToText()` helper for clean text extraction
- Added comprehensive error handling

## Deployment Instructions

1. **Build the project**: `npm run build`
2. **Deploy to staging**: `npm run deploy:staging`
3. **Test with sample documents**
4. **Deploy to production**: `npm run deploy:prod`

## Future Enhancements

- Add support for .doc (legacy Word format)
- Implement RTF support
- Add document quality validation
- Structured data extraction from documents
- Fallback to alternative document parsing libraries

## Troubleshooting

### Common Issues

**Issue**: AI service unavailable error
**Solution**: Ensure Cloudflare Workers AI is enabled for your account

**Issue**: Document conversion fails
**Solution**: Check document format and size (max 10MB)

**Issue**: Poor text quality
**Solution**: Try with a simpler document format or higher quality PDF
