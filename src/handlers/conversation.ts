/**
 * Simplified Telegram conversation handler
 * Supports only two commands: /send_resume and /send_job_ad
 */

import { LoggingService } from '../services/logging';
import { ResumeProcessorService } from '../services/resume-processor';
import { SessionService } from '../services/session';
import { TelegramService } from '../services/telegram';
import { TelegramMessage } from '../types/telegram';

export class ConversationHandler {
  private sessionService: SessionService;
  private telegramService: TelegramService;
  private loggingService: LoggingService;
  private resumeProcessorService: ResumeProcessorService;
  private ai: unknown; // Cloudflare AI binding

  constructor(
    sessionService: SessionService,
    telegramService: TelegramService,
    loggingService: LoggingService,
    resumeProcessorService: ResumeProcessorService,
    ai?: unknown
  ) {
    this.sessionService = sessionService;
    this.telegramService = telegramService;
    this.loggingService = loggingService;
    this.resumeProcessorService = resumeProcessorService;
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

      case '/structure_my_resume':
      case '/structure_resume':
        await this.structureResume(chatId, userId);
        break;

      case '/get_logs':
        await this.sendLogs(chatId);
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
      text: '👋 Привет!\n\nКоманды:\n/send_resume - отправить резюме\n/send_job_ad - отправить вакансию\n/get_logs - получить логи\n/help - помощь',
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
      const response = await (this.ai as any).run(
        '@cf/unum/uform-gen2-qwen-500m',
        {
          image: [...new Uint8Array(fileContent)], // Convert ArrayBuffer to array for AI
          prompt:
            'Extract all text content from this document. Include all readable text, maintaining the original structure and formatting as much as possible.',
        }
      );

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
   * Structure resume using external service
   */
  private async structureResume(chatId: number, userId: number): Promise<void> {
    try {
      // Check if user has resume text
      const resumeText = await this.sessionService.getResumeText(userId);

      if (!resumeText || resumeText.trim().length === 0) {
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: '❌ У вас нет сохраненного резюме. Сначала используйте команду /send_resume для отправки резюме.',
        });
        return;
      }

      // Check if resume text is long enough
      if (resumeText.trim().length < 200) {
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: '❌ Текст резюме слишком короткий для структурирования.\n\n**Рекомендации:**\n• Добавьте разделы: "Опыт работы", "Навыки", "Желаемая позиция"\n• Опишите ваши обязанности и достижения\n• Укажите технологии и инструменты, которыми владеете\n• Минимум 200 символов для качественного анализа',
          parse_mode: 'Markdown',
        });
        return;
      }

      // Send processing message
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '⏳ Обрабатываю ваше резюме... Это может занять несколько секунд.',
      });

      // Process resume with aggressive timeout (skip health check for now)
      console.log('Starting resume processing with timeout...');
      
      const result = await Promise.race([
        this.resumeProcessorService.processResume(resumeText, 'ru'),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => {
              console.log('Processing timeout triggered');
              reject(new Error('Processing timeout - service took too long'));
            },
            15000 // Reduced to 15 seconds
          )
        ),
      ]);

      if (!result.success) {
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: `❌ Не удалось структурировать резюме:\n${result.errors.join('\n')}`,
        });
        return;
      }

      if (!result.data) {
        let errorMessage =
          '❌ Не удалось получить структурированные данные из резюме.\n\n';
        if (result.errors && result.errors.length > 0) {
          errorMessage += '**Проблемы с резюме:**\n';
          result.errors.forEach((error) => {
            errorMessage += `• ${error}\n`;
          });
          errorMessage += '\n**Рекомендации:**\n';
          errorMessage +=
            '• Убедитесь, что резюме содержит разделы: "Опыт работы", "Навыки", "Желаемая позиция"\n';
          errorMessage += '• Добавьте больше деталей о вашем опыте и навыках\n';
          errorMessage += '• Укажите желаемую должность в резюме';
        }

        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: errorMessage,
          parse_mode: 'Markdown',
        });
        return;
      }

      // Save structured resume to session
      await this.sessionService.saveStructuredResume(userId, result.data);

      // Format and send the structured resume
      const formattedResume =
        this.resumeProcessorService.formatStructuredResume(result.data);

      // Split message if too long (Telegram limit is 4096 characters)
      const maxLength = 4000; // Leave some buffer
      if (formattedResume.length <= maxLength) {
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: formattedResume,
          parse_mode: 'Markdown',
        });
      } else {
        // Split into chunks
        const chunks = this.splitMessage(formattedResume, maxLength);
        for (const chunk of chunks) {
          await this.telegramService.sendMessage({
            chat_id: chatId,
            text: chunk,
            parse_mode: 'Markdown',
          });
        }
      }

      // Send additional info
      let additionalInfo = `\n✅ **Резюме успешно структурировано!**\n`;
      additionalInfo += `⏱️ Время обработки: ${result.processing_time_ms}мс\n`;

      if (result.unmapped_fields && result.unmapped_fields.length > 0) {
        additionalInfo += `\n⚠️ Не удалось распознать поля: ${result.unmapped_fields.join(', ')}\n`;
      }

      if (result.metadata) {
        additionalInfo += `\n🤖 Модель ИИ: ${result.metadata.ai_model_used}`;
      }

      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: additionalInfo,
        parse_mode: 'Markdown',
      });
    } catch (error) {
      console.error('Error structuring resume:', error);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: `❌ Произошла ошибка при структурировании резюме: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      });
    }
  }

  /**
   * Split long message into chunks
   */
  private splitMessage(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    const lines = text.split('\n');

    for (const line of lines) {
      if (currentChunk.length + line.length + 1 <= maxLength) {
        currentChunk += (currentChunk ? '\n' : '') + line;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = line;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Send help message
   */
  private async sendHelpMessage(chatId: number): Promise<void> {
    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: '🤖 Команды:\n\n/send_resume - отправить резюме\n/send_job_ad - отправить вакансию\n/structure_my_resume - структурировать резюме\n/get_logs - получить логи\n\nМожно отправлять текст или PDF файлы.\nЗавершите словом "готово" или кнопкой.',
    });
  }
}
