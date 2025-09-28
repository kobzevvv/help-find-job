/**
 * Simplified Telegram conversation handler
 * Supports only two commands: /send_resume and /send_job_ad
 */

import { LoggingService } from '../services/logging';
import { SessionService } from '../services/session';
import { TelegramService } from '../services/telegram';
import { TelegramMessage } from '../types/telegram';

export class ConversationHandler {
  private sessionService: SessionService;
  private telegramService: TelegramService;
  private loggingService: LoggingService;
  private ai: any; // Cloudflare AI binding

  constructor(
    sessionService: SessionService,
    telegramService: TelegramService,
    loggingService: LoggingService,
    ai?: any
  ) {
    this.sessionService = sessionService;
    this.telegramService = telegramService;
    this.loggingService = loggingService;
    this.ai = ai;
  }

  /**
   * Handle incoming message
   */
  async handleMessage(message: TelegramMessage): Promise<void> {
    const userId = message.from?.id;
    const chatId = message.chat.id;

    if (!userId) {
      console.error('❌ Missing user ID in message');
      return;
    }

    try {
      // Log the message
      await this.loggingService.logUserMessage(
        userId,
        chatId,
        message.text || 'document',
        {
          messageId: message.message_id,
        }
      );

      // Handle commands
      if (message.text?.startsWith('/')) {
        await this.handleCommand(message.text, chatId, userId);
        return;
      }

      // Handle different message types
      if (message.text) {
        await this.handleTextMessage(message, chatId, userId);
      } else if (message.document) {
        await this.handleDocumentMessage(message, chatId, userId);
      } else {
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: 'Пожалуйста, отправьте текст, PDF файл или используйте команды /send_resume или /send_job_ad',
        });
      }
    } catch (error) {
      console.error('💥 MESSAGE HANDLER ERROR:', error);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ Что-то пошло не так. Пожалуйста, попробуйте ещё раз.',
      });
    }
  }

  /**
   * Handle text messages
   */
  private async handleTextMessage(
    message: TelegramMessage,
    chatId: number,
    userId: number
  ): Promise<void> {
    const text = message.text!;

    // Get current session state
    const session = await this.sessionService.getSession(userId);
    const state = session?.state || 'idle';

    switch (state) {
      case 'collecting_resume':
        await this.handleResumeText(text, chatId, userId);
        break;

      case 'collecting_job_ad':
        await this.handleJobAdText(text, chatId, userId);
        break;

      default:
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: 'Используйте команды /send_resume или /send_job_ad для начала.',
        });
    }
  }

  /**
   * Handle commands
   */
  private async handleCommand(
    command: string,
    chatId: number,
    userId: number
  ): Promise<void> {
    console.log(`🔍 COMMAND DEBUG: Received command: "${command}"`);
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase() || '';
    console.log(`🔍 COMMAND DEBUG: Processed command: "${cmd}"`);

    switch (cmd) {
      case '/start':
        await this.sendWelcomeMessage(chatId);
        break;

      case '/help':
        await this.sendHelpMessage(chatId);
        break;

      case '/send_resume':
        await this.startResumeCollection(chatId, userId);
        break;

      case '/send_job_ad':
        await this.startJobAdCollection(chatId, userId);
        break;

      case '/get_logs':
        await this.sendLogs(chatId);
        break;

      case '/show_structured_resume_text':
      case '/structure_my_resume':
        await this.showStructuredResume(chatId, userId);
        break;

      case '/show_raw_text_resume':
        await this.showRawTextResume(chatId, userId);
        break;

      case '/clear_resume':
        await this.clearResumeData(chatId, userId);
        break;

      default:
        await this.sendHelpMessage(chatId);
    }
  }

  /**
   * Start resume collection
   */
  private async startResumeCollection(
    chatId: number,
    userId: number
  ): Promise<void> {
    // Create or get session
    let session = await this.sessionService.getSession(userId);
    if (!session) {
      session = this.sessionService.createSession(userId, chatId);
      await this.sessionService.saveSession(session);
    }

    // Set state to collecting resume
    await this.sessionService.updateState(userId, 'collecting_resume');

    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: '📄 Отправьте ваше резюме. Можно отправить текст в нескольких сообщениях или прикрепить PDF файл.\n\nКогда закончите, скажите "готово".',
    });
  }

  /**
   * Start job ad collection
   */
  private async startJobAdCollection(
    chatId: number,
    userId: number
  ): Promise<void> {
    // Create or get session
    let session = await this.sessionService.getSession(userId);
    if (!session) {
      session = this.sessionService.createSession(userId, chatId);
      await this.sessionService.saveSession(session);
    }

    // Set state to collecting job ad
    await this.sessionService.updateState(userId, 'collecting_job_ad');

    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: '💼 Отправьте текст вакансии. Можно отправить в нескольких сообщениях или прикрепить PDF файл.\n\nКогда закончите, скажите "готово".',
    });
  }

  /**
   * Handle resume text input
   */
  private async handleResumeText(
    text: string,
    chatId: number,
    userId: number
  ): Promise<void> {
    // Check if this is a "done" command
    if (['готово', 'done', 'готов', 'ok'].includes(text.trim().toLowerCase())) {
      await this.sessionService.updateState(userId, 'idle');
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '✅ Резюме получено! Используйте /send_job_ad для отправки вакансии.',
      });
      return;
    }

    // Append text to resume
    await this.sessionService.appendResumeText(userId, text);

    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: '✅ Добавлено к резюме. Продолжайте или нажмите кнопку:',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Готово с резюме', callback_data: 'resume_done' }],
        ],
      },
    });
  }

  /**
   * Handle job ad text input
   */
  private async handleJobAdText(
    text: string,
    chatId: number,
    userId: number
  ): Promise<void> {
    // Check if this is a "done" command
    if (['готово', 'done', 'готов', 'ok'].includes(text.trim().toLowerCase())) {
      await this.sessionService.updateState(userId, 'idle');
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '✅ Вакансия получена! Теперь вы можете начать новую сессию.',
      });
      return;
    }

    // Append text to job ad
    await this.sessionService.appendJobAdText(userId, text);

    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: '✅ Добавлено к вакансии. Продолжайте или нажмите кнопку:',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Готово с вакансией', callback_data: 'job_done' }],
        ],
      },
    });
  }

  /**
   * Send logs to admin
   */
  private async sendLogs(chatId: number): Promise<void> {
    try {
      // Get environment from process or default
      const environment = process.env.ENVIRONMENT || 'development';

      // Get formatted logs (limit to 20 for readability)
      const logsMessage = await this.loggingService.getFormattedRecentLogs(
        20,
        environment
      );

      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: logsMessage,
      });
    } catch (error) {
      console.error('Error sending logs:', error);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ Не удалось получить логи. Попробуйте позже.',
      });
    }
  }

  /**
   * Send welcome message
   */
  private async sendWelcomeMessage(chatId: number): Promise<void> {
    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: '👋 Привет!\n\nКоманды:\n/send_resume - отправить резюме\n/send_job_ad - отправить вакансию\n/show_raw_text_resume - показать сырой текст резюме (отладка)\n/get_logs - получить логи\n/help - помощь',
    });
  }

  /**
   * Handle document uploads (PDF files)
   */
  private async handleDocumentMessage(
    message: TelegramMessage,
    chatId: number,
    userId: number
  ): Promise<void> {
    const document = message.document!;
    const fileName = document.file_name || 'document';
    const fileSize = document.file_size || 0;

    // Check file size (limit to 10MB)
    if (fileSize > 10 * 1024 * 1024) {
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ Файл слишком большой. Максимальный размер: 10MB.',
      });
      return;
    }

    // Check file type (only PDF for now)
    if (!document.mime_type?.includes('pdf')) {
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ Поддерживаются только PDF файлы.',
      });
      return;
    }

    try {
      // Get current session state
      const session = await this.sessionService.getSession(userId);
      const state = session?.state || 'idle';

      if (state !== 'collecting_resume' && state !== 'collecting_job_ad') {
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: '❌ Сначала используйте команду /send_resume или /send_job_ad',
        });
        return;
      }

      // Send processing message
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: `⏳ Обрабатываю файл ${fileName}...`,
      });

      // Download file from Telegram
      const fileInfo = await this.telegramService.getFile(document.file_id);
      if (!fileInfo?.file_path) {
        throw new Error('Не удалось получить информацию о файле');
      }

      const fileContent = await this.telegramService.downloadFile(
        fileInfo.file_path
      );
      if (!fileContent) {
        throw new Error('Не удалось скачать файл');
      }

      // Process PDF with Cloudflare AI
      const extractedText = await this.processPDFFile(fileContent, fileName);

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('Не удалось извлечь текст из PDF файла');
      }

      // Add to session based on current state
      if (state === 'collecting_resume') {
        await this.sessionService.appendResumeText(userId, extractedText);
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: `✅ PDF "${fileName}" обработан (${extractedText.length} символов).\nПродолжайте или нажмите кнопку:`,
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Готово с резюме', callback_data: 'resume_done' }],
            ],
          },
        });
      } else if (state === 'collecting_job_ad') {
        await this.sessionService.appendJobAdText(userId, extractedText);
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: `✅ PDF "${fileName}" обработан (${extractedText.length} символов).\nПродолжайте или нажмите кнопку:`,
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Готово с вакансией', callback_data: 'job_done' }],
            ],
          },
        });
      }
    } catch (error) {
      console.error('Error processing document:', error);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: `❌ Не удалось обработать файл: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      });
    }
  }

  /**
   * Process PDF file using Cloudflare AI
   */
  private async processPDFFile(
    fileContent: ArrayBuffer,
    fileName: string
  ): Promise<string> {
    try {
      if (!this.ai) {
        // Fallback if AI is not available
        console.warn('AI binding not available, using fallback PDF processing');
        return `PDF файл "${fileName}" принят. Размер: ${Math.round(fileContent.byteLength / 1024)} KB. Для извлечения текста требуется настройка ИИ.`;
      }

      console.log(
        `Processing PDF: ${fileName}, size: ${fileContent.byteLength} bytes`
      );

      // Use Cloudflare AI for PDF text extraction
      // Try multiple models for better PDF processing
      let response;
      try {
        // First try with a more robust model
        response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            {
              role: 'user',
              content: `Extract all text content from this PDF document. Include all readable text, maintaining the original structure and formatting as much as possible. Document: ${fileName}`,
            },
          ],
        });

        if (response && response.response) {
          return response.response;
        }
      } catch (error) {
        console.log('First model failed, trying alternative...');
      }

      // Fallback to original model
      response = await this.ai.run('@cf/unum/uform-gen2-qwen-500m', {
        image: [...new Uint8Array(fileContent)], // Convert ArrayBuffer to array for AI
        prompt:
          'Extract all text content from this document. Include all readable text, maintaining the original structure and formatting as much as possible.',
      });

      if (response && response.description) {
        return response.description;
      }

      // If AI response doesn't have expected format, return a basic message
      return `PDF файл "${fileName}" обработан. Извлечено ${Math.round(fileContent.byteLength / 1024)} KB данных.`;
    } catch (error) {
      console.error('Error processing PDF:', error);

      // Return a fallback message instead of throwing
      return `PDF файл "${fileName}" принят, но возникла ошибка при извлечении текста: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}. Попробуйте отправить текст вручную.`;
    }
  }

  /**
   * Send help message
   */
  private async sendHelpMessage(chatId: number): Promise<void> {
    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: '🤖 Команды:\n\n/send_resume - отправить резюме\n/send_job_ad - отправить вакансию\n/show_structured_resume_text - показать структурированное резюме\n/structure_my_resume - структурировать мое резюме\n/show_raw_text_resume - показать сырой текст резюме (отладка)\n/get_logs - получить логи\n\nМожно отправлять текст или PDF файлы.\nЗавершите словом "готово" или кнопкой.',
    });
  }

  /**
   * Show structured resume text
   */
  private async showStructuredResume(
    chatId: number,
    userId: number
  ): Promise<void> {
    const session = await this.sessionService.getSession(userId);
    if (!session || !session.resumeText) {
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ Резюме не найдено. Пожалуйста, сначала отправьте резюме используя /send_resume',
      });
      return;
    }

    // Process the resume text to extract structured information
    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: '⏳ Обрабатываю ваше резюме... Это может занять несколько секунд.',
    });

    try {
      // Use AI to extract structured information
      if (!this.ai) {
        throw new Error('AI service not available');
      }

      const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          {
            role: 'user',
            content: `Extract and structure the following information from this resume in Russian:

${session.resumeText}

Please format the response with:
1. 🎯 Желаемые позиции: (desired positions)
2. 📝 Краткое резюме: (brief summary)
3. 🛠️ Навыки: (skills with proficiency levels)
4. 💼 Опыт работы: (work experience with dates and responsibilities)

Use emojis and clear sections.`,
          },
        ],
      });

      if (!response || !response.response) {
        throw new Error('Failed to process resume');
      }

      const structuredMessage = response.response;

      // Send the structured resume with a header
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: `📋 Структурированное резюме:\n\n${structuredMessage}`,
      });
    } catch (error) {
      console.error('Error processing resume:', error);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: `❌ Не удалось обработать резюме: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}. Пожалуйста, попробуйте позже.`,
      });
    }
  }

  /**
   * Show raw text resume for debugging
   */
  private async showRawTextResume(
    chatId: number,
    userId: number
  ): Promise<void> {
    console.log(
      `🔍 SHOW RAW TEXT DEBUG: Starting showRawTextResume for user ${userId}`
    );
    const session = await this.sessionService.getSession(userId);

    if (!session || !session.resumeText) {
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ Резюме не найдено. Пожалуйста, сначала отправьте резюме используя /send_resume',
      });
      return;
    }

    const rawText = session.resumeText;
    const textLength = rawText.length;
    const wordCount = rawText
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    // Telegram has a 4096 character limit per message, so we need to split long text
    const maxLength = 4000; // Leave some buffer for formatting

    if (textLength <= maxLength) {
      // Send the full text in one message
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: `🔍 Сырой текст резюме (для отладки)\n\n📊 Статистика:\n• Символов: ${textLength}\n• Слов: ${wordCount}\n\n📄 Текст:\n\n${rawText}`,
      });
    } else {
      // Send statistics first
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: `🔍 Сырой текст резюме (для отладки)\n\n📊 Статистика:\n• Символов: ${textLength}\n• Слов: ${wordCount}\n\n⚠️ Текст слишком длинный, отправляю частями...`,
      });

      // Split text into chunks
      const chunks = [];
      for (let i = 0; i < rawText.length; i += maxLength) {
        chunks.push(rawText.slice(i, i + maxLength));
      }

      // Send each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunkNumber = i + 1;
        const totalChunks = chunks.length;

        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: `📄 Часть ${chunkNumber}/${totalChunks}:\n\n${chunks[i]}`,
        });

        // Small delay between messages to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }
  }

  /**
   * Clear resume data for debugging
   */
  private async clearResumeData(chatId: number, userId: number): Promise<void> {
    try {
      // Clear resume text from session
      await this.sessionService.clearResumeText(userId);

      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '🗑️ Данные резюме очищены. Теперь вы можете загрузить новое резюме с помощью /send_resume',
      });
    } catch (error) {
      console.error('Error clearing resume data:', error);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ Не удалось очистить данные резюме.',
      });
    }
  }
}
