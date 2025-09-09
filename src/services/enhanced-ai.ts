/**
 * Enhanced AI analysis service for detailed resume-job matching
 * Uses GPT-3.5 for cost-effective analysis with comprehensive breakdown
 */

import {
  ProcessedDocument,
  EnhancedAnalysis,
  HeadlineAnalysis,
  SkillsAnalysis,
  ExperienceAnalysis,
  JobConditionsAnalysis,
} from '../types/session';

export class EnhancedAIService {
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private readonly maxInputChars: number = 20000;

  constructor(
    apiKey: string,
    model: string = 'gpt-3.5-turbo', // Default to cheaper model
    maxTokens: number = 2000,
    temperature: number = 0.3
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.maxTokens = maxTokens;
    this.temperature = temperature;
  }

  /**
   * Perform comprehensive resume-job post analysis
   */
  async analyzeResumeJobMatch(
    resume: ProcessedDocument,
    jobPost: ProcessedDocument
  ): Promise<EnhancedAnalysis | null> {
    try {
      console.log('Starting enhanced resume-job analysis...');

      // Run all analyses in parallel for efficiency
      const [
        headlinesResult,
        skillsResult,
        experienceResult,
        conditionsResult,
      ] = await Promise.all([
        this.analyzeHeadlines(resume, jobPost),
        this.analyzeSkills(resume, jobPost),
        this.analyzeExperience(resume, jobPost),
        this.analyzeJobConditions(resume, jobPost),
      ]);

      if (
        !headlinesResult ||
        !skillsResult ||
        !experienceResult ||
        !conditionsResult
      ) {
        console.error('One or more analyses failed');
        return null;
      }

      // Calculate overall score
      const overallScore = Math.round(
        (headlinesResult.matchScore +
          skillsResult.matchScore +
          experienceResult.experienceMatch +
          conditionsResult.overallScore) /
          4
      );

      // Generate comprehensive summary
      const summary = this.generateComprehensiveSummary(
        overallScore,
        headlinesResult,
        skillsResult,
        experienceResult,
        conditionsResult
      );

      const analysis: EnhancedAnalysis = {
        overallScore,
        headlines: headlinesResult,
        skills: skillsResult,
        experience: experienceResult,
        jobConditions: conditionsResult,
        summary,
        processedAt: new Date().toISOString(),
      };

      console.log('Enhanced analysis completed successfully');
      return analysis;
    } catch (error) {
      console.error('Error in enhanced AI analysis:', error);
      return null;
    }
  }

  /**
   * Analyze job title vs candidate experience titles
   */
  private async analyzeHeadlines(
    resume: ProcessedDocument,
    jobPost: ProcessedDocument
  ): Promise<HeadlineAnalysis | null> {
    const resumeText = this.truncateText(resume.text);
    const jobText = this.truncateText(jobPost.text);
    const prompt = `
Проанализируй соответствие НАЗВАНИЯ ВАКАНСИИ и ДОЛЖНОСТЕЙ в резюме и вакансии.

РЕЗЮМЕ:
${resumeText}

ВАКАНСИЯ:
${jobText}

Твоя задача:
1. Выделить основное название вакансии
2. Выделить все должности из резюме кандидата
3. Оценить, насколько хорошо совпадают названия
4. Указать конкретные проблемы соответствия
5. Дать рекомендации

Фокус только на названиях должностей. Учитывай:
- Иерархию и уровень seniority
- Соответствие терминологии в индустрии
- Близость по функциям роли
- Карьерное развитие в названиях

Ответь строго в формате JSON:
{
  "jobTitle": "точное название из вакансии",
  "candidateTitles": ["должность1", "должность2", "должность3"],
  "matchScore": 0-100,
  "explanation": "подробное объяснение соответствия названий",
  "problems": ["проблема1", "проблема2"],
  "recommendations": ["рекомендация1", "рекомендация2"]
}
`;

    const result = await this.callGPT(prompt, 'headlines');
    return result as HeadlineAnalysis | null;
  }

  /**
   * Analyze skills match with detailed breakdown
   */
  private async analyzeSkills(
    resume: ProcessedDocument,
    jobPost: ProcessedDocument
  ): Promise<SkillsAnalysis | null> {
    const resumeText = this.truncateText(resume.text);
    const jobText = this.truncateText(jobPost.text);
    const prompt = `
Проанализируй соответствие НАВЫКОВ между резюме и вакансией с подробной структурой.

РЕЗЮМЕ:
${resumeText}

ВАКАНСИЯ:
${jobText}

Твоя задача:
1. Выделить навыки, явно запрошенные в вакансии
2. Выделить навыки, указанные в резюме кандидата
3. Определить совпадающие навыки
4. Определить отсутствующие навыки (запрошены, но не найдены)
5. Определить дополнительные навыки (есть у кандидата, но не запрошены)
6. Объяснить пробелы в навыках и проблемы
7. Дать рекомендации по развитию навыков

Фокус только на профессиональных и технических навыках. Учитывай:
- Обязательные и желательные навыки
- Требуемый уровень
- Соответствие технологического стека
- Отраслевые навыки

Ответь строго в формате JSON:
{
  "requestedSkills": ["навык1", "навык2", "навык3"],
  "candidateSkills": ["навык1", "навык2", "навык3"],
  "matchingSkills": ["навык1", "навык2"],
  "missingSkills": ["отсутствует1", "отсутствует2"],
  "additionalSkills": ["доп1", "доп2"],
  "matchScore": 0-100,
  "explanation": "подробное объяснение соответствия навыков",
  "problems": ["проблема1", "проблема2"],
  "recommendations": ["рекомендация1", "рекомендация2"]
}
`;

    const result = await this.callGPT(prompt, 'skills');
    return result as SkillsAnalysis | null;
  }

  /**
   * Analyze experience with seniority and quantity assessment
   */
  private async analyzeExperience(
    resume: ProcessedDocument,
    jobPost: ProcessedDocument
  ): Promise<ExperienceAnalysis | null> {
    const resumeText = this.truncateText(resume.text);
    const jobText = this.truncateText(jobPost.text);
    const prompt = `
Проанализируй соответствие ОПЫТА РАБОТЫ между резюме и вакансией с оценкой уровня (seniority).

РЕЗЮМЕ:
${resumeText}

ВАКАНСИЯ:
${jobText}

Твоя задача:
1. Выделить, что кандидат делал раньше (опыт)
2. Выделить, что требуется делать в вакансии (обязанности)
3. Оценить соответствие по количеству и качеству опыта
4. Оценить соответствие уровня (under-qualified, perfect-match, over-qualified)
5. Объяснить соответствие и пробелы
6. Дать рекомендации по развитию опыта

Учитывай:
- Годы релевантного опыта
- Уровень ответственности и масштаб
- Релевантность индустрии
- Качество достижений и влияние
- Лидерский/управленческий опыт
- Карьерный рост

Ответь строго в формате JSON:
{
  "candidateExperience": ["опыт1", "опыт2", "опыт3"],
  "jobRequirements": ["требование1", "требование2", "требование3"],
  "experienceMatch": 0-100,
  "seniorityMatch": "under-qualified" | "perfect-match" | "over-qualified",
  "seniorityExplanation": "подробное объяснение оценки уровня",
  "quantityMatch": 0-100,
  "quantityExplanation": "объяснение количественной оценки",
  "explanation": "подробное объяснение соответствия опыта",
  "problems": ["проблема1", "проблема2"],
  "recommendations": ["рекомендация1", "рекомендация2"]
}
`;

    const result = await this.callGPT(prompt, 'experience');
    return result as ExperienceAnalysis | null;
  }

  /**
   * Analyze job conditions compatibility
   */
  private async analyzeJobConditions(
    resume: ProcessedDocument,
    jobPost: ProcessedDocument
  ): Promise<JobConditionsAnalysis | null> {
    const resumeText = this.truncateText(resume.text);
    const jobText = this.truncateText(jobPost.text);
    const prompt = `
Проанализируй СОВМЕСТИМОСТЬ УСЛОВИЙ РАБОТЫ между резюме и вакансией.

РЕЗЮМЕ:
${resumeText}

ВАКАНСИЯ:
${jobText}

Нужно выделить и сравнить:
1. Требования к локации vs локация кандидата
2. Вилка зарплаты vs ожидания кандидата (если упомянуто)
3. График работы vs предпочтения кандидата
4. Формат работы (удалённо/гибрид/офис) vs предпочтения кандидата

Ищи явные упоминания:
- География: город, страна
- Вилки зарплат, ожидания по компенсации
- Часы работы, гибкость графика
- Политики удалённой работы, требования посещения офиса

Ответь строго в формате JSON:
{
  "location": {
    "jobLocation": "локация из вакансии",
    "candidateLocation": "локация из резюме",
    "compatible": true/false,
    "explanation": "объяснение совместимости по локации"
  },
  "salary": {
    "jobSalary": "вилка зарплаты из вакансии",
    "candidateExpectation": "ожидания по зарплате из резюме",
    "compatible": true/false,
    "explanation": "объяснение совместимости по зарплате"
  },
  "schedule": {
    "jobSchedule": "график из вакансии",
    "candidatePreference": "предпочтения по графику из резюме",
    "compatible": true/false,
    "explanation": "объяснение совместимости по графику"
  },
  "workFormat": {
    "jobFormat": "формат работы из вакансии",
    "candidatePreference": "предпочтения по формату из резюме",
    "compatible": true/false,
    "explanation": "объяснение совместимости по формату"
  },
  "overallScore": 0-100,
  "explanation": "общая оценка условий"
}
`;

    const result = await this.callGPT(prompt, 'conditions');
    return result as JobConditionsAnalysis | null;
  }

  /**
   * Call OpenAI GPT API with error handling
   */
  private async callGPT(prompt: string, category: string): Promise<any | null> {
    try {
      console.log(`Making GPT API call for ${category} analysis...`);

      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              {
                role: 'system',
                content:
                  'Ты эксперт по HR и анализу резюме. Отвечай ТОЛЬКО валидным JSON без лишнего текста. Будь подробным и конкретным.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            // Prefer JSON mode when supported by the model
            ...(this.supportsJsonMode()
              ? { response_format: { type: 'json_object' } }
              : {}),
            max_tokens: this.maxTokens,
            temperature: this.temperature,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `OpenAI API error for ${category}:`,
          response.status,
          errorText
        );
        return null;
      }

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.error(`No content in OpenAI response for ${category}`);
        return null;
      }

      // Parse JSON response with error handling and code-fence support
      const parsed = this.parseJsonContent(content, category);
      if (parsed !== null) {
        console.log(`Successfully parsed ${category} analysis result`);
        return parsed;
      }
      return null;
    } catch (error) {
      console.error(`Error in ${category} analysis:`, error);
      return null;
    }
  }

  /**
   * Attempt to parse JSON from model output, handling code fences and extra text
   */
  private parseJsonContent(content: string, category: string): any | null {
    // Fast path
    try {
      return JSON.parse(content);
    } catch {
      // Will try alternative parsing methods below
    }

    // Strip code fences if present
    const fencedMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/i);
    if (fencedMatch && fencedMatch[1]) {
      try {
        return JSON.parse(fencedMatch[1]);
      } catch (err) {
        console.error(
          `JSON parse failed for ${category} after removing code fences:`
        );
      }
    }

    // Try to extract the largest JSON object substring
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonSlice = content.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonSlice);
      } catch (err) {
        console.error(
          `JSON slice parse failed for ${category}. Slice length: ${jsonSlice.length}`
        );
      }
    }

    console.error(
      `Failed to parse JSON for ${category}. Content preview:`,
      content.slice(0, 500)
    );
    return null;
  }

  /**
   * Whether the current model supports response_format: json_object
   */
  private supportsJsonMode(): boolean {
    const m = (this.model || '').toLowerCase();
    return (
      m.includes('gpt-4o') ||
      m.includes('4.1') ||
      m.includes('o3') ||
      m.includes('mini')
    );
  }

  /**
   * Truncate very long inputs to reduce token usage and avoid API errors
   */
  private truncateText(text: string): string {
    if (!text) return '';
    if (text.length <= this.maxInputChars) return text;
    const truncated = text.slice(0, this.maxInputChars);
    return `${truncated}`;
  }

  /**
   * Generate comprehensive summary
   */
  private generateComprehensiveSummary(
    overallScore: number,
    headlines: HeadlineAnalysis,
    skills: SkillsAnalysis,
    experience: ExperienceAnalysis,
    conditions: JobConditionsAnalysis
  ): string {
    let summary = '';

    // Overall assessment
    if (overallScore >= 85) {
      summary =
        '🎉 ОТЛИЧНОЕ СОВПАДЕНИЕ! Кандидат очень хорошо подходит на эту позицию.';
    } else if (overallScore >= 70) {
      summary = '👍 СИЛЬНОЕ СОВПАДЕНИЕ! Кандидат хорошо соответствует роли.';
    } else if (overallScore >= 55) {
      summary =
        '⚠️ СРЕДНЕЕ СОВПАДЕНИЕ. Есть зоны для улучшения, но потенциал есть.';
    } else if (overallScore >= 40) {
      summary = '❌ СЛАБОЕ СОВПАДЕНИЕ. Требуются существенные корректировки.';
    } else {
      summary = '🚫 НИЗКОЕ СОВПАДЕНИЕ. Кандидат не подходит для этой позиции.';
    }

    // Detailed breakdown
    summary += `\n\n📊 **ПОДРОБНЫЙ РАЗБОР:**`;
    summary += `\n• **Заголовки**: ${headlines.matchScore}/100 - ${headlines.explanation}`;
    summary += `\n• **Навыки**: ${skills.matchScore}/100 - отсутствует навыков: ${skills.missingSkills.length}`;
    summary += `\n• **Опыт**: ${experience.experienceMatch}/100 - ${experience.seniorityMatch}`;
    summary += `\n• **Условия**: ${conditions.overallScore}/100 - локация, зарплата, график`;

    // Top problems
    const allProblems = [
      ...headlines.problems,
      ...skills.problems,
      ...experience.problems,
    ];

    if (allProblems.length > 0) {
      summary += `\n\n🚨 **КЛЮЧЕВЫЕ ПРОБЛЕМЫ:**`;
      allProblems.slice(0, 3).forEach((problem) => {
        summary += `\n• ${problem}`;
      });
    }

    // Top recommendations
    const allRecommendations = [
      ...headlines.recommendations,
      ...skills.recommendations,
      ...experience.recommendations,
    ];

    if (allRecommendations.length > 0) {
      summary += `\n\n💡 **РЕКОМЕНДАЦИИ:**`;
      allRecommendations.slice(0, 3).forEach((rec) => {
        summary += `\n• ${rec}`;
      });
    }

    return summary;
  }
}
