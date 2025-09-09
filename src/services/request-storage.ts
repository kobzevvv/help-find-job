/**
 * Request-Based Storage Service
 * 
 * Handles storage and retrieval of UserRequest and DocumentReference objects
 * using Cloudflare KV for the request-based architecture.
 */

import { UserRequest, DocumentReference } from '../types/session';
import { DocumentStorage } from './document-pipeline';

export interface RequestStorage {
  storeRequest(request: UserRequest): Promise<void>;
  getRequest(requestId: string): Promise<UserRequest | null>;
  updateRequestStatus(requestId: string, status: UserRequest['status']): Promise<void>;
  getUserActiveRequest(userId: number): Promise<UserRequest | null>;
  deleteRequest(requestId: string): Promise<void>;
  
  // Request cleanup
  getExpiredRequests(olderThanHours: number): Promise<string[]>;
  cleanupExpiredRequests(olderThanHours: number): Promise<number>;
}

/**
 * Cloudflare KV implementation for request and document storage
 */
export class CloudflareRequestStorage implements RequestStorage, DocumentStorage {
  private requestsKV: KVNamespace;
  private documentsKV: KVNamespace;
  private userRequestIndexKV: KVNamespace; // For finding active user requests
  
  constructor(
    requestsKV: KVNamespace,
    documentsKV: KVNamespace,
    userRequestIndexKV: KVNamespace
  ) {
    this.requestsKV = requestsKV;
    this.documentsKV = documentsKV;
    this.userRequestIndexKV = userRequestIndexKV;
  }

  // =============================================================================
  // Request Storage Implementation
  // =============================================================================

  /**
   * Store a user request
   */
  async storeRequest(request: UserRequest): Promise<void> {
    const key = `request:${request.id}`;
    await this.requestsKV.put(key, JSON.stringify(request));
    
    // Index by user for finding active requests
    const userKey = `user:${request.userId}:active`;
    if (request.status === 'collecting' || request.status === 'processing') {
      await this.userRequestIndexKV.put(userKey, request.id);
    } else if (request.status === 'completed' || request.status === 'error') {
      await this.userRequestIndexKV.delete(userKey);
    }
  }

  /**
   * Get a request by ID
   */
  async getRequest(requestId: string): Promise<UserRequest | null> {
    const key = `request:${requestId}`;
    const stored = await this.requestsKV.get(key);
    
    if (!stored) return null;
    
    try {
      return JSON.parse(stored) as UserRequest;
    } catch (error) {
      console.error('Error parsing stored request:', error);
      return null;
    }
  }

  /**
   * Update request status
   */
  async updateRequestStatus(
    requestId: string, 
    status: UserRequest['status']
  ): Promise<void> {
    const request = await this.getRequest(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    request.status = status;
    request.lastActivity = new Date().toISOString();
    
    if (status === 'completed') {
      request.processedAt = new Date().toISOString();
    }

    await this.storeRequest(request);
  }

  /**
   * Get user's active request
   */
  async getUserActiveRequest(userId: number): Promise<UserRequest | null> {
    const userKey = `user:${userId}:active`;
    const requestId = await this.userRequestIndexKV.get(userKey);
    
    if (!requestId) return null;
    
    return await this.getRequest(requestId);
  }

  /**
   * Delete a request and its documents
   */
  async deleteRequest(requestId: string): Promise<void> {
    const request = await this.getRequest(requestId);
    if (!request) return;

    // Delete associated documents
    const documents = await this.getRequestDocuments(requestId);
    for (const doc of documents) {
      await this.deleteDocument(doc.id);
    }

    // Delete request
    const key = `request:${requestId}`;
    await this.requestsKV.delete(key);

    // Clean up user index
    const userKey = `user:${request.userId}:active`;
    const activeRequestId = await this.userRequestIndexKV.get(userKey);
    if (activeRequestId === requestId) {
      await this.userRequestIndexKV.delete(userKey);
    }
  }

  /**
   * Get requests older than specified hours
   */
  async getExpiredRequests(olderThanHours: number): Promise<string[]> {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const expiredIds: string[] = [];

    // List all request keys
    const { keys } = await this.requestsKV.list({ prefix: 'request:' });
    
    for (const key of keys) {
      const request = await this.getRequest(key.name.replace('request:', ''));
      if (request && new Date(request.lastActivity) < cutoffTime) {
        expiredIds.push(request.id);
      }
    }

    return expiredIds;
  }

  /**
   * Clean up expired requests
   */
  async cleanupExpiredRequests(olderThanHours: number): Promise<number> {
    const expiredIds = await this.getExpiredRequests(olderThanHours);
    
    for (const requestId of expiredIds) {
      await this.deleteRequest(requestId);
    }

    return expiredIds.length;
  }

  // =============================================================================
  // Document Storage Implementation (DocumentStorage interface)
  // =============================================================================

  /**
   * Store a document
   */
  async storeDocument(document: DocumentReference): Promise<void> {
    const key = `document:${document.id}`;
    await this.documentsKV.put(key, JSON.stringify(document));
    
    // Update request document index
    await this.addDocumentToRequest(document.requestId, document.id);
  }

  /**
   * Get a document by ID
   */
  async getDocument(documentId: string): Promise<DocumentReference | null> {
    const key = `document:${documentId}`;
    const stored = await this.documentsKV.get(key);
    
    if (!stored) return null;
    
    try {
      return JSON.parse(stored) as DocumentReference;
    } catch (error) {
      console.error('Error parsing stored document:', error);
      return null;
    }
  }

  /**
   * Get all documents for a request
   */
  async getRequestDocuments(requestId: string): Promise<DocumentReference[]> {
    const request = await this.getRequest(requestId);
    if (!request) return [];

    const documents: DocumentReference[] = [];
    
    for (const docId of request.documentIds) {
      const document = await this.getDocument(docId);
      if (document) {
        documents.push(document);
      }
    }

    return documents;
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    const document = await this.getDocument(documentId);
    if (!document) return;

    // Remove from request document list
    await this.removeDocumentFromRequest(document.requestId, documentId);

    // Delete document
    const key = `document:${documentId}`;
    await this.documentsKV.delete(key);
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  /**
   * Add document ID to request's document list
   */
  private async addDocumentToRequest(requestId: string, documentId: string): Promise<void> {
    const request = await this.getRequest(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    if (!request.documentIds.includes(documentId)) {
      request.documentIds.push(documentId);
      request.lastActivity = new Date().toISOString();
      await this.storeRequest(request);
    }
  }

  /**
   * Remove document ID from request's document list
   */
  private async removeDocumentFromRequest(requestId: string, documentId: string): Promise<void> {
    const request = await this.getRequest(requestId);
    if (!request) return;

    const index = request.documentIds.indexOf(documentId);
    if (index > -1) {
      request.documentIds.splice(index, 1);
      request.lastActivity = new Date().toISOString();
      await this.storeRequest(request);
    }
  }

  // =============================================================================
  // Health and Maintenance
  // =============================================================================

  /**
   * Health check
   */
  async healthCheck(): Promise<{ 
    status: 'healthy' | 'unhealthy'; 
    message: string; 
    details?: any 
  }> {
    try {
      // Test basic KV operations
      const testKey = `health-check-${Date.now()}`;
      const testData = { timestamp: new Date().toISOString() };
      
      // Test write
      await this.requestsKV.put(testKey, JSON.stringify(testData));
      
      // Test read
      const stored = await this.requestsKV.get(testKey);
      if (!stored) {
        throw new Error('Failed to read test data');
      }
      
      // Test delete
      await this.requestsKV.delete(testKey);
      
      return { 
        status: 'healthy', 
        message: 'Request storage operational',
        details: { kvOperationsTest: 'passed' }
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        message: `Storage health check failed: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * Get storage statistics
   */
  async getStatistics(): Promise<{
    totalRequests: number;
    totalDocuments: number;
    activeRequests: number;
    completedRequests: number;
  }> {
    try {
      const { keys: requestKeys } = await this.requestsKV.list({ prefix: 'request:' });
      const { keys: documentKeys } = await this.documentsKV.list({ prefix: 'document:' });
      
      let activeRequests = 0;
      let completedRequests = 0;
      
      // Count request statuses (sample-based for performance)
      const sampleSize = Math.min(requestKeys.length, 100);
      for (let i = 0; i < sampleSize; i++) {
        const requestKey = requestKeys[i];
        if (requestKey) {
          const request = await this.getRequest(
            requestKey.name.replace('request:', '')
          );
          if (request) {
            if (request.status === 'collecting' || request.status === 'processing') {
              activeRequests++;
            } else if (request.status === 'completed') {
              completedRequests++;
            }
          }
        }
      }
      
      // Scale up if we sampled
      if (sampleSize < requestKeys.length) {
        const scaleFactor = requestKeys.length / sampleSize;
        activeRequests = Math.round(activeRequests * scaleFactor);
        completedRequests = Math.round(completedRequests * scaleFactor);
      }
      
      return {
        totalRequests: requestKeys.length,
        totalDocuments: documentKeys.length,
        activeRequests,
        completedRequests
      };
    } catch (error) {
      console.error('Error getting storage statistics:', error);
      return {
        totalRequests: 0,
        totalDocuments: 0,
        activeRequests: 0,
        completedRequests: 0
      };
    }
  }
}
