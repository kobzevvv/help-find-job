/**
 * AI analysis service using OpenAI GPT
 */

import {
  AnalysisResult,
  CompleteAnalysis,
  ProcessedDocument,
} from '../types/session';

export class AIService {
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(
    apiKey: string,
    model: string = 'gpt-4',
    maxTokens: number = 1500,
    temperature: number = 0.3
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.maxTokens = maxTokens;
    this.temperature = temperature;
  }

  /**
   * Analyze resume against job posting
   */
  async analyzeMatch(
    resume: ProcessedDocument,
    jobPost: ProcessedDocument
  ): Promise<CompleteAnalysis | null> {
    try {
      // Run all three analyses in parallel for speed
      const [generalResult, skillsResult, experienceResult] = await Promise.all(
        [
          this.analyzeGeneral(resume, jobPost),
          this.analyzeSkills(resume, jobPost),
          this.analyzeExperience(resume, jobPost),
        ]
      );

      if (!generalResult || !skillsResult || !experienceResult) {
        return null;
      }

      // Calculate overall score
      const overallScore = Math.round(
        (generalResult.score + skillsResult.score + experienceResult.score) / 3
      );

      // Generate summary
      const summary = this.generateSummary(
        overallScore,
        generalResult,
        skillsResult,
        experienceResult
      );

      return {
        overallScore,
        general: generalResult,
        skills: skillsResult,
        experience: experienceResult,
        summary,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error in AI analysis:', error);
      return null;
    }
  }

  /**
   * Analyze general document alignment
   */
  private async analyzeGeneral(
    resume: ProcessedDocument,
    jobPost: ProcessedDocument
  ): Promise<AnalysisResult | null> {
    const prompt = `
Analyze how well this resume's GENERAL formatting and structure aligns with this job posting.

RESUME:
${resume.text}

JOB POSTING:
${jobPost.text}

Evaluate ONLY:
- Document structure and formatting
- Professional presentation
- Contact information clarity
- Overall organization
- Writing quality

Provide your analysis in this EXACT JSON format:
{
  "score": [number from 0-100],
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2"],
  "recommendations": ["recommendation1", "recommendation2"]
}
`;

    return await this.callGPT(prompt, 'general');
  }

  /**
   * Analyze skills match
   */
  private async analyzeSkills(
    resume: ProcessedDocument,
    jobPost: ProcessedDocument
  ): Promise<AnalysisResult | null> {
    const prompt = `
Analyze how well the SKILLS in this resume match the job requirements.

RESUME:
${resume.text}

JOB POSTING:
${jobPost.text}

Evaluate ONLY:
- Technical skills alignment
- Required vs. possessed skills
- Skill gaps and overlaps
- Skill levels and proficiency
- Relevant certifications

Provide your analysis in this EXACT JSON format:
{
  "score": [number from 0-100],
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2"],
  "recommendations": ["recommendation1", "recommendation2"]
}
`;

    return await this.callGPT(prompt, 'skills');
  }

  /**
   * Analyze experience match
   */
  private async analyzeExperience(
    resume: ProcessedDocument,
    jobPost: ProcessedDocument
  ): Promise<AnalysisResult | null> {
    const prompt = `
Analyze how well the WORK EXPERIENCE in this resume matches the job requirements.

RESUME:
${resume.text}

JOB POSTING:
${jobPost.text}

Evaluate ONLY:
- Relevant work experience
- Job responsibilities alignment
- Career progression
- Industry experience
- Achievement relevance

Provide your analysis in this EXACT JSON format:
{
  "score": [number from 0-100],
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2"],
  "recommendations": ["recommendation1", "recommendation2"]
}
`;

    return await this.callGPT(prompt, 'experience');
  }

  /**
   * Call OpenAI GPT API
   */
  private async callGPT(
    prompt: string,
    category: string
  ): Promise<AnalysisResult | null> {
    try {
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
                  'You are an expert resume and job matching analyst. Always respond with valid JSON only.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            max_tokens: this.maxTokens,
            temperature: this.temperature,
          }),
        }
      );

      if (!response.ok) {
        console.error(
          'OpenAI API error:',
          response.status,
          await response.text()
        );
        return null;
      }

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.error('No content in OpenAI response');
        return null;
      }

      // Parse JSON response
      const result = JSON.parse(content);

      return {
        category: category as 'general' | 'skills' | 'experience',
        score: result.score || 0,
        strengths: result.strengths || [],
        improvements: result.improvements || [],
        recommendations: result.recommendations || [],
      };
    } catch (error) {
      console.error(`Error in ${category} analysis:`, error);
      return null;
    }
  }

  /**
   * Generate overall summary
   */
  private generateSummary(
    overallScore: number,
    general: AnalysisResult,
    skills: AnalysisResult,
    experience: AnalysisResult
  ): string {
    let summary = '';

    if (overallScore >= 80) {
      summary =
        '🎉 Excellent match! Your resume aligns very well with this job posting.';
    } else if (overallScore >= 60) {
      summary =
        '👍 Good match! Your resume shows strong potential for this role.';
    } else if (overallScore >= 40) {
      summary =
        '⚠️ Moderate match. Some areas need improvement to better align with this role.';
    } else {
      summary =
        '❌ Low match. Significant improvements needed to align with this job posting.';
    }

    // Add specific insights
    const categories = [general, skills, experience];
    const topCategory = categories.sort((a, b) => b.score - a.score)[0];
    const lowestCategory = categories.sort((a, b) => a.score - b.score)[0];

    if (topCategory && lowestCategory) {
      summary += `\n\n💪 Strongest area: ${topCategory.category} (${topCategory.score}/100)`;
      summary += `\n🎯 Focus on improving: ${lowestCategory.category} (${lowestCategory.score}/100)`;
    }

    return summary;
  }
}
