/**
 * Telegram conversation handlers
 */

import { TelegramMessage } from '../types/telegram';
import { SessionService } from '../services/session';
import { TelegramService } from '../services/telegram';
import { DocumentService } from '../services/document';
import { AIService } from '../services/ai';
import { EnhancedAIService } from '../services/enhanced-ai';
import { LoggingService } from '../services/logging';
import {
  EnhancedAnalysis,
  HeadlineAnalysis,
  SkillsAnalysis,
  ExperienceAnalysis,
  JobConditionsAnalysis,
} from '../types/session';

export class ConversationHandler {
  private sessionService: SessionService;
  private telegramService: TelegramService;
  private documentService: DocumentService;
  private enhancedAIService: EnhancedAIService;
  private loggingService: LoggingService;
  private environment: string;
  private adminPassword: string;

  constructor(
    sessionService: SessionService,
    telegramService: TelegramService,
    documentService: DocumentService,
    _aiService: AIService, // Keep parameter for backwards compatibility
    enhancedAIService: EnhancedAIService,
    loggingService: LoggingService,
    environment: string = 'development',
    adminPassword: string = 'defaultpassword'
  ) {
    this.sessionService = sessionService;
    this.telegramService = telegramService;
    this.documentService = documentService;
    // aiService parameter kept for backwards compatibility but not stored
    this.enhancedAIService = enhancedAIService;
    this.loggingService = loggingService;
    this.environment = environment;
    this.adminPassword = adminPassword;
  }

  /**
   * Handle incoming message
   */
  async handleMessage(message: TelegramMessage): Promise<void> {
    const userId = message.from?.id;
    const chatId = message.chat.id;

    console.log('🎯 CONVERSATION HANDLER:', {
      userId,
      chatId,
      text: message.text,
      hasFrom: !!message.from,
      timestamp: new Date().toISOString(),
    });

    if (!userId) {
      console.error('❌ Missing user ID in message');
      await this.loggingService.logError(
        'INVALID_MESSAGE',
        'No user ID in message',
        new Error('Missing user ID'),
        undefined,
        chatId
      );
      return;
    }

    const messageText =
      message.text || message.document?.file_name || 'non-text message';
    await this.loggingService.logUserMessage(userId, chatId, messageText, {
      messageId: message.message_id,
      messageType: message.text
        ? 'text'
        : message.document
          ? 'document'
          : 'other',
      documentInfo: message.document
        ? {
            fileName: message.document.file_name,
            mimeType: message.document.mime_type,
            fileSize: message.document.file_size,
          }
        : undefined,
    });

    try {
      // Get or create session
      let session = await this.sessionService.getSession(userId);
      if (!session) {
        await this.loggingService.log(
          'INFO',
          'NEW_SESSION',
          'Creating new session for user',
          { userId, chatId }
        );
        session = this.sessionService.createSession(
          userId,
          chatId,
          message.from?.language_code
        );
        await this.sessionService.saveSession(session);
      } else {
        await this.loggingService.log(
          'DEBUG',
          'SESSION_FOUND',
          `Found existing session in state: ${session.state}`,
          {
            userId,
            chatId,
            currentState: session.state,
            sessionAge:
              new Date().getTime() - new Date(session.createdAt).getTime(),
          }
        );
      }

      // Handle different message types based on session state
      if (message.text) {
        await this.handleTextMessage(message, session.state);
      } else if (message.document) {
        await this.handleDocumentMessage(message, session.state);
      } else {
        await this.loggingService.log(
          'WARN',
          'UNSUPPORTED_MESSAGE',
          'Received unsupported message type',
          { messageType: typeof message },
          userId,
          chatId
        );
        await this.sendHelpMessage(chatId);
      }
    } catch (error) {
      console.error('💥 MESSAGE HANDLER ERROR:', error);
      await this.loggingService.logError(
        'MESSAGE_HANDLER_ERROR',
        'Error in message handler',
        error as Error,
        userId,
        chatId
      );
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
    currentState: string
  ): Promise<void> {
    const chatId = message.chat.id;
    const userId = message.from!.id;
    const text = message.text!;

    // No more admin login state to handle - simplified!

    // Handle commands
    if (text.startsWith('/')) {
      await this.handleCommand(text, chatId, userId);
      return;
    }

    // Handle conversation flow
    switch (currentState) {
      case 'idle':
        if (this.isMatchRequest(text)) {
          await this.startMatchingProcess(chatId, userId);
        } else {
          await this.sendHelpMessage(chatId);
        }
        break;

      case 'waiting_resume':
        if (['done', 'готово'].includes(text.trim().toLowerCase())) {
          await this.sessionService.updateState(userId, 'waiting_job_post');
          await this.telegramService.sendMessage({
            chat_id: chatId,
            text: '✅ Спасибо! Я получил ваше резюме. Теперь пришлите текст вакансии (можно в одном или нескольких сообщениях).',
          });
        } else {
          await this.handleResumeText(text, chatId, userId);
        }
        break;

      case 'waiting_job_post':
        await this.handleJobPostText(text, chatId, userId);
        break;

      case 'processing':
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: '⏳ Пожалуйста, подождите. Я всё ещё обрабатываю ваши документы...',
        });
        break;

      default:
        await this.sendHelpMessage(chatId);
    }
  }

  /**
   * Handle document uploads
   */
  private async handleDocumentMessage(
    message: TelegramMessage,
    currentState: string
  ): Promise<void> {
    const chatId = message.chat.id;
    const userId = message.from!.id;
    const document = message.document!;

    if (
      currentState !== 'waiting_resume' &&
      currentState !== 'waiting_job_post'
    ) {
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ Сейчас я не жду документ. Пожалуйста, начните с команды /resume_and_job_post_match',
      });
      return;
    }

    try {
      // Download and process document
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

      const processedDocument = await this.documentService.processDocument(
        fileContent,
        document.file_name,
        document.mime_type
      );

      if (!processedDocument) {
        throw new Error('Не удалось обработать документ');
      }

      const validation =
        this.documentService.validateDocument(processedDocument);
      if (!validation.isValid) {
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: `❌ ${validation.error}`,
        });
        return;
      }

      // Save document to session
      if (currentState === 'waiting_resume') {
        await this.sessionService.addResume(userId, processedDocument);
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: '✅ Resume file received. You can upload more files or paste more resume text. When finished, confirm below:',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Done with resume', callback_data: 'resume_done' },
                { text: '❌ Cancel', callback_data: 'cancel' },
              ],
            ],
          },
        });
      } else if (currentState === 'waiting_job_post') {
        // In the explicit-confirmation flow, any content here is treated as job post
        await this.sessionService.addJobPost(userId, processedDocument);
        await this.startAnalysis(chatId, userId);
      }
    } catch (error) {
      console.error('Error processing document:', error);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: `❌ Не получилось обработать документ: ${error}. Пожалуйста, попробуйте скопировать и вставить текст.`,
      });
    }
  }

  /**
   * Handle bot commands
   */
  private async handleCommand(
    fullText: string,
    chatId: number,
    userId: number
  ): Promise<void> {
    const parts = fullText.trim().split(/\s+/);
    const command = parts.length > 0 && parts[0] ? parts[0].toLowerCase() : '';
    switch (command) {
      case '/start':
        await this.sendWelcomeMessage(chatId);
        break;

      case '/resume_and_job_post_match':
        await this.startMatchingProcess(chatId, userId);
        break;

      case '/help':
        await this.sendHelpMessage(chatId);
        break;

      case '/cancel':
        await this.cancelCurrentProcess(chatId, userId);
        break;

      // Admin/Log commands (simplified - just ask for password)
      case '/get_last_10_messages':
      case '/logs':
        await this.handleSimpleLogCommand(fullText, chatId, userId, 10);
        break;

      case '/get_last_100_messages':
        await this.handleSimpleLogCommand(fullText, chatId, userId, 100);
        break;

      case '/get_last_300_messages':
        await this.handleSimpleLogCommand(fullText, chatId, userId, 300);
        break;

      case '/log_summary':
        await this.handleSimpleLogSummaryCommand(fullText, chatId, userId);
        break;

      case '/test_resume_match':
        await this.handleTestResumeMatch(chatId, userId);
        break;

      default:
        await this.sendHelpMessage(chatId);
    }
  }

  /**
   * Check if text is a matching request
   */
  private isMatchRequest(text: string): boolean {
    const lowerText = text.toLowerCase();
    const keywords = [
      'help match',
      'match resume',
      'compare resume',
      'analyze resume',
      'job match',
      'resume job',
      'check resume',
    ];
    return keywords.some((keyword) => lowerText.includes(keyword));
  }

  /**
   * Start the matching process
   */
  private async startMatchingProcess(
    chatId: number,
    userId: number
  ): Promise<void> {
    await this.sessionService.updateState(userId, 'waiting_resume');
    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: '📄 Я помогу проанализировать, насколько ваше резюме соответствует вакансии!\n\nПожалуйста, отправьте своё резюме. Можно:\n• Прикрепить файл или вставить текст в нескольких сообщениях\n\nКогда завершите отправку всех частей резюме, нажмите кнопку ниже «Готово с резюме» или напишите: \n\n✅ готово\n\nПосле этого я попрошу отправить текст вакансии.',
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
    try {
      const processedDocument = this.documentService.processTextInput(text);
      const validation =
        this.documentService.validateDocument(processedDocument);

      if (!validation.isValid) {
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: `❌ ${validation.error}`,
        });
        return;
      }

      // Append resume content while in waiting_resume
      const session = await this.sessionService.getSession(userId);
      if (session?.resume && session.state === 'waiting_resume') {
        const mergedText = `${session.resume.text}\n\n${processedDocument.text}`;
        const mergedResume = this.documentService.processTextInput(mergedText);
        const mergedValidation =
          this.documentService.validateDocument(mergedResume);
        if (!mergedValidation.isValid) {
          await this.telegramService.sendMessage({
            chat_id: chatId,
            text: `❌ ${mergedValidation.error}`,
          });
          return;
        }
        await this.sessionService.addResume(userId, mergedResume);
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: '🧩 Добавлено дополнительное содержимое резюме. Когда закончите, подтвердите ниже:',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Готово с резюме', callback_data: 'resume_done' },
                { text: '❌ Отмена', callback_data: 'cancel' },
              ],
            ],
          },
        });
        return;
      }

      await this.sessionService.addResume(userId, processedDocument);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '✅ Резюме получено. Вы можете отправить дополнительные части при необходимости. Когда закончите, подтвердите ниже:',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Готово с резюме', callback_data: 'resume_done' },
              { text: '❌ Отмена', callback_data: 'cancel' },
            ],
          ],
        },
      });
    } catch (error) {
      console.error('Error processing resume text:', error);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ Не получилось обработать текст. Пожалуйста, попробуйте ещё раз.',
      });
    }
  }

  /**
   * Handle job post text input
   */
  private async handleJobPostText(
    text: string,
    chatId: number,
    userId: number
  ): Promise<void> {
    try {
      const processedDocument = this.documentService.processTextInput(text);
      const validation =
        this.documentService.validateDocument(processedDocument);

      if (!validation.isValid) {
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: `❌ ${validation.error}`,
        });
        return;
      }

      // In explicit-confirmation mode, anything here is treated as job post
      await this.sessionService.addJobPost(userId, processedDocument);
      await this.startAnalysis(chatId, userId);
    } catch (error) {
      console.error('Error processing job post text:', error);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: "❌ Sorry, I couldn't process that text. Please try again.",
      });
    }
  }

  /**
   * Start AI analysis using enhanced service
   */
  private async startAnalysis(chatId: number, userId: number): Promise<void> {
    try {
      // Fetch session with retries to handle KV eventual consistency after recent writes
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
      let session = await this.sessionService.getSession(userId);
      let attempt = 0;
      const maxAttempts = 5; // ~3 seconds total with exponential backoff
      while ((!session?.resume || !session?.jobPost) && attempt < maxAttempts) {
        await delay(200 * Math.pow(2, attempt));
        attempt++;
        session = await this.sessionService.getSession(userId);
      }

      if (!session?.resume || !session?.jobPost) {
        // If still missing, guide the user and return without failing the whole flow
        const missing = !session?.resume ? 'резюме' : 'текст вакансии';
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: `❌ Не хватает данных: ${missing}. Пожалуйста, отправьте ${missing}, чтобы начать анализ.`,
        });
        // Put the session back into the appropriate waiting state
        await this.sessionService.updateState(
          userId,
          !session?.resume ? 'waiting_resume' : 'waiting_job_post'
        );
        return;
      }

      // Announce analysis only after we've confirmed both documents are present
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '🔄 Выполняю комплексный анализ резюме...\n\nБудет проанализировано:\n• Заголовки и должности\n• Совпадение навыков\n• Соответствие опыта\n• Условия работы\n\nЭто может занять 60–90 секунд.',
      });

      console.log('Starting enhanced analysis for user:', userId);
      const enhancedAnalysis =
        await this.enhancedAIService.analyzeResumeJobMatch(
          session.resume,
          session.jobPost
        );

      if (!enhancedAnalysis) {
        throw new Error('Enhanced analysis failed');
      }

      await this.sendEnhancedAnalysisResults(chatId, enhancedAnalysis);
      await this.sessionService.completeSession(userId);
    } catch (error) {
      console.error('Error during enhanced analysis:', error);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text:
          '❌ Анализ не удался. Пожалуйста, попробуйте позже.\n\nДетали ошибки: ' +
          (error as Error).message,
      });
      await this.sessionService.completeSession(userId);
    }
  }

  /**
   * Send enhanced analysis results
   */
  private async sendEnhancedAnalysisResults(
    chatId: number,
    analysis: EnhancedAnalysis
  ): Promise<void> {
    // Send summary first
    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: `📊 **КОМПЛЕКСНЫЙ АНАЛИЗ РЕЗЮМЕ**\n\n${analysis.summary}\n\n📈 **Итоговая оценка соответствия: ${analysis.overallScore}/100**`,
      parse_mode: 'Markdown',
    });

    // Send detailed breakdown in separate messages to avoid length limits
    await this.sendHeadlineAnalysis(chatId, analysis.headlines);
    await this.sendSkillsAnalysis(chatId, analysis.skills);
    await this.sendExperienceAnalysis(chatId, analysis.experience);
    await this.sendJobConditionsAnalysis(chatId, analysis.jobConditions);

    // Send final message
    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: '💡 **Хотите проанализировать другую вакансию?** Отправьте команду /resume_and_job_post_match ещё раз!\n\n🔬 **Для теста** можно использовать файлы из папки /tests.',
    });
  }

  /**
   * Send headline analysis details
   */
  private async sendHeadlineAnalysis(
    chatId: number,
    headlines: HeadlineAnalysis
  ): Promise<void> {
    const message = `🏷️ **АНАЛИЗ ЗАГОЛОВКОВ** (${headlines.matchScore}/100)

**Название вакансии:** ${headlines.jobTitle}
**Ваши должности:** ${headlines.candidateTitles.join(', ')}

**Анализ:** ${headlines.explanation}

${headlines.problems.length > 0 ? `🚨 **Проблемы:**\n${headlines.problems.map((p: string) => `• ${p}`).join('\n')}` : ''}

${headlines.recommendations.length > 0 ? `💡 **Рекомендации:**\n${headlines.recommendations.map((r: string) => `• ${r}`).join('\n')}` : ''}`;

    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    });
  }

  /**
   * Send skills analysis details
   */
  private async sendSkillsAnalysis(
    chatId: number,
    skills: SkillsAnalysis
  ): Promise<void> {
    const message = `🛠️ **АНАЛИЗ НАВЫКОВ** (${skills.matchScore}/100)

**Навыки из вакансии:** ${skills.requestedSkills.join(', ')}
**Ваши навыки:** ${skills.candidateSkills.join(', ')}
**✅ Совпадают:** ${skills.matchingSkills.join(', ')}
**❌ Отсутствуют:** ${skills.missingSkills.join(', ')}
**➕ Дополнительно:** ${skills.additionalSkills.join(', ')}

**Анализ:** ${skills.explanation}

${skills.problems.length > 0 ? `🚨 **Проблемы:**\n${skills.problems.map((p: string) => `• ${p}`).join('\n')}` : ''}

${skills.recommendations.length > 0 ? `💡 **Рекомендации:**\n${skills.recommendations.map((r: string) => `• ${r}`).join('\n')}` : ''}`;

    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    });
  }

  /**
   * Send experience analysis details
   */
  private async sendExperienceAnalysis(
    chatId: number,
    experience: ExperienceAnalysis
  ): Promise<void> {
    const seniorityEmoji =
      experience.seniorityMatch === 'perfect-match'
        ? '✅'
        : experience.seniorityMatch === 'over-qualified'
          ? '⬆️'
          : '⬇️';
    const seniorityText =
      experience.seniorityMatch === 'perfect-match'
        ? 'идеальное соответствие'
        : experience.seniorityMatch === 'over-qualified'
          ? 'переквалифицирован'
          : 'недостаточный уровень';

    const message = `💼 **АНАЛИЗ ОПЫТА** (${experience.experienceMatch}/100)

**Ваш опыт:** ${experience.candidateExperience.join(', ')}
**Требования вакансии:** ${experience.jobRequirements.join(', ')}

**Соответствие уровню:** ${seniorityEmoji} ${seniorityText}
${experience.seniorityExplanation}

**Количественное соответствие:** ${experience.quantityMatch}/100
${experience.quantityExplanation}

**Анализ:** ${experience.explanation}

${experience.problems.length > 0 ? `🚨 **Проблемы:**\n${experience.problems.map((p: string) => `• ${p}`).join('\n')}` : ''}

${experience.recommendations.length > 0 ? `💡 **Рекомендации:**\n${experience.recommendations.map((r: string) => `• ${r}`).join('\n')}` : ''}`;

    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    });
  }

  /**
   * Send job conditions analysis details
   */
  private async sendJobConditionsAnalysis(
    chatId: number,
    conditions: JobConditionsAnalysis
  ): Promise<void> {
    const locationEmoji = conditions.location.compatible ? '✅' : '❌';
    const salaryEmoji = conditions.salary.compatible ? '✅' : '❌';
    const scheduleEmoji = conditions.schedule.compatible ? '✅' : '❌';
    const formatEmoji = conditions.workFormat.compatible ? '✅' : '❌';

    const message = `📍 **АНАЛИЗ УСЛОВИЙ РАБОТЫ** (${conditions.overallScore}/100)

${locationEmoji} **Локация:** ${conditions.location.jobLocation} vs ${conditions.location.candidateLocation}
${conditions.location.explanation}

${salaryEmoji} **Зарплата:** ${conditions.salary.jobSalary} vs ${conditions.salary.candidateExpectation}
${conditions.salary.explanation}

${scheduleEmoji} **График:** ${conditions.schedule.jobSchedule} vs ${conditions.schedule.candidatePreference}
${conditions.schedule.explanation}

${formatEmoji} **Формат работы:** ${conditions.workFormat.jobFormat} vs ${conditions.workFormat.candidatePreference}
${conditions.workFormat.explanation}

**Общая оценка:** ${conditions.explanation}`;

    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    });
  }

  /**
   * Handle test resume match command - uses test files for analysis
   */
  private async handleTestResumeMatch(
    chatId: number,
    _userId: number
  ): Promise<void> {
    try {
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '🧪 **ЗАПУСК ТЕСТОВОГО АНАЛИЗА**\n\nИспользуются тестовые файлы резюме и вакансии...\n\nЭто продемонстрирует возможности комплексного анализа.',
      });

      // Load test files (these should be the test files you provided)
      const testResume = this.documentService.processTextInput(
        this.getTestResumeText()
      );
      const testJobPost = this.documentService.processTextInput(
        this.getTestJobPostText()
      );

      console.log('Running test analysis with enhanced AI service...');
      const enhancedAnalysis =
        await this.enhancedAIService.analyzeResumeJobMatch(
          testResume,
          testJobPost
        );

      if (!enhancedAnalysis) {
        throw new Error('Test analysis failed');
      }

      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '✅ **ТЕСТОВЫЙ АНАЛИЗ ЗАВЕРШЁН**\n\nНиже результаты с использованием расширенного анализа:',
      });

      await this.sendEnhancedAnalysisResults(chatId, enhancedAnalysis);
    } catch (error) {
      console.error('Error during test analysis:', error);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text:
          '❌ Тестовый анализ завершился ошибкой: ' + (error as Error).message,
      });
    }
  }

  /**
   * Get test resume text
   */
  private getTestResumeText(): string {
    return `Мужчина
Продакт-менеджер
40 лет  •  Был вчера
350 000 ₽
Активно ищет работу
Есть подтверждённые навыки
Последнее место работы
ITV
Ведущий продакт-менеджер  •  Декабрь 2019 — по настоящее время
- налаживание и поддержка горизонтальных связей между командами, формирование проектных команд для решения задач.
- управление командой разработчиков.
- формирование видения одного из основных продуктов компании и его стратегии развития на основе агрегированной информации и данных, от партнеров, клиентов - рынка в целом.
- управление процессами продуктовой разработки от выявления потребности до анализа результатов.
- прямое и матричное управление командами разработки, QA, PM, взаимодействие с командами Support, project managers, marketing, коммерческим департамента. Со специалистами технологических, коммерческих партнёров и конечных клиентов различного уровня.
- наставничество junior product managers
- Распределение задач в команде проекта
- Конкретизация целей проекта совместно с заказчиком и заинтересованными сторонами
- Ведение повседневных встреч, совещаний и обсуждений в команде
- Распределение ролей и ответственности в проектной команде
- Внедрение Agile- и Scrum-принципов и процессов на уровне подразделения или компании
- Доработка и развитие продукта после его запуска
- Постановка задач команде разработки на реализацию или доработку программного продукта
- Формирование, декомпозиция и актуализация бэклога задач проекта

- развитие и создание b2b2c – on premise и cloud продуктов для CCTV и SAS
- разработка, управление, приоритизация и внедрение гипотез и продуктов
- оценка, проработка, мониторинг и контроль внедрения новых функций, и обновление существующего функционала продуктов:
Адаптация системы дашбордов для задач ритейла, интеграция с кассовым ПО и ПО автоматизации.
Разработка бридж решения для подключения камер и кассовых терминалов к облачной инфраструктуре
Разработка новой архитектуры VMS продукта, на базе требований рынка и новых требований интегрированных решений
Cоздание Cloud платформы для построения Vsas для партнеров компании на базе существующего продукта, включая: общую архитектуру продукта, frontend и backend, личный кабинет, disaster recovery, multi tenancy, систему оперативных отчетов и аудита действий пользователя, оптимизацию процесса создания камер и инстансов, подготовку маркетинговых материалов и разработку концепции продаж платформы. На данный момент к Vsas платформам, развернутым на базе партнеров, в том числе телеком провайдеров по всему миру, подключено несколько тысяч устройств. Среди них один из крупнейших телеком провайдеров Израиля.
Гражданство
Россия
Регион и переезд
Москва`;
  }

  /**
   * Get test job post text
   */
  private getTestJobPostText(): string {
    return `Ведущий менеджер по продажам / Senior sales manager. Programmatic-iTV
Стандарт
Истекает 03.10
Москва·Опыт 3–6 лет·от 280 000 до 350 000 ₽ за месяц, на руки

Between Exchange – крупнейшая рекламная биржа. Поддерживаем SSP и DSP инвентарь на более чем 100 000 площадок. Рунет + Азия. На десктопе, в мобайле и Smart TV.

Обязанности:
Конакты, встречи, брифы, коммерческие предложения
Закрытие сделок

Требования:
опыт с tv-рекламой
опыт в продажах с длинным циклом сделки
Хорошо понимать где лежат и кем распределяются перфомансные, охватные и медийные бюджеты рекламодателей и рекламных агентств.
Иметь налаженные, идеально если дружеские отношения с лицами принимающими решения самого высокого уровня рекламных агентств и крупнейших рекламодателей (CEO, CMO, CPO, акционеры) и ТОП-менеджерами Tier 2, которые отвечают за заработок рекламных агентств

Условия:
Хороший оклад + процент с продаж
Оформление по тк рф

Ключевые навыки
B2B Продажи
Медийная реклама
Активные продажи
Digital Marketing
Консультативные продажи
Подготовка коммерческих предложений
Теплые продажи
SPIN-продажи
Консультирование клиентов

Где предстоит работать
Кузнецкий мост, Лубянка, Цветной бульвар, Москва, Трубная площадь`;
  }

  /**
   * Send welcome message
   */
  private async sendWelcomeMessage(chatId: number): Promise<void> {
    const sent = await this.telegramService.sendMessage({
      chat_id: chatId,
      text: '👋 Добро пожаловать в бота сопоставления резюме и вакансии!\n\nЯ помогу проанализировать соответствие вашего резюме описанию вакансии с помощью ИИ.\n\n🚀 Чтобы начать, отправьте:\n/resume_and_job_post_match\n\n❓ Нужна помощь? Отправьте /help',
    });
    if (sent) {
      await this.loggingService.logBotResponse(
        0,
        chatId,
        'Welcome message sent'
      );
    } else {
      await this.loggingService.logError(
        'SEND_MESSAGE_FAILED',
        'Failed to send welcome message',
        new Error('sendMessage returned false'),
        0,
        chatId
      );
    }
  }

  /**
   * Send help message
   */
  private async sendHelpMessage(chatId: number): Promise<void> {
    const sent = await this.telegramService.sendMessage({
      chat_id: chatId,
      text: '🤖 Команды бота сопоставления резюме\n\n/resume_and_job_post_match - начать анализ резюме и вакансии\n/help - показать эту справку\n/cancel - отменить текущий процесс\n\nИли просто отправьте любое сообщение, чтобы начать.',
    });
    if (sent) {
      await this.loggingService.logBotResponse(0, chatId, 'Help message sent');
    } else {
      await this.loggingService.logError(
        'SEND_MESSAGE_FAILED',
        'Failed to send help message',
        new Error('sendMessage returned false'),
        0,
        chatId
      );
    }
  }

  /**
   * Cancel current process
   */
  private async cancelCurrentProcess(
    chatId: number,
    userId: number
  ): Promise<void> {
    await this.sessionService.completeSession(userId);
    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: '✅ Процесс отменён. Вы можете начать новый анализ в любое время командой /resume_and_job_post_match',
    });
  }

  /**
   * Get environment-specific admin help message
   */
  private getAdminHelpMessage(command: string): string {
    let environmentInfo = '';

    if (this.environment === 'staging') {
      environmentInfo = `\n\n🔧 **Staging Environment**\nPassword: \`${this.adminPassword}\``;
    } else {
      environmentInfo =
        '\n\n🔒 **Secure Environment**\nAsk the developer for the password.';
    }

    return `🔑 **Admin Command Help**\n\nUsage: \`${command} <password>\`${environmentInfo}\n\n📋 **Available Commands:**\n• \`/get_last_10_messages <password>\`\n• \`/get_last_100_messages <password>\`\n• \`/log_summary <password>\``;
  }

  /**
   * Simple password check for admin commands
   */
  private checkPassword(password: string): boolean {
    return password === this.adminPassword;
  }

  /**
   * Get environment-specific invalid password message
   */
  private getInvalidPasswordMessage(): string {
    if (this.environment === 'staging') {
      return `❌ Invalid password for staging environment.\n\n🔑 **Staging Password**: \`${this.adminPassword}\`\n\n💡 For staging, use: \`/get_last_10_messages ${this.adminPassword}\``;
    } else if (this.environment === 'production') {
      return `❌ Invalid password for production environment.\n\n🔒 **Production Access**: Contact the developer for the secure password.`;
    } else {
      return `❌ Invalid password for development environment.\n\n🛠️ **Development Password**: \`${this.adminPassword}\``;
    }
  }

  /**
   * Handle simplified log command with inline password
   */
  private async handleSimpleLogCommand(
    fullText: string,
    chatId: number,
    userId: number,
    limit: number
  ): Promise<void> {
    try {
      // Parse command: /get_last_10_messages password
      const parts = fullText.trim().split(/\s+/);
      const password = parts[1];

      if (!password) {
        const helpMessage = this.getAdminHelpMessage(
          `/get_last_${limit}_messages`
        );
        const sent = await this.telegramService.sendMessage({
          chat_id: chatId,
          text: helpMessage,
        });
        if (sent) {
          await this.loggingService.logBotResponse(
            userId,
            chatId,
            'Admin help message'
          );
        } else {
          await this.loggingService.logError(
            'SEND_MESSAGE_FAILED',
            'Failed to send admin help message',
            new Error('sendMessage returned false'),
            userId,
            chatId
          );
        }
        return;
      }

      if (!this.checkPassword(password)) {
        const errorMessage = this.getInvalidPasswordMessage();
        const sent = await this.telegramService.sendMessage({
          chat_id: chatId,
          text: errorMessage,
        });
        if (sent) {
          await this.loggingService.logBotResponse(
            userId,
            chatId,
            errorMessage
          );
        } else {
          await this.loggingService.logError(
            'SEND_MESSAGE_FAILED',
            'Failed to send invalid password message',
            new Error('sendMessage returned false'),
            userId,
            chatId
          );
        }
        await this.loggingService.log(
          'WARN',
          'LOG_ACCESS_DENIED',
          'Invalid password for log access',
          { limit },
          userId,
          chatId
        );
        return;
      }

      // Send "loading" message
      const loadingSent = await this.telegramService.sendMessage({
        chat_id: chatId,
        text: `📊 Fetching last ${limit} log messages...`,
      });
      if (loadingSent) {
        await this.loggingService.logBotResponse(
          userId,
          chatId,
          `📊 Fetching last ${limit} log messages...`
        );
      } else {
        await this.loggingService.logError(
          'SEND_MESSAGE_FAILED',
          'Failed to send loading message',
          new Error('sendMessage returned false'),
          userId,
          chatId
        );
        return; // Don't continue if we can't send messages
      }

      // Get formatted logs
      const formattedLogs = await this.loggingService.getFormattedRecentLogs(
        limit,
        this.environment
      );

      // Send logs
      const logsSent = await this.telegramService.sendMessage({
        chat_id: chatId,
        text: formattedLogs,
      });
      if (logsSent) {
        await this.loggingService.logBotResponse(
          userId,
          chatId,
          'Log results sent'
        );
      } else {
        await this.loggingService.logError(
          'SEND_MESSAGE_FAILED',
          'Failed to send log results',
          new Error('sendMessage returned false'),
          userId,
          chatId
        );
      }

      // Log access
      await this.loggingService.log(
        'INFO',
        'LOG_ACCESS_SUCCESS',
        `Viewed last ${limit} messages`,
        { limit },
        userId,
        chatId
      );
    } catch (error) {
      await this.loggingService.logError(
        'LOG_ACCESS_ERROR',
        'Error viewing logs',
        error as Error,
        userId,
        chatId
      );
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ Error retrieving logs. Please try again.',
      });
    }
  }

  /**
   * Handle simplified log summary command with inline password
   */
  private async handleSimpleLogSummaryCommand(
    fullText: string,
    chatId: number,
    userId: number
  ): Promise<void> {
    try {
      // Parse command: /log_summary password
      const parts = fullText.trim().split(/\s+/);
      const password = parts[1];

      if (!password) {
        const helpMessage = this.getAdminHelpMessage('/log_summary');
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: helpMessage,
        });
        return;
      }

      if (!this.checkPassword(password)) {
        const errorMessage = this.getInvalidPasswordMessage();
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: errorMessage,
        });
        await this.loggingService.log(
          'WARN',
          'LOG_SUMMARY_ACCESS_DENIED',
          'Invalid password for log summary access',
          {},
          userId,
          chatId
        );
        return;
      }

      // Send "loading" message
      const loadingSent = await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '📊 Generating log summary...',
      });
      if (loadingSent) {
        await this.loggingService.logBotResponse(
          userId,
          chatId,
          '📊 Generating log summary...'
        );
      } else {
        await this.loggingService.logError(
          'SEND_MESSAGE_FAILED',
          'Failed to send loading message',
          new Error('sendMessage returned false'),
          userId,
          chatId
        );
        return; // Don't continue if we can't send messages
      }

      // Get log summary
      const summary = await this.loggingService.getAdminLogSummary(24);

      const summarySent = await this.telegramService.sendMessage({
        chat_id: chatId,
        text: summary,
      });
      if (summarySent) {
        await this.loggingService.logBotResponse(
          userId,
          chatId,
          'Log summary sent'
        );
      } else {
        await this.loggingService.logError(
          'SEND_MESSAGE_FAILED',
          'Failed to send log summary',
          new Error('sendMessage returned false'),
          userId,
          chatId
        );
      }

      // Log access
      await this.loggingService.log(
        'INFO',
        'LOG_SUMMARY_SUCCESS',
        'Viewed log summary',
        {},
        userId,
        chatId
      );
    } catch (error) {
      await this.loggingService.logError(
        'LOG_SUMMARY_ERROR',
        'Error generating log summary',
        error as Error,
        userId,
        chatId
      );
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ Error generating log summary. Please try again.',
      });
    }
  }
}
