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
  private adminPassword: string;
  private environment: string;

  constructor(
    sessionService: SessionService,
    telegramService: TelegramService,
    loggingService: LoggingService,
    ai?: any,
    adminPassword: string = '12354678',
    environment: string = 'development'
  ) {
    this.sessionService = sessionService;
    this.telegramService = telegramService;
    this.loggingService = loggingService;
    this.ai = ai;
    this.adminPassword = adminPassword;
    this.environment = environment;
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
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase() || '';

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

      case '/get_last_10_messages':
        await this.handleAdminLogCommand(chatId, userId, 10, parts[1]);
        break;

      case '/get_last_100_messages':
        await this.handleAdminLogCommand(chatId, userId, 100, parts[1]);
        break;

      case '/get_last_300_messages':
        await this.handleAdminLogCommand(chatId, userId, 300, parts[1]);
        break;

      case '/log_summary':
        await this.handleAdminLogSummaryCommand(chatId, userId, parts[1]);
        break;

      case '/get_logs':
        // Temporary fix: redirect to admin commands with help message
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text:
            '🔧 **Admin команды:**\n\n' +
            '• `/get_last_10_messages [password]` - последние 10 сообщений\n' +
            '• `/get_last_100_messages [password]` - последние 100 сообщений\n' +
            '• `/log_summary [password]` - сводка логов\n\n' +
            '💡 **Пример:** `/get_last_10_messages YOUR_PASSWORD`',
        });
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
   * Handle admin log command with password authentication
   */
  private async handleAdminLogCommand(
    chatId: number,
    userId: number,
    limit: number,
    providedPassword?: string
  ): Promise<void> {
    try {
      // Parse command to extract password
      // For now, we'll use a simple approach - in a real implementation
      // you'd want to parse the command properly

      // Simple authorization check
      const isAuthorized =
        this.environment === 'staging' ||
        providedPassword === this.adminPassword;

      if (!isAuthorized) {
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: this.getInvalidPasswordMessage(),
        });
        await this.loggingService.log(
          'WARN',
          'ADMIN_ACCESS_DENIED',
          `Unauthorized access attempt to logs (limit: ${limit})`,
          { userId, limit }
        );
        return;
      }

      // Send "loading" message
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: `📊 Fetching last ${limit} log messages...`,
      });

      // Get formatted logs
      const logsMessage = await this.loggingService.getFormattedRecentLogs(
        limit,
        this.environment
      );

      // Send logs
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: logsMessage,
      });

      // Log successful access
      await this.loggingService.log(
        'INFO',
        'ADMIN_LOGS_ACCESSED',
        `Admin accessed last ${limit} messages`,
        { userId, limit }
      );
    } catch (error) {
      console.error('Error in admin log command:', error);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ Error retrieving logs. Please try again.',
      });
    }
  }

  /**
   * Handle admin log summary command
   */
  private async handleAdminLogSummaryCommand(
    chatId: number,
    userId: number,
    providedPassword?: string
  ): Promise<void> {
    try {
      // Simple authorization check with debugging
      console.log(
        'DEBUG handleAdminLogSummaryCommand: Environment:',
        this.environment
      );
      console.log(
        'DEBUG handleAdminLogSummaryCommand: Provided password:',
        providedPassword
      );
      console.log(
        'DEBUG handleAdminLogSummaryCommand: Admin password:',
        this.adminPassword
      );
      console.log(
        'DEBUG handleAdminLogSummaryCommand: Passwords match:',
        providedPassword === this.adminPassword
      );

      const isAuthorized =
        this.environment === 'staging' ||
        providedPassword === this.adminPassword;

      if (!isAuthorized) {
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: this.getInvalidPasswordMessage(),
        });
        return;
      }

      // Send "loading" message
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '📊 Generating log summary...',
      });

      // Get log summary (24 hours)
      const summary = await this.loggingService.getAdminLogSummary(24);

      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: summary,
      });

      await this.loggingService.log(
        'INFO',
        'ADMIN_LOG_SUMMARY_ACCESSED',
        'Admin accessed log summary',
        { userId }
      );
    } catch (error) {
      console.error('Error in admin log summary command:', error);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ Error generating log summary. Please try again.',
      });
    }
  }

  /**
   * Get invalid password message
   */
  private getInvalidPasswordMessage(): string {
    if (this.environment === 'staging') {
      return `❌ Invalid password for staging environment.\n\n🔑 **Staging Password**: \`${this.adminPassword}\`\n\n💡 **Example:** \`/get_last_10_messages ${this.adminPassword}\``;
    } else if (this.environment === 'production') {
      return `❌ Invalid password for production environment.\n\n🔒 **Contact maintainer for the secure password.**\n\n💡 **Format:** \`/get_last_10_messages AdminPass2024_Secure_9X7mK2pL8qR3nF6j\``;
    } else {
      return `❌ Invalid password for ${this.environment} environment.\n\n🛠️ **Password**: \`${this.adminPassword}\`\n\n💡 **Format:** \`/command password\``;
    }
  }

  /**
   * Send welcome message
   */
  private async sendWelcomeMessage(chatId: number): Promise<void> {
    const baseMessage =
      '👋 Привет!\n\nКоманды:\n/send_resume - отправить резюме\n/send_job_ad - отправить вакансию\n/help - помощь';

    // Add admin commands for staging/development
    const adminCommands =
      '\n\n🔧 **Admin команды:**\n/get_last_10_messages - последние 10 сообщений\n/get_last_100_messages - последние 100 сообщений\n/log_summary - сводка логов';

    const fullMessage = baseMessage + adminCommands;

    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: fullMessage,
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
      // Using @cf/unum/uform-gen2-qwen-500m for document understanding
      const response = await this.ai.run('@cf/unum/uform-gen2-qwen-500m', {
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
    const baseMessage =
      '🤖 Команды:\n\n/send_resume - отправить резюме\n/send_job_ad - отправить вакансию\n/help - эта справка\n\nМожно отправлять текст или PDF файлы.\nЗавершите словом "готово" или кнопкой.';

    // Add admin commands for staging/development
    const adminCommands =
      '\n\n🔧 **Admin команды:**\n/get_last_10_messages - последние 10 сообщений\n/get_last_100_messages - последние 100 сообщений\n/log_summary - сводка логов';

    const fullMessage = baseMessage + adminCommands;

    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: fullMessage,
    });
  }
}
