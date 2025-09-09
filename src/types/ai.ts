/**
 * AI Service Types
 */

export interface AIModelResult {
  markdown?: string;
  data?: string;
}

export interface AIFileInput {
  name: string;
  blob: Blob;
}

export interface CloudflareAIService {
  run: (model: string, options: unknown) => Promise<unknown>;
  toMarkdown?: (files: AIFileInput[]) => Promise<AIModelResult[]>;
}
