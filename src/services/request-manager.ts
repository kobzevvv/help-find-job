/**
 * User Request Manager
 *
 * Orchestrates the complete lifecycle of user requests for document matching.
 * Coordinates between document pipeline, storage, and AI analysis.
 */

import {
  UserRequest,
  DocumentReference,
  EnhancedAnalysis,
} from '../types/session';
import { DocumentProcessingPipeline } from './document-pipeline';
import { RequestStorage } from './request-storage';
import { EnhancedAIService } from './enhanced-ai';
import { LoggingService } from './logging';

export interface RequestAnalysisResult {
  request: UserRequest;
  resume: DocumentReference;
  jobPost: DocumentReference;
  analysis: EnhancedAnalysis;
}

/**
 * Manages user requests and document processing workflow
 */
export class UserRequestManager {
  private pipeline: DocumentProcessingPipeline;
  private storage: RequestStorage;
  private aiService: EnhancedAIService;
  private logging: LoggingService;

  constructor(
    pipeline: DocumentProcessingPipeline,
    storage: RequestStorage,
    aiService: EnhancedAIService,
    logging: LoggingService
  ) {
    this.pipeline = pipeline;
    this.storage = storage;
    this.aiService = aiService;
    this.logging = logging;
  }

  // =============================================================================
  // Request Lifecycle Management
  // =============================================================================

  /**
   * Create a new user request
   */
  async createRequest(
    userId: number,
    chatId: number,
    language?: string
  ): Promise<UserRequest> {
    // Check if user has active request
    const existingRequest = await this.storage.getUserActiveRequest(userId);
    if (existingRequest) {
      console.log(
        `User ${userId} already has active request: ${existingRequest.id}`
      );
      return existingRequest;
    }

    const request: UserRequest = {
      id: this.generateRequestId(),
      userId,
      chatId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      status: 'collecting',
      documentIds: [],
      language,
    };

    await this.storage.storeRequest(request);

    await this.logging.log(
      'INFO',
      'REQUEST_CREATED',
      `New request created for user ${userId}`,
      { requestId: request.id, userId, chatId }
    );

    console.log(`✅ Created request: ${request.id} for user ${userId}`);
    return request;
  }

  /**
   * Add document to request
   */
  async addDocument(
    requestId: string,
    documentType: 'resume' | 'job_post',
    content: ArrayBuffer,
    fileName?: string,
    mimeType?: string
  ): Promise<DocumentReference> {
    // Verify request exists and is in collecting state
    const request = await this.storage.getRequest(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    if (request.status !== 'collecting') {
      throw new Error(
        `Request ${requestId} is not accepting documents (status: ${request.status})`
      );
    }

    // Check if document type already exists
    const existingDocs = await this.pipeline.getRequestDocuments(requestId);
    const hasType = existingDocs.some((doc) => doc.type === documentType);

    if (hasType) {
      throw new Error(`${documentType} already provided for this request`);
    }

    // Process document through pipeline
    const document = await this.pipeline.processDocument(
      requestId,
      documentType,
      content,
      fileName,
      mimeType
    );

    await this.logging.log(
      'INFO',
      'DOCUMENT_ADDED',
      `Document added to request: ${documentType}`,
      {
        requestId,
        documentId: document.id,
        documentType,
        wordCount: document.wordCount,
        conversionMethod: document.conversionMethod,
      }
    );

    // Check if request is ready for analysis
    await this.checkRequestCompletion(requestId);

    return document;
  }

  /**
   * Get request details with documents
   */
  async getRequestDetails(requestId: string): Promise<{
    request: UserRequest;
    documents: DocumentReference[];
  } | null> {
    const request = await this.storage.getRequest(requestId);
    if (!request) return null;

    const documents = await this.pipeline.getRequestDocuments(requestId);

    return { request, documents };
  }

  /**
   * Get user's active request
   */
  async getUserActiveRequest(userId: number): Promise<UserRequest | null> {
    return await this.storage.getUserActiveRequest(userId);
  }

  /**
   * Cancel/delete a request
   */
  async cancelRequest(requestId: string): Promise<void> {
    const request = await this.storage.getRequest(requestId);
    if (!request) return;

    await this.storage.deleteRequest(requestId);

    await this.logging.log(
      'INFO',
      'REQUEST_CANCELLED',
      `Request cancelled by user`,
      { requestId, userId: request.userId }
    );

    console.log(`🗑️ Cancelled request: ${requestId}`);
  }

  // =============================================================================
  // Request Completion and Analysis
  // =============================================================================

  /**
   * Check if request has all required documents and trigger analysis
   */
  private async checkRequestCompletion(requestId: string): Promise<void> {
    const documents = await this.pipeline.getRequestDocuments(requestId);

    const hasResume = documents.some((doc) => doc.type === 'resume');
    const hasJobPost = documents.some((doc) => doc.type === 'job_post');

    if (hasResume && hasJobPost) {
      await this.storage.updateRequestStatus(requestId, 'processing');

      // Trigger analysis in background
      this.processAnalysis(requestId).catch((error) => {
        console.error(`Analysis failed for request ${requestId}:`, error);
        this.storage.updateRequestStatus(requestId, 'error');
      });
    }
  }

  /**
   * Process AI analysis for completed request
   */
  private async processAnalysis(
    requestId: string
  ): Promise<RequestAnalysisResult> {
    console.log(`🔄 Starting analysis for request: ${requestId}`);

    const documents = await this.pipeline.getRequestDocuments(requestId);
    const resume = documents.find((doc) => doc.type === 'resume');
    const jobPost = documents.find((doc) => doc.type === 'job_post');

    if (!resume || !jobPost) {
      throw new Error(`Missing documents for analysis: requestId=${requestId}`);
    }

    await this.logging.log(
      'INFO',
      'ANALYSIS_STARTED',
      'Starting enhanced analysis',
      {
        requestId,
        resumeWords: resume.wordCount,
        jobPostWords: jobPost.wordCount,
      }
    );

    try {
      // Perform enhanced analysis
      const analysis = await this.aiService.analyzeResumeJobMatch(
        {
          text: resume.text,
          wordCount: resume.wordCount,
          processedAt: resume.processedAt,
        },
        {
          text: jobPost.text,
          wordCount: jobPost.wordCount,
          processedAt: jobPost.processedAt,
        }
      );

      if (!analysis) {
        throw new Error('Analysis returned null result');
      }

      // Update request with results
      const request = await this.storage.getRequest(requestId);
      if (request) {
        request.analysis = analysis;
        request.status = 'completed';
        request.processedAt = new Date().toISOString();
        request.lastActivity = new Date().toISOString();

        await this.storage.storeRequest(request);
      }

      await this.logging.log(
        'INFO',
        'ANALYSIS_COMPLETED',
        'Enhanced analysis completed successfully',
        {
          requestId,
          overallScore: analysis.overallScore,
          processingTime:
            Date.now() - new Date(request?.createdAt || 0).getTime(),
        }
      );

      console.log(
        `✅ Analysis completed for request: ${requestId} (score: ${analysis.overallScore})`
      );

      return {
        request: request!,
        resume,
        jobPost,
        analysis,
      };
    } catch (error) {
      await this.logging.logError(
        'ANALYSIS_FAILED',
        `Analysis failed for request ${requestId}`,
        error instanceof Error ? error : new Error(String(error))
      );

      throw error;
    }
  }

  /**
   * Get analysis result if available
   */
  async getAnalysisResult(
    requestId: string
  ): Promise<RequestAnalysisResult | null> {
    const request = await this.storage.getRequest(requestId);
    if (!request || !request.analysis) {
      return null;
    }

    const documents = await this.pipeline.getRequestDocuments(requestId);
    const resume = documents.find((doc) => doc.type === 'resume');
    const jobPost = documents.find((doc) => doc.type === 'job_post');

    if (!resume || !jobPost) {
      console.error(`Missing documents for completed request ${requestId}`);
      return null;
    }

    return {
      request,
      resume,
      jobPost,
      analysis: request.analysis,
    };
  }

  // =============================================================================
  // Maintenance and Utilities
  // =============================================================================

  /**
   * Clean up old requests
   */
  async cleanupOldRequests(olderThanHours: number = 24): Promise<number> {
    try {
      const cleanedCount =
        await this.storage.cleanupExpiredRequests(olderThanHours);

      if (cleanedCount > 0) {
        await this.logging.log(
          'INFO',
          'CLEANUP_COMPLETED',
          `Cleaned up ${cleanedCount} expired requests`,
          { cleanedCount, olderThanHours }
        );

        console.log(`🧹 Cleaned up ${cleanedCount} expired requests`);
      }

      return cleanedCount;
    } catch (error) {
      await this.logging.logError(
        'CLEANUP_FAILED',
        'Failed to clean up expired requests',
        error instanceof Error ? error : new Error(String(error))
      );

      return 0;
    }
  }

  /**
   * Get request manager statistics
   */
  async getStatistics(): Promise<{
    recentRequests: number;
    avgProcessingTime: number;
  }> {
    try {
      // Get storage statistics if available
      const storageStats =
        'getStatistics' in this.storage && this.storage.getStatistics
          ? await this.storage.getStatistics()
          : {
              totalRequests: 0,
              totalDocuments: 0,
              activeRequests: 0,
              completedRequests: 0,
            };

      // TODO: Calculate more detailed statistics
      // This would require tracking request processing times

      return {
        recentRequests: storageStats.activeRequests || 0,
        avgProcessingTime: 0, // Placeholder
      };
    } catch (error) {
      console.error('Error getting request manager statistics:', error);
      return {
        recentRequests: 0,
        avgProcessingTime: 0,
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    message: string;
    details?: Record<string, unknown>;
  }> {
    try {
      // Check pipeline health
      const pipelineHealth = await this.pipeline.healthCheck();
      if (pipelineHealth.status !== 'healthy') {
        return {
          status: 'unhealthy',
          message: `Pipeline unhealthy: ${pipelineHealth.message}`,
          details: { pipeline: pipelineHealth },
        };
      }

      // Check storage health if method exists
      let storageHealth = {
        status: 'healthy' as const,
        message: 'Storage check skipped',
      };
      if ('healthCheck' in this.storage && this.storage.healthCheck) {
        storageHealth = await this.storage.healthCheck();
        if (storageHealth.status !== 'healthy') {
          return {
            status: 'unhealthy',
            message: `Storage unhealthy: ${storageHealth.message}`,
            details: { storage: storageHealth },
          };
        }
      }

      return {
        status: 'healthy',
        message: 'Request manager operational',
        details: {
          pipeline: pipelineHealth,
          storage: storageHealth,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Request manager health check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `request-${timestamp}-${random}`;
  }
}
