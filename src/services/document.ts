/**
 * Document processing service
 */

import { ProcessedDocument } from '../types/session';
import { CloudflareAIService } from '../types/ai';

// Note: PDF parsing fallback will be implemented when a Cloudflare Workers-compatible library is available

export class DocumentService {
  private maxFileSizeMB: number;
  private ai?: CloudflareAIService;

  constructor(maxFileSizeMB: number = 10, ai?: CloudflareAIService) {
    this.maxFileSizeMB = maxFileSizeMB;
    if (ai !== undefined) {
      this.ai = ai;
    }
  }

  /**
   * Process uploaded document and extract text
   */
  async processDocument(
    content: ArrayBuffer,
    fileName?: string,
    mimeType?: string
  ): Promise<ProcessedDocument | null> {
    try {
      // Check file size
      const fileSizeBytes = content.byteLength;
      const fileSizeMB = fileSizeBytes / (1024 * 1024);

      if (fileSizeMB > this.maxFileSizeMB) {
        throw new Error(
          `Слишком большой файл: ${fileSizeMB.toFixed(2)}MB (максимум: ${this.maxFileSizeMB}MB)`
        );
      }

      let extractedText: string;

      // Extract text based on file type
      if (mimeType === 'text/plain' || fileName?.endsWith('.txt')) {
        extractedText = await this.extractTextFromPlainText(content);
      } else if (mimeType === 'application/pdf' || fileName?.endsWith('.pdf')) {
        extractedText = await this.extractTextFromPDF(content);
      } else if (
        mimeType?.includes(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) ||
        fileName?.endsWith('.docx')
      ) {
        extractedText = await this.extractTextFromDOCX(content);
      } else {
        // Try to process as plain text
        extractedText = await this.extractTextFromPlainText(content);
      }

      if (!extractedText.trim()) {
        throw new Error('В документе не найден текст');
      }

      const wordCount = this.countWords(extractedText);

      const result: ProcessedDocument = {
        text: extractedText,
        wordCount,
        processedAt: new Date().toISOString(),
      };

      if (fileName) result.fileName = fileName;
      if (mimeType) result.mimeType = mimeType;

      return result;
    } catch (error) {
      console.error('Error processing document:', error);
      return null;
    }
  }

  /**
   * Extract text from plain text file
   */
  private async extractTextFromPlainText(
    content: ArrayBuffer
  ): Promise<string> {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(content);
  }

  /**
   * Extract text from PDF using Cloudflare Workers AI with JavaScript fallback
   */
  private async extractTextFromPDF(content: ArrayBuffer): Promise<string> {
    // Try Cloudflare Workers AI first
    if (this.ai) {
      try {
        // Check if toMarkdown method exists
        if (typeof this.ai.toMarkdown === 'function') {
          const blob = new Blob([content], { type: 'application/pdf' });

          const results = await this.ai.toMarkdown([
            {
              name: 'document.pdf',
              blob,
            },
          ]);

          if (results && results[0] && results[0].markdown) {
            console.log('✅ PDF processed with Cloudflare Workers AI');
            return this.markdownToText(results[0].markdown);
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

    // Note: JavaScript PDF parsing libraries don't work in Cloudflare Workers
    // This fallback is for future compatibility if we switch to a Workers-compatible library
    console.warn(
      '⚠️ JavaScript PDF fallback not available in Cloudflare Workers'
    );

    // If all methods fail, provide helpful guidance
    const errorMessage = [
      'Не удалось обработать PDF файл.',
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

  /**
   * Extract text from DOCX using Cloudflare Workers AI
   */
  private async extractTextFromDOCX(content: ArrayBuffer): Promise<string> {
    // Try Cloudflare Workers AI first
    if (this.ai) {
      try {
        // Check if toMarkdown method exists
        if (typeof this.ai.toMarkdown === 'function') {
          const blob = new Blob([content], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          });

          const results = await this.ai.toMarkdown([
            {
              name: 'document.docx',
              blob,
            },
          ]);

          if (results && results[0] && results[0].markdown) {
            console.log('✅ DOCX processed with Cloudflare Workers AI');
            return this.markdownToText(results[0].markdown);
          }
        } else {
          console.warn('⚠️ AI.toMarkdown method not available for DOCX');
        }
      } catch (error) {
        console.error('⚠️ Cloudflare Workers AI failed for DOCX:', error);
      }
    } else {
      console.warn('⚠️ AI service not available for DOCX processing');
    }

    // For now, DOCX fallback is not implemented
    const errorMessage = [
      'Не удалось обработать DOCX файл.',
      '',
      '🔧 Возможные решения:',
      '1. Включите Workers AI в панели Cloudflare (dash.cloudflare.com)',
      '2. Убедитесь, что у вас есть платный план Cloudflare',
      '3. Конвертируйте DOCX в PDF и попробуйте снова',
      '4. Скопируйте и вставьте текст вручную',
      '',
      '💡 Workers AI требует платный аккаунт для обработки документов',
    ].join('\n');

    throw new Error(errorMessage);
  }

  /**
   * Process text input (when user pastes text directly)
   */
  processTextInput(text: string): ProcessedDocument {
    const cleanText = text.trim();
    const wordCount = this.countWords(cleanText);

    return {
      text: cleanText,
      wordCount,
      processedAt: new Date().toISOString(),
    };
  }

  /**
   * Convert markdown output to clean text
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
   * Count words in text
   */
  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  /**
   * Validate document content
   */
  validateDocument(document: ProcessedDocument): {
    isValid: boolean;
    error?: string;
  } {
    if (!document.text || document.text.trim().length === 0) {
      return { isValid: false, error: 'Документ пустой' };
    }

    if (document.wordCount < 10) {
      return {
        isValid: false,
        error: 'Слишком короткий текст (минимум 10 слов)',
      };
    }

    if (document.wordCount > 5000) {
      return {
        isValid: false,
        error: 'Слишком длинный текст (максимум 5000 слов)',
      };
    }

    return { isValid: true };
  }

  /**
   * Extract document type based on content
   */
  detectDocumentType(text: string): 'resume' | 'job_post' | 'unknown' {
    const lowerText = text.toLowerCase();

    // Resume indicators
    const resumeKeywords = [
      'experience',
      'education',
      'skills',
      'resume',
      'cv',
      'curriculum vitae',
      'employment',
      'work history',
      'qualifications',
      'achievements',
    ];

    // Job post indicators
    const jobKeywords = [
      'requirements',
      'responsibilities',
      'job description',
      'position',
      'we are looking for',
      'join our team',
      'apply',
      'salary',
      'benefits',
    ];

    const resumeScore = resumeKeywords.filter((keyword) =>
      lowerText.includes(keyword)
    ).length;
    const jobScore = jobKeywords.filter((keyword) =>
      lowerText.includes(keyword)
    ).length;

    if (resumeScore > jobScore && resumeScore >= 2) {
      return 'resume';
    } else if (jobScore > resumeScore && jobScore >= 2) {
      return 'job_post';
    }

    return 'unknown';
  }
}
