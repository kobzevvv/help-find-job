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
  JobConditionsAnalysis 
} from '../types/session';
import { getStrings, formatTemplate } from '../i18n';

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
  async analyzeResumeJobMatch(resume: ProcessedDocument, jobPost: ProcessedDocument): Promise<EnhancedAnalysis | null> {
    try {
      console.log('Starting enhanced resume-job analysis...');
      
      // Run all analyses in parallel for efficiency
      const [headlinesResult, skillsResult, experienceResult, conditionsResult] = await Promise.all([
        this.analyzeHeadlines(resume, jobPost),
        this.analyzeSkills(resume, jobPost),
        this.analyzeExperience(resume, jobPost),
        this.analyzeJobConditions(resume, jobPost),
      ]);

      if (!headlinesResult || !skillsResult || !experienceResult || !conditionsResult) {
        console.error('One or more analyses failed');
        return null;
      }

      // Calculate overall score
      const overallScore = Math.round(
        (headlinesResult.matchScore + skillsResult.matchScore + experienceResult.experienceMatch + conditionsResult.overallScore) / 4
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
  private async analyzeHeadlines(resume: ProcessedDocument, jobPost: ProcessedDocument): Promise<HeadlineAnalysis | null> {
    const resumeText = this.truncateText(resume.text);
    const jobText = this.truncateText(jobPost.text);
    const strings = getStrings();
    const prompt = formatTemplate(strings.prompts.headlines, { resume: resumeText, job: jobText });

    const result = await this.callGPT(prompt, 'headlines');
    return result as HeadlineAnalysis | null;
  }

  /**
   * Analyze skills match with detailed breakdown
   */
  private async analyzeSkills(resume: ProcessedDocument, jobPost: ProcessedDocument): Promise<SkillsAnalysis | null> {
    const resumeText = this.truncateText(resume.text);
    const jobText = this.truncateText(jobPost.text);
    const strings = getStrings();
    const prompt = formatTemplate(strings.prompts.skills, { resume: resumeText, job: jobText });

    const result = await this.callGPT(prompt, 'skills');
    return result as SkillsAnalysis | null;
  }

  /**
   * Analyze experience with seniority and quantity assessment
   */
  private async analyzeExperience(resume: ProcessedDocument, jobPost: ProcessedDocument): Promise<ExperienceAnalysis | null> {
    const resumeText = this.truncateText(resume.text);
    const jobText = this.truncateText(jobPost.text);
    const strings = getStrings();
    const prompt = formatTemplate(strings.prompts.experience, { resume: resumeText, job: jobText });

    const result = await this.callGPT(prompt, 'experience');
    return result as ExperienceAnalysis | null;
  }

  /**
   * Analyze job conditions compatibility
   */
  private async analyzeJobConditions(resume: ProcessedDocument, jobPost: ProcessedDocument): Promise<JobConditionsAnalysis | null> {
    const resumeText = this.truncateText(resume.text);
    const jobText = this.truncateText(jobPost.text);
    const strings = getStrings();
    const prompt = formatTemplate(strings.prompts.conditions, { resume: resumeText, job: jobText });

    const result = await this.callGPT(prompt, 'conditions');
    return result as JobConditionsAnalysis | null;
  }

  /**
   * Call OpenAI GPT API with error handling
   */
  private async callGPT(prompt: string, category: string): Promise<any | null> {
    try {
      console.log(`Making GPT API call for ${category} analysis...`);
      const strings = getStrings();
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: strings.prompts.system
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          // Prefer JSON mode when supported by the model
          ...(this.supportsJsonMode() ? { response_format: { type: 'json_object' } } : {}),
          max_tokens: this.maxTokens,
          temperature: this.temperature,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenAI API error for ${category}:`, response.status, errorText);
        return null;
      }

      const data = await response.json() as any;
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
    } catch {}

    // Strip code fences if present
    const fencedMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/i);
    if (fencedMatch && fencedMatch[1]) {
      try {
        return JSON.parse(fencedMatch[1]);
      } catch (err) {
        console.error(`JSON parse failed for ${category} after removing code fences:`);
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
        console.error(`JSON slice parse failed for ${category}. Slice length: ${jsonSlice.length}`);
      }
    }

    console.error(`Failed to parse JSON for ${category}. Content preview:`, content.slice(0, 500));
    return null;
  }

  /**
   * Whether the current model supports response_format: json_object
   */
  private supportsJsonMode(): boolean {
    const m = (this.model || '').toLowerCase();
    return m.includes('gpt-4o') || m.includes('4.1') || m.includes('o3') || m.includes('mini');
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
      summary = '🎉 ОТЛИЧНОЕ СОВПАДЕНИЕ! Кандидат очень хорошо подходит на эту позицию.';
    } else if (overallScore >= 70) {
      summary = '👍 СИЛЬНОЕ СОВПАДЕНИЕ! Кандидат хорошо соответствует роли.';
    } else if (overallScore >= 55) {
      summary = '⚠️ СРЕДНЕЕ СОВПАДЕНИЕ. Есть зоны для улучшения, но потенциал есть.';
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
      ...experience.problems
    ];
    
    if (allProblems.length > 0) {
      summary += `\n\n🚨 **КЛЮЧЕВЫЕ ПРОБЛЕМЫ:**`;
      allProblems.slice(0, 3).forEach(problem => {
        summary += `\n• ${problem}`;
      });
    }

    // Top recommendations
    const allRecommendations = [
      ...headlines.recommendations,
      ...skills.recommendations,
      ...experience.recommendations
    ];
    
    if (allRecommendations.length > 0) {
      summary += `\n\n💡 **РЕКОМЕНДАЦИИ:**`;
      allRecommendations.slice(0, 3).forEach(rec => {
        summary += `\n• ${rec}`;
      });
    }

    return summary;
  }
}
