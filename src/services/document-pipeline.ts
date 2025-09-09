/**
 * Document Processing Pipeline
 *
 * Handles document-to-text conversion and creates DocumentReference objects
 * for the request-based architecture.
 */

import { DocumentReference } from '../types/session';
import { CloudflareAIService } from '../types/ai';

export interface DocumentStorage {
  storeDocument(document: DocumentReference): Promise<void>;
  getDocument(documentId: string): Promise<DocumentReference | null>;
  getRequestDocuments(requestId: string): Promise<DocumentReference[]>;
  deleteDocument(documentId: string): Promise<void>;
}

/**
 * Pipeline for processing documents and creating structured references
 */
export class DocumentProcessingPipeline {
  private ai: CloudflareAIService;
  private storage: DocumentStorage;

  constructor(ai: CloudflareAIService, storage: DocumentStorage) {
    this.ai = ai;
    this.storage = storage;
  }

  /**
   * Main entry point - process document and create DocumentReference
   */
  async processDocument(
    requestId: string,
    documentType: 'resume' | 'job_post',
    content: ArrayBuffer,
    fileName?: string,
    mimeType?: string
  ): Promise<DocumentReference> {
    const documentId = this.generateDocumentId();

    try {
      // Convert document to text
      const { text, conversionMethod } = await this.convertToText(
        content,
        fileName,
        mimeType
      );

      // Create document reference
      const document: DocumentReference = {
        id: documentId,
        requestId,
        type: documentType,
        originalName: fileName,
        originalMimeType: mimeType,
        originalSize: content.byteLength,
        text,
        wordCount: this.countWords(text),
        conversionMethod,
        processedAt: new Date().toISOString(),
      };

      // Store document
      await this.storage.storeDocument(document);

      console.log(
        `✅ Document processed: ${documentId} (${document.wordCount} words)`
      );

      return document;
    } catch (error) {
      console.error('Error in document processing pipeline:', error);
      throw new Error(
        `Failed to process document: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Convert document to text using appropriate method
   */
  private async convertToText(
    content: ArrayBuffer,
    fileName?: string,
    mimeType?: string
  ): Promise<{
    text: string;
    conversionMethod: DocumentReference['conversionMethod'];
  }> {
    // Handle plain text
    if (mimeType === 'text/plain' || fileName?.endsWith('.txt')) {
      const text = new TextDecoder('utf-8').decode(content);
      return { text, conversionMethod: 'text-input' };
    }

    // Handle PDF and DOCX with Cloudflare AI (with fallback)
    if (this.isPDFOrDOCX(fileName, mimeType)) {
      console.log('🔍 Document processing pipeline - AI binding check:', {
        hasAI: !!this.ai,
        aiType: typeof this.ai,
        hasToMarkdown: this.ai ? typeof this.ai.toMarkdown : 'no-ai',
        fileName,
        mimeType,
      });

      // Try Cloudflare Workers AI first
      if (this.ai) {
        try {
          // Check if toMarkdown method exists
          if (typeof this.ai.toMarkdown === 'function') {
            const blob = new Blob([content], {
              type: mimeType || this.detectMimeType(fileName),
            });

            console.log('🔄 Calling AI.toMarkdown...');
            const results = await this.ai.toMarkdown([
              {
                name: fileName || 'document',
                blob,
              },
            ]);

            console.log('📋 AI.toMarkdown results:', {
              hasResults: !!results,
              resultsLength: results ? results.length : 0,
              firstResult:
                results && results[0]
                  ? {
                      hasMarkdown: !!results[0].markdown,
                      hasData: !!results[0].data,
                      markdownLength: results[0].markdown
                        ? results[0].markdown.length
                        : 0,
                      dataLength: results[0].data ? results[0].data.length : 0,
                    }
                  : null,
            });

            if (results && results[0]) {
              // Cloudflare Workers AI sometimes returns content in 'data' property instead of 'markdown'
              const rawContent = results[0].markdown || results[0].data;

              if (
                rawContent &&
                typeof rawContent === 'string' &&
                rawContent.trim()
              ) {
                const text = this.markdownToText(rawContent);
                console.log(
                  '✅ Document processed with Cloudflare Workers AI, extracted',
                  text.length,
                  'characters'
                );
                return { text, conversionMethod: 'cloudflare-ai' };
              } else {
                console.error(
                  '❌ AI.toMarkdown returned empty content:',
                  results[0]
                );
              }
            } else {
              console.error('❌ AI.toMarkdown returned no results:', results);
            }
          } else {
            console.warn(
              '⚠️ AI.toMarkdown method not available, trying fallback'
            );
          }
        } catch (error) {
          console.error(
            '⚠️ Cloudflare Workers AI failed, trying fallback:',
            error
          );
        }
      } else {
        console.warn('⚠️ AI service not available, trying JavaScript fallback');
      }

      // Fallback to JavaScript PDF parsing for PDFs
      if (
        mimeType === 'application/pdf' ||
        (fileName && fileName.endsWith('.pdf'))
      ) {
        try {
          const { text } = await this.fallbackPdfProcessing(content);
          console.log('✅ PDF processed with JavaScript fallback');
          return { text, conversionMethod: 'javascript-fallback' };
        } catch (error) {
          console.error('⚠️ JavaScript PDF parsing failed:', error);
        }
      }

      // For DOCX or if all else fails
      const errorMessage = [
        'Не удалось обработать документ.',
        '',
        '🔧 Возможные решения:',
        '1. Включите Workers AI в панели Cloudflare (dash.cloudflare.com)',
        '2. Убедитесь, что у вас есть платный план Cloudflare',
        '3. Скопируйте и вставьте текст вручную',
        '',
        '💡 Workers AI требует платный аккаунт для обработки документов',
      ].join('\n');

      throw new Error(errorMessage);
    }

    // Fallback to text decoding
    try {
      const text = new TextDecoder('utf-8').decode(content);
      return { text, conversionMethod: 'fallback' };
    } catch (error) {
      throw new Error('Unable to extract text from document');
    }
  }

  /**
   * Check if document is PDF or DOCX
   */
  private isPDFOrDOCX(fileName?: string, mimeType?: string): boolean {
    return Boolean(
      mimeType === 'application/pdf' ||
        (fileName && fileName.endsWith('.pdf')) ||
        mimeType ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        (fileName && fileName.endsWith('.docx'))
    );
  }

  /**
   * Detect MIME type from file extension
   */
  private detectMimeType(fileName?: string): string {
    if (!fileName) return 'application/octet-stream';

    if (fileName.endsWith('.pdf')) {
      return 'application/pdf';
    }
    if (fileName.endsWith('.docx')) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    if (fileName.endsWith('.txt')) {
      return 'text/plain';
    }

    return 'application/octet-stream';
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  /**
   * Generate unique document ID
   */
  private generateDocumentId(): string {
    return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get documents for a request
   */
  async getRequestDocuments(requestId: string): Promise<DocumentReference[]> {
    return await this.storage.getRequestDocuments(requestId);
  }

  /**
   * Get single document
   */
  async getDocument(documentId: string): Promise<DocumentReference | null> {
    return await this.storage.getDocument(documentId);
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<void> {
    await this.storage.deleteDocument(documentId);
  }

  /**
   * Fallback PDF processing using JavaScript library
   */
  private async fallbackPdfProcessing(
    _content: ArrayBuffer
  ): Promise<{ text: string }> {
    // pdf-parse doesn't work in Cloudflare Workers environment
    // For now, we'll provide a helpful error message
    throw new Error(
      'PDF processing requires Cloudflare Workers AI. Please enable it in your account or copy and paste the text manually.'
    );
  }

  /**
   * Convert markdown to clean text
   */
  private markdownToText(markdown: string): string {
    // Remove markdown formatting but preserve structure
    return markdown
      .replace(/^#{1,6}\s+/gm, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/\n\s*\n/g, '\n') // Clean extra newlines
      .trim();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    message: string;
  }> {
    try {
      // Check AI availability
      if (!this.ai) {
        return { status: 'unhealthy', message: 'AI service not available' };
      }

      // Check storage availability
      // Note: We could test storage with a simple operation here

      return {
        status: 'healthy',
        message: 'Document processing pipeline operational',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Pipeline health check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
