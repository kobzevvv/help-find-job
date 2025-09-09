/**
 * Telegram Bot API service
 */

import { SendMessageOptions, TelegramFile } from '../types/telegram';

// Telegram API response interface
interface TelegramApiResponse<T> {
  ok: boolean;
  result: T;
}

// Webhook payload interface
interface WebhookPayload {
  url: string;
  secret_token?: string;
}

export class TelegramService {
  private botToken: string;
  private baseUrl: string;

  constructor(botToken: string) {
    this.botToken = botToken;
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
  }

  /**
   * Send a text message to a chat
   */
  async sendMessage(options: SendMessageOptions): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to send message:', errorText);
        console.error(
          'Chat ID:',
          options.chat_id,
          'Text length:',
          options.text?.length
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  /**
   * Get file information from Telegram
   */
  async getFile(fileId: string): Promise<TelegramFile | null> {
    try {
      const response = await fetch(`${this.baseUrl}/getFile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_id: fileId }),
      });

      if (!response.ok) {
        console.error('Failed to get file info:', await response.text());
        return null;
      }

      const data = (await response.json()) as TelegramApiResponse<TelegramFile>;
      return data.result;
    } catch (error) {
      console.error('Error getting file info:', error);
      return null;
    }
  }

  /**
   * Download file content from Telegram
   */
  async downloadFile(filePath: string): Promise<ArrayBuffer | null> {
    try {
      const fileUrl = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
      const response = await fetch(fileUrl);

      if (!response.ok) {
        console.error('Failed to download file:', response.statusText);
        return null;
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('Error downloading file:', error);
      return null;
    }
  }

  /**
   * Set webhook URL
   */
  async setWebhook(url: string, secretToken?: string): Promise<boolean> {
    try {
      const payload: WebhookPayload = { url };
      if (secretToken) {
        payload.secret_token = secretToken;
      }

      const response = await fetch(`${this.baseUrl}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('Failed to set webhook:', await response.text());
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error setting webhook:', error);
      return false;
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/deleteWebhook`, {
        method: 'POST',
      });

      if (!response.ok) {
        console.error('Failed to delete webhook:', await response.text());
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting webhook:', error);
      return false;
    }
  }
}
