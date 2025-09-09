/**
 * Document processing service
 */

import { ProcessedDocument } from '../types/session';

export class DocumentService {
  private maxFileSizeMB: number;

  constructor(maxFileSizeMB: number = 10) {
    this.maxFileSizeMB = maxFileSizeMB;
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
   * Extract text from PDF (basic implementation)
   * Note: This is a placeholder - in production, you'd use a proper PDF parser
   */
  private async extractTextFromPDF(_content: ArrayBuffer): Promise<string> {
    // For now, return a message asking user to copy-paste text
    // In production, you'd integrate with a PDF parsing library
    throw new Error(
      'Обработка PDF пока не реализована. Пожалуйста, скопируйте и вставьте текст.'
    );
  }

  /**
   * Extract text from DOCX (basic implementation)
   * Note: This is a placeholder - in production, you'd use a proper DOCX parser
   */
  private async extractTextFromDOCX(_content: ArrayBuffer): Promise<string> {
    // For now, return a message asking user to copy-paste text
    // In production, you'd integrate with a DOCX parsing library
    throw new Error(
      'Обработка DOCX пока не реализована. Пожалуйста, скопируйте и вставьте текст.'
    );
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
