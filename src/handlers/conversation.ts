/**
 * Telegram conversation handlers
 */

import { TelegramMessage } from '../types/telegram';
import { SessionService } from '../services/session';
import { TelegramService } from '../services/telegram';
import { DocumentService } from '../services/document';
import { AIService } from '../services/ai';
import { LoggingService } from '../services/logging';

export class ConversationHandler {
  private sessionService: SessionService;
  private telegramService: TelegramService;
  private documentService: DocumentService;
  private aiService: AIService;
  private loggingService: LoggingService;
  private environment: string;
  private adminPassword: string;

  constructor(
    sessionService: SessionService,
    telegramService: TelegramService,
    documentService: DocumentService,
    aiService: AIService,
    loggingService: LoggingService,
    environment: string = 'development',
    adminPassword: string = 'defaultpassword'
  ) {
    this.sessionService = sessionService;
    this.telegramService = telegramService;
    this.documentService = documentService;
    this.aiService = aiService;
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

    if (!userId) {
      await this.loggingService.logError('INVALID_MESSAGE', 'No user ID in message', new Error('Missing user ID'), undefined, chatId);
      return;
    }

    const messageText = message.text || message.document?.file_name || 'non-text message';
    await this.loggingService.logUserMessage(userId, chatId, messageText, {
      messageId: message.message_id,
      messageType: message.text ? 'text' : message.document ? 'document' : 'other',
      documentInfo: message.document ? {
        fileName: message.document.file_name,
        mimeType: message.document.mime_type,
        fileSize: message.document.file_size
      } : undefined
    });

    try {
      // Get or create session
      let session = await this.sessionService.getSession(userId);
      if (!session) {
        await this.loggingService.log('INFO', 'NEW_SESSION', 'Creating new session for user', { userId, chatId });
        session = this.sessionService.createSession(
          userId,
          chatId,
          message.from?.language_code
        );
        await this.sessionService.saveSession(session);
      } else {
        await this.loggingService.log('DEBUG', 'SESSION_FOUND', `Found existing session in state: ${session.state}`, { 
          userId, 
          chatId, 
          currentState: session.state,
          sessionAge: new Date().getTime() - new Date(session.createdAt).getTime()
        });
      }

      // Handle different message types based on session state
      if (message.text) {
        await this.handleTextMessage(message, session.state);
      } else if (message.document) {
        await this.handleDocumentMessage(message, session.state);
      } else {
        await this.loggingService.log('WARN', 'UNSUPPORTED_MESSAGE', 'Received unsupported message type', { messageType: typeof message }, userId, chatId);
        await this.sendHelpMessage(chatId);
      }

    } catch (error) {
      await this.loggingService.logError('MESSAGE_HANDLER_ERROR', 'Error in message handler', error as Error, userId, chatId);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ Sorry, something went wrong. Please try again.',
      });
    }
  }

  /**
   * Handle text messages
   */
  private async handleTextMessage(message: TelegramMessage, currentState: string): Promise<void> {
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
        await this.handleResumeText(text, chatId, userId);
        break;

      case 'waiting_job_post':
        await this.handleJobPostText(text, chatId, userId);
        break;

      case 'processing':
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: '⏳ Please wait, I\'m still processing your documents...',
        });
        break;

      default:
        await this.sendHelpMessage(chatId);
    }
  }

  /**
   * Handle document uploads
   */
  private async handleDocumentMessage(message: TelegramMessage, currentState: string): Promise<void> {
    const chatId = message.chat.id;
    const userId = message.from!.id;
    const document = message.document!;

    if (currentState !== 'waiting_resume' && currentState !== 'waiting_job_post') {
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ I\'m not expecting a document right now. Please start with /resume_and_job_post_match',
      });
      return;
    }

    try {
      // Download and process document
      const fileInfo = await this.telegramService.getFile(document.file_id);
      if (!fileInfo?.file_path) {
        throw new Error('Could not get file information');
      }

      const fileContent = await this.telegramService.downloadFile(fileInfo.file_path);
      if (!fileContent) {
        throw new Error('Could not download file');
      }

      const processedDocument = await this.documentService.processDocument(
        fileContent,
        document.file_name,
        document.mime_type
      );

      if (!processedDocument) {
        throw new Error('Could not process document');
      }

      const validation = this.documentService.validateDocument(processedDocument);
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
          text: '✅ Resume received! Now please send me the job posting (you can copy and paste the text).',
        });
      } else if (currentState === 'waiting_job_post') {
        await this.sessionService.addJobPost(userId, processedDocument);
        await this.startAnalysis(chatId, userId);
      }

    } catch (error) {
      console.error('Error processing document:', error);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: `❌ Sorry, I couldn't process that document: ${error}. Please try copying and pasting the text instead.`,
      });
    }
  }

  /**
   * Handle bot commands
   */
  private async handleCommand(fullText: string, chatId: number, userId: number): Promise<void> {
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
      'help match', 'match resume', 'compare resume', 'analyze resume',
      'job match', 'resume job', 'check resume'
    ];
    return keywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Start the matching process
   */
  private async startMatchingProcess(chatId: number, userId: number): Promise<void> {
    await this.sessionService.updateState(userId, 'waiting_resume');
    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: '📄 I\'ll help you analyze how well your resume matches a job description!\n\nPlease send me your resume first. You can:\n• Upload a PDF or DOCX file\n• Copy and paste the text directly\n\n💡 Tip: Text format usually works better!',
    });
  }

  /**
   * Handle resume text input
   */
  private async handleResumeText(text: string, chatId: number, userId: number): Promise<void> {
    try {
      const processedDocument = this.documentService.processTextInput(text);
      const validation = this.documentService.validateDocument(processedDocument);

      if (!validation.isValid) {
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: `❌ ${validation.error}`,
        });
        return;
      }

      await this.sessionService.addResume(userId, processedDocument);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '✅ Resume received! Now please send me the job posting text.',
      });

    } catch (error) {
      console.error('Error processing resume text:', error);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ Sorry, I couldn\'t process that text. Please try again.',
      });
    }
  }

  /**
   * Handle job post text input
   */
  private async handleJobPostText(text: string, chatId: number, userId: number): Promise<void> {
    try {
      const processedDocument = this.documentService.processTextInput(text);
      const validation = this.documentService.validateDocument(processedDocument);

      if (!validation.isValid) {
        await this.telegramService.sendMessage({
          chat_id: chatId,
          text: `❌ ${validation.error}`,
        });
        return;
      }

      await this.sessionService.addJobPost(userId, processedDocument);
      await this.startAnalysis(chatId, userId);

    } catch (error) {
      console.error('Error processing job post text:', error);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ Sorry, I couldn\'t process that text. Please try again.',
      });
    }
  }

  /**
   * Start AI analysis
   */
  private async startAnalysis(chatId: number, userId: number): Promise<void> {
    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: '🔄 Analyzing your resume against the job requirements...\n\nThis may take 30-60 seconds.',
    });

    try {
      const session = await this.sessionService.getSession(userId);
      if (!session?.resume || !session?.jobPost) {
        throw new Error('Missing resume or job post data');
      }

      const analysis = await this.aiService.analyzeMatch(session.resume, session.jobPost);
      if (!analysis) {
        throw new Error('Analysis failed');
      }

      await this.sendAnalysisResults(chatId, analysis);
      await this.sessionService.completeSession(userId);

    } catch (error) {
      console.error('Error during analysis:', error);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ Sorry, the analysis failed. Please try again later.',
      });
      await this.sessionService.completeSession(userId);
    }
  }

  /**
   * Send analysis results
   */
  private async sendAnalysisResults(chatId: number, analysis: any): Promise<void> {
    const message = `📊 **ANALYSIS RESULTS**

${analysis.summary}

📄 **General Matching**: ${analysis.general.score}/100
✅ Strengths: ${analysis.general.strengths.join(', ')}
⚠️ Improvements: ${analysis.general.improvements.join(', ')}

🛠️ **Skills Analysis**: ${analysis.skills.score}/100
✅ Strengths: ${analysis.skills.strengths.join(', ')}
⚠️ Improvements: ${analysis.skills.improvements.join(', ')}

💼 **Experience Evaluation**: ${analysis.experience.score}/100
✅ Strengths: ${analysis.experience.strengths.join(', ')}
⚠️ Improvements: ${analysis.experience.improvements.join(', ')}

📈 **Overall Match Score: ${analysis.overallScore}/100**

💡 Want to analyze another job posting? Just send /resume_and_job_post_match again!`;

    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    });
  }

  /**
   * Send welcome message
   */
  private async sendWelcomeMessage(chatId: number): Promise<void> {
    const sent = await this.telegramService.sendMessage({
      chat_id: chatId,
      text: '👋 Welcome to Resume Matcher Bot!\n\nI help you analyze how well your resume matches job descriptions using AI.\n\n🚀 To get started, send:\n/resume_and_job_post_match\n\n❓ Need help? Send /help',
    });
    if (sent) {
      await this.loggingService.logBotResponse(0, chatId, 'Welcome message sent');
    } else {
      await this.loggingService.logError('SEND_MESSAGE_FAILED', 'Failed to send welcome message', new Error('sendMessage returned false'), 0, chatId);
    }
  }

  /**
   * Send help message
   */
  private async sendHelpMessage(chatId: number): Promise<void> {
    const sent = await this.telegramService.sendMessage({
      chat_id: chatId,
      text: '🤖 Resume Matcher Bot Commands\n\n/resume_and_job_post_match - Start resume analysis\n/help - Show this help message\n/cancel - Cancel current process\n\nOr just type "help match resume" to get started!',
    });
    if (sent) {
      await this.loggingService.logBotResponse(0, chatId, 'Help message sent');
    } else {
      await this.loggingService.logError('SEND_MESSAGE_FAILED', 'Failed to send help message', new Error('sendMessage returned false'), 0, chatId);
    }
  }

  /**
   * Cancel current process
   */
  private async cancelCurrentProcess(chatId: number, userId: number): Promise<void> {
    await this.sessionService.completeSession(userId);
    await this.telegramService.sendMessage({
      chat_id: chatId,
      text: '✅ Process cancelled. You can start a new analysis anytime with /resume_and_job_post_match',
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
      environmentInfo = '\n\n🔒 **Secure Environment**\nAsk the developer for the password.';
    }

    return `🔑 **Admin Command Help**\n\nUsage: \`${command} <password>\`${environmentInfo}\n\n📋 **Available Commands:**\n• \`/get_last_10_messages <password>\`\n• \`/get_last_100_messages <password>\`\n• \`/log_summary <password>\``;
  }

  /**
   * Simple password check for admin commands
   */
  private checkPassword(password: string): boolean {
    const isValid = password === this.adminPassword;
    console.log(`[DEBUG] Password check: provided="${password}", expected="${this.adminPassword}", valid=${isValid}`);
    return isValid;
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
  private async handleSimpleLogCommand(fullText: string, chatId: number, userId: number, limit: number): Promise<void> {
    try {
      console.log(`[DEBUG] Admin command: ${fullText}, environment: ${this.environment}, adminPassword: ${this.adminPassword}`);
      
      // Parse command: /get_last_10_messages password
      const parts = fullText.trim().split(/\s+/);
      const password = parts[1];

      if (!password) {
        const helpMessage = this.getAdminHelpMessage(`/get_last_${limit}_messages`);
        const sent = await this.telegramService.sendMessage({
          chat_id: chatId,
          text: helpMessage,
        });
        if (sent) {
          await this.loggingService.logBotResponse(userId, chatId, 'Admin help message');
        } else {
          await this.loggingService.logError('SEND_MESSAGE_FAILED', 'Failed to send admin help message', new Error('sendMessage returned false'), userId, chatId);
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
          await this.loggingService.logBotResponse(userId, chatId, errorMessage);
        } else {
          await this.loggingService.logError('SEND_MESSAGE_FAILED', 'Failed to send invalid password message', new Error('sendMessage returned false'), userId, chatId);
        }
        await this.loggingService.log('WARN', 'LOG_ACCESS_DENIED', 'Invalid password for log access', { limit }, userId, chatId);
        return;
      }

      // Send "loading" message
      const loadingSent = await this.telegramService.sendMessage({
        chat_id: chatId,
        text: `📊 Fetching last ${limit} log messages...`,
      });
      if (loadingSent) {
        await this.loggingService.logBotResponse(userId, chatId, `📊 Fetching last ${limit} log messages...`);
      } else {
        await this.loggingService.logError('SEND_MESSAGE_FAILED', 'Failed to send loading message', new Error('sendMessage returned false'), userId, chatId);
        return; // Don't continue if we can't send messages
      }

      // Get formatted logs
      const formattedLogs = await this.loggingService.getFormattedRecentLogs(limit, this.environment);

      // Send logs
      const logsSent = await this.telegramService.sendMessage({
        chat_id: chatId,
        text: formattedLogs,
      });
      if (logsSent) {
        await this.loggingService.logBotResponse(userId, chatId, 'Log results sent');
      } else {
        await this.loggingService.logError('SEND_MESSAGE_FAILED', 'Failed to send log results', new Error('sendMessage returned false'), userId, chatId);
      }

      // Log access
      await this.loggingService.log('INFO', 'LOG_ACCESS_SUCCESS', `Viewed last ${limit} messages`, { limit }, userId, chatId);

    } catch (error) {
      await this.loggingService.logError('LOG_ACCESS_ERROR', 'Error viewing logs', error as Error, userId, chatId);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ Error retrieving logs. Please try again.',
      });
    }
  }

  /**
   * Handle simplified log summary command with inline password
   */
  private async handleSimpleLogSummaryCommand(fullText: string, chatId: number, userId: number): Promise<void> {
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
        await this.loggingService.log('WARN', 'LOG_SUMMARY_ACCESS_DENIED', 'Invalid password for log summary access', {}, userId, chatId);
        return;
      }

      // Send "loading" message
      const loadingSent = await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '📊 Generating log summary...',
      });
      if (loadingSent) {
        await this.loggingService.logBotResponse(userId, chatId, '📊 Generating log summary...');
      } else {
        await this.loggingService.logError('SEND_MESSAGE_FAILED', 'Failed to send loading message', new Error('sendMessage returned false'), userId, chatId);
        return; // Don't continue if we can't send messages
      }

      // Get log summary
      const summary = await this.loggingService.getAdminLogSummary(24);

      const summarySent = await this.telegramService.sendMessage({
        chat_id: chatId,
        text: summary,
      });
      if (summarySent) {
        await this.loggingService.logBotResponse(userId, chatId, 'Log summary sent');
      } else {
        await this.loggingService.logError('SEND_MESSAGE_FAILED', 'Failed to send log summary', new Error('sendMessage returned false'), userId, chatId);
      }

      // Log access
      await this.loggingService.log('INFO', 'LOG_SUMMARY_SUCCESS', 'Viewed log summary', {}, userId, chatId);

    } catch (error) {
      await this.loggingService.logError('LOG_SUMMARY_ERROR', 'Error generating log summary', error as Error, userId, chatId);
      await this.telegramService.sendMessage({
        chat_id: chatId,
        text: '❌ Error generating log summary. Please try again.',
      });
    }
  }
}
