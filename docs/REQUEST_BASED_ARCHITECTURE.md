# Request-Based Document Tracking Architecture (Iteration 2)

## Overview

This document describes the **Request-Based Document Tracking Architecture** implemented in Iteration 2, which provides a robust foundation for future features like structured data extraction and beautiful PDF generation.

## Key Benefits

- ✅ **Clean Data Pipeline**: Documents are associated with user requests rather than sessions
- ✅ **Multiple Documents**: Support for multiple documents per request (future-ready)
- ✅ **Structured Storage**: Organized document references with metadata
- ✅ **Scalable Architecture**: Ready for advanced features like structured data extraction
- ✅ **Backward Compatibility**: Existing session-based flow still works

## Architecture Components

### 1. Core Data Models

#### UserRequest
```typescript
interface UserRequest {
  id: string; // "request-123456"
  userId: number;
  chatId: number;
  createdAt: string;
  status: 'collecting' | 'processing' | 'completed' | 'error';
  documentIds: string[]; // References to DocumentReference.id
  analysis?: EnhancedAnalysis;
  processedAt?: string;
  lastActivity: string;
  language?: string | undefined;
}
```

#### DocumentReference  
```typescript
interface DocumentReference {
  id: string; // "doc-789012"
  requestId: string; // Links back to UserRequest.id
  type: 'resume' | 'job_post';
  
  // Original document info
  originalName?: string | undefined;
  originalMimeType?: string | undefined;
  originalSize?: number | undefined;
  
  // Processed text
  text: string;
  wordCount: number;
  
  // Processing metadata
  conversionMethod: 'cloudflare-ai' | 'text-input' | 'fallback';
  processedAt: string;
  
  // Future: structured data extraction (Iteration 3)
  structuredData?: ResumeStructuredData | JobPostStructuredData;
}
```

### 2. Service Architecture

#### DocumentProcessingPipeline
- **Purpose**: Handles document-to-text conversion
- **Features**:
  - Cloudflare Workers AI integration for PDF/DOCX
  - Fallback to text decoding
  - Document validation and metadata extraction
  - Creates DocumentReference objects

#### CloudflareRequestStorage
- **Purpose**: Manages storage of requests and documents in Cloudflare KV
- **Features**:
  - Request CRUD operations
  - Document storage and retrieval
  - User request indexing
  - Cleanup of expired requests
  - Health checks and statistics

#### UserRequestManager
- **Purpose**: Orchestrates the complete request lifecycle
- **Features**:
  - Request creation and management
  - Document addition and validation
  - Automatic analysis triggering
  - Request completion handling
  - Statistics and health monitoring

### 3. Integration Points

#### ConversationHandler Updates
- **Hybrid Approach**: Uses both request-based and session-based flows
- **Backward Compatibility**: Existing features continue to work
- **Enhanced User Experience**: Shows request IDs and document metadata
- **Automatic Request Management**: Creates requests on demand

#### Service Container
- **New Services**: Registered document pipeline, storage, and request manager
- **Dependency Injection**: Clean dependency management
- **Health Checks**: All services support health monitoring

## Request Flow

### 1. User Starts Process
```
User: /resume_and_job_post_match
Bot: Creates UserRequest with ID "request-123456"
     Updates conversation state to 'waiting_resume'
```

### 2. Document Upload  
```
User: [uploads resume.pdf]
→ DocumentProcessingPipeline.processDocument()
→ Cloudflare AI converts PDF to text
→ Creates DocumentReference with metadata
→ Links to UserRequest
→ Updates conversation state
```

### 3. Complete Analysis
```
User: [uploads job_post.docx]  
→ Second document processed
→ UserRequestManager detects completion
→ Triggers enhanced AI analysis
→ Stores results in UserRequest
→ Updates status to 'completed'
```

### 4. Request Cleanup
```
Background process cleans up expired requests (24h default)
Maintains system performance and storage efficiency
```

## Storage Pattern

### KV Storage Organization
```
# Requests
request:request-123456 → UserRequest JSON

# Documents  
document:doc-789012 → DocumentReference JSON

# User Index
user:12345:active → "request-123456"
```

### Document Relationships
```
UserRequest
├── documentIds: ["doc-789012", "doc-789013"]
├── analysis: EnhancedAnalysis
└── status: 'completed'

DocumentReference (doc-789012)
├── requestId: "request-123456"  
├── type: "resume"
├── text: "John Doe Product Manager..."
├── conversionMethod: "cloudflare-ai"
└── originalName: "resume.pdf"
```

## User Experience Improvements

### Enhanced Messages
**Before:**
```
✅ Resume file received
```

**After:**  
```
✅ Резюме загружено и обработано
📄 Извлечено 342 слова из resume.pdf
🆔 Документ: doc-78901
```

### Request Tracking
- Users see request IDs for reference
- Clear progress indicators
- Better error messages with context
- Document metadata display

## Future Readiness

### Iteration 3: Structured Data Extraction
```typescript
// Ready for implementation
structuredData?: ResumeStructuredData | JobPostStructuredData;

interface ResumeStructuredData {
  personalInfo?: PersonalInfo;
  experience?: JobExperience[];
  education?: EducationRecord[];
  skills?: string[];
  lastJob?: JobExperience;
  previousJob?: JobExperience;
}
```

### Iteration 4: Beautiful PDF Generation
- Request-based storage enables multiple document versions
- Structured data ready for template rendering  
- Document history and versioning support

### Iteration 5: Advanced Analytics
- Request completion rates
- Document processing performance  
- User behavior analysis
- A/B testing capabilities

## Performance Considerations

### Storage Efficiency
- **Request Cleanup**: Automatic cleanup of old requests (24h)
- **KV Optimization**: Structured keys for efficient queries
- **Document Indexing**: Fast lookups by user and request

### Processing Performance
- **Parallel Processing**: Document conversion and storage
- **Health Monitoring**: All services support health checks
- **Error Recovery**: Graceful fallbacks and error handling

### Scalability
- **Stateless Design**: All services are stateless
- **KV Storage**: Scales with Cloudflare infrastructure
- **Dependency Injection**: Easy service replacement/updates

## Deployment

### Build and Test
```bash
npm run build        # ✅ All TypeScript errors resolved
npm run test         # Run test suite
npm run deploy:staging  # Deploy to staging
```

### Environment Requirements  
- **Cloudflare Workers AI**: Document conversion
- **KV Namespaces**: Storage for requests and documents  
- **Existing Services**: Telegram, OpenAI, logging (unchanged)

### Migration
- **Zero Downtime**: New architecture runs alongside existing
- **Backward Compatible**: Existing users unaffected
- **Gradual Rollout**: New features available immediately

## Monitoring and Maintenance

### Health Checks
```typescript
// All services implement health checks
await requestManager.healthCheck()
await documentPipeline.healthCheck()  
await storage.healthCheck()
```

### Statistics
```typescript
// Request and document statistics
const stats = await requestManager.getStatistics()
// Returns: { recentRequests: 5, avgProcessingTime: 2.3 }
```

### Cleanup
```typescript
// Automatic cleanup of expired requests
const cleaned = await requestManager.cleanupOldRequests(24)
// Returns: number of requests cleaned
```

## Implementation Summary

### Files Added
- `src/types/session.ts` - Enhanced with request-based types
- `src/services/document-pipeline.ts` - Document processing pipeline
- `src/services/request-storage.ts` - Cloudflare KV storage implementation
- `src/services/request-manager.ts` - Request lifecycle management

### Files Modified
- `src/handlers/conversation.ts` - Hybrid request/session approach
- `src/container/service-container.ts` - New service registrations
- `src/types/session.ts` - New data models added

### Architecture Benefits
- ✅ **Clean Separation**: Document processing isolated
- ✅ **Future Ready**: Structured for advanced features
- ✅ **Cost Efficient**: Leverages Cloudflare infrastructure  
- ✅ **Maintainable**: Well-organized codebase
- ✅ **Testable**: Health checks and monitoring built-in

The request-based architecture provides a solid foundation for future iterations while maintaining full backward compatibility and improving the user experience with better document tracking and metadata.
