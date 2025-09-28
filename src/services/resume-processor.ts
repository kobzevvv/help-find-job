/**
 * Resume Processor Service
 * Handles communication with external resume processing API
 */

// Types for the external API
interface ProcessResumeRequest {
  resume_text: string;
  language?: string;
  options?: {
    include_unmapped?: boolean;
    strict_validation?: boolean;
  };
}

interface Skill {
  name: string;
  level: 1 | 2 | 3 | 4 | 5;
  label?: 'basic' | 'limited' | 'proficient' | 'advanced' | 'expert';
  type?:
    | 'programming_language'
    | 'spoken_language'
    | 'framework'
    | 'tool'
    | 'domain'
    | 'methodology'
    | 'soft_skill'
    | 'other';
  notes?: string;
}

interface Experience {
  employer?: string;
  title: string;
  start: string; // YYYY-MM format
  end?: string | 'present' | 'Present' | null;
  description: string;
  location?: string;
}

interface LocationPreference {
  type?: 'remote' | 'hybrid' | 'onsite';
  preferred_locations?: string[];
}

interface SalaryExpectation {
  currency: string;
  min?: number;
  max?: number;
  periodicity: 'year' | 'month' | 'day' | 'hour' | 'project';
  notes?: string;
}

interface Link {
  label: string;
  url: string;
}

interface StructuredResumeData {
  version?: string;
  desired_titles: string[];
  summary: string;
  skills: (Skill | string)[];
  experience: Experience[];
  location_preference?: LocationPreference;
  schedule?:
    | 'full_time'
    | 'part_time'
    | 'contract'
    | 'freelance'
    | 'internship'
    | 'temporary';
  salary_expectation?: SalaryExpectation;
  availability?: string;
  links?: Link[];
}

interface ProcessResumeResponse {
  success: boolean;
  data: StructuredResumeData | null;
  unmapped_fields: string[];
  errors: string[];
  processing_time_ms: number;
  metadata?: {
    worker_version: string;
    ai_model_used: string;
    timestamp: string;
  };
}

export class ResumeProcessorService {
  private apiUrl: string;

  constructor(
    apiUrl: string = 'https://resume-processor-worker.dev-a96.workers.dev'
  ) {
    this.apiUrl = apiUrl;
  }

  /**
   * Process resume text and return structured data
   */
  async processResume(
    resumeText: string,
    language: string = 'ru', // Default to Russian as requested
    options: ProcessResumeRequest['options'] = {}
  ): Promise<ProcessResumeResponse> {
    const requestBody: ProcessResumeRequest = {
      resume_text: resumeText,
      language,
      options: {
        include_unmapped: true,
        strict_validation: false,
        ...options,
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('API call timeout triggered');
        controller.abort();
      }, 10000); // 10 second timeout

      const response = await fetch(`${this.apiUrl}/process-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ProcessResumeResponse = await response.json();
      return result;
    } catch (error) {
      console.error('Error calling resume processor API:', error);

      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timeout - service took too long to respond';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        data: null,
        unmapped_fields: [],
        errors: [errorMessage],
        processing_time_ms: 0,
      };
    }
  }

  /**
   * Check if the resume processor service is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check

      const response = await fetch(`${this.apiUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as { status: string };
      return data.status === 'healthy';
    } catch (error) {
      console.error('Error checking resume processor health:', error);
      return false;
    }
  }

  /**
   * Format structured resume data for display
   */
  formatStructuredResume(data: StructuredResumeData): string {
    let formatted = '📋 **Структурированное резюме:**\n\n';

    // Desired titles
    if (data.desired_titles && data.desired_titles.length > 0) {
      formatted += `🎯 **Желаемые позиции:**\n${data.desired_titles.join(', ')}\n\n`;
    }

    // Summary
    if (data.summary) {
      formatted += `📝 **Краткое резюме:**\n${data.summary}\n\n`;
    }

    // Skills
    if (data.skills && data.skills.length > 0) {
      formatted += `🛠️ **Навыки:**\n`;
      data.skills.forEach((skill) => {
        if (typeof skill === 'string') {
          formatted += `• ${skill}\n`;
        } else {
          const levelLabel =
            skill.label || this.getSkillLevelLabel(skill.level);
          formatted += `• ${skill.name} (${levelLabel})`;
          if (skill.notes) {
            formatted += ` - ${skill.notes}`;
          }
          formatted += '\n';
        }
      });
      formatted += '\n';
    }

    // Experience
    if (data.experience && data.experience.length > 0) {
      formatted += `💼 **Опыт работы:**\n`;
      data.experience.forEach((exp, index) => {
        formatted += `${index + 1}. **${exp.title}**`;
        if (exp.employer) {
          formatted += ` в ${exp.employer}`;
        }
        formatted += ` (${exp.start} - ${exp.end || 'настоящее время'})\n`;
        if (exp.location) {
          formatted += `   📍 ${exp.location}\n`;
        }
        formatted += `   ${exp.description}\n\n`;
      });
    }

    // Location preference
    if (data.location_preference) {
      formatted += `📍 **Предпочтения по локации:**\n`;
      formatted += `Тип: ${this.getLocationTypeLabel(data.location_preference.type)}\n`;
      if (
        data.location_preference.preferred_locations &&
        data.location_preference.preferred_locations.length > 0
      ) {
        formatted += `Предпочтительные локации: ${data.location_preference.preferred_locations.join(', ')}\n\n`;
      }
    }

    // Schedule
    if (data.schedule) {
      formatted += `⏰ **График работы:** ${this.getScheduleLabel(data.schedule)}\n\n`;
    }

    // Salary expectation
    if (data.salary_expectation) {
      formatted += `💰 **Ожидания по зарплате:**\n`;
      if (data.salary_expectation.min && data.salary_expectation.max) {
        formatted += `${data.salary_expectation.min} - ${data.salary_expectation.max} ${data.salary_expectation.currency}/${this.getPeriodicityLabel(data.salary_expectation.periodicity)}\n`;
      } else if (data.salary_expectation.min) {
        formatted += `от ${data.salary_expectation.min} ${data.salary_expectation.currency}/${this.getPeriodicityLabel(data.salary_expectation.periodicity)}\n`;
      } else if (data.salary_expectation.max) {
        formatted += `до ${data.salary_expectation.max} ${data.salary_expectation.currency}/${this.getPeriodicityLabel(data.salary_expectation.periodicity)}\n`;
      }
      if (data.salary_expectation.notes) {
        formatted += `Примечания: ${data.salary_expectation.notes}\n`;
      }
      formatted += '\n';
    }

    // Availability
    if (data.availability) {
      formatted += `📅 **Доступность:** ${data.availability}\n\n`;
    }

    // Links
    if (data.links && data.links.length > 0) {
      formatted += `🔗 **Ссылки:**\n`;
      data.links.forEach((link) => {
        formatted += `• ${link.label}: ${link.url}\n`;
      });
    }

    return formatted;
  }

  private getSkillLevelLabel(level: number): string {
    const labels = {
      1: 'Начальный',
      2: 'Ограниченный',
      3: 'Уверенный',
      4: 'Продвинутый',
      5: 'Экспертный',
    };
    return labels[level as keyof typeof labels] || 'Неизвестный';
  }

  private getLocationTypeLabel(type?: string): string {
    const labels = {
      remote: 'Удаленная работа',
      hybrid: 'Гибридная работа',
      onsite: 'Офисная работа',
    };
    return labels[type as keyof typeof labels] || 'Не указано';
  }

  private getScheduleLabel(schedule: string): string {
    const labels = {
      full_time: 'Полная занятость',
      part_time: 'Частичная занятость',
      contract: 'Контракт',
      freelance: 'Фриланс',
      internship: 'Стажировка',
      temporary: 'Временная работа',
    };
    return labels[schedule as keyof typeof labels] || schedule;
  }

  private getPeriodicityLabel(periodicity: string): string {
    const labels = {
      year: 'год',
      month: 'месяц',
      day: 'день',
      hour: 'час',
      project: 'проект',
    };
    return labels[periodicity as keyof typeof labels] || periodicity;
  }
}

// Export types for use in other modules
export type {
  Experience,
  Link,
  LocationPreference,
  ProcessResumeResponse,
  SalaryExpectation,
  Skill,
  StructuredResumeData,
};
