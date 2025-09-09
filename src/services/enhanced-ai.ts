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

export class EnhancedAIService {
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;

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
    const prompt = `
Analyze the JOB TITLE and POSITION TITLES match between this resume and job posting.

RESUME:
${resume.text}

JOB POSTING:
${jobPost.text}

Your task is to:
1. Extract the main job title from the job posting
2. Extract all position titles from the candidate's resume
3. Evaluate how well the titles match
4. Identify specific problems with title alignment
5. Provide recommendations

Focus ONLY on job titles and position names. Consider:
- Title hierarchy and seniority level
- Industry terminology alignment
- Role function similarity
- Career progression shown in titles

Respond in this EXACT JSON format:
{
  "jobTitle": "exact job title from posting",
  "candidateTitles": ["title1", "title2", "title3"],
  "matchScore": 0-100,
  "explanation": "detailed explanation of title alignment",
  "problems": ["problem1", "problem2"],
  "recommendations": ["recommendation1", "recommendation2"]
}
`;

    const result = await this.callGPT(prompt, 'headlines');
    return result as HeadlineAnalysis | null;
  }

  /**
   * Analyze skills match with detailed breakdown
   */
  private async analyzeSkills(resume: ProcessedDocument, jobPost: ProcessedDocument): Promise<SkillsAnalysis | null> {
    const prompt = `
Analyze the SKILLS match between this resume and job posting with detailed breakdown.

RESUME:
${resume.text}

JOB POSTING:
${jobPost.text}

Your task is to:
1. Extract all explicitly requested skills from the job posting
2. Extract all skills mentioned in the candidate's resume
3. Identify matching skills
4. Identify missing skills (requested but not found)
5. Identify additional skills (candidate has but not requested)
6. Explain skill gaps and problems
7. Provide skill development recommendations

Focus ONLY on technical and professional skills. Consider:
- Required vs. nice-to-have skills
- Skill level requirements
- Technology stack alignment
- Industry-specific skills

Respond in this EXACT JSON format:
{
  "requestedSkills": ["skill1", "skill2", "skill3"],
  "candidateSkills": ["skill1", "skill2", "skill3"],
  "matchingSkills": ["skill1", "skill2"],
  "missingSkills": ["missing1", "missing2"],
  "additionalSkills": ["extra1", "extra2"],
  "matchScore": 0-100,
  "explanation": "detailed explanation of skills alignment",
  "problems": ["problem1", "problem2"],
  "recommendations": ["recommendation1", "recommendation2"]
}
`;

    const result = await this.callGPT(prompt, 'skills');
    return result as SkillsAnalysis | null;
  }

  /**
   * Analyze experience with seniority and quantity assessment
   */
  private async analyzeExperience(resume: ProcessedDocument, jobPost: ProcessedDocument): Promise<ExperienceAnalysis | null> {
    const prompt = `
Analyze the WORK EXPERIENCE match between this resume and job posting with seniority assessment.

RESUME:
${resume.text}

JOB POSTING:
${jobPost.text}

Your task is to:
1. Extract what the candidate has done (past experience)
2. Extract what the job requires them to do (future responsibilities)
3. Evaluate experience quantity and quality match
4. Assess seniority level match (under-qualified, perfect-match, over-qualified)
5. Explain experience alignment and gaps
6. Provide experience development recommendations

Consider:
- Years of relevant experience
- Responsibility level and scope
- Industry experience relevance
- Achievement quality and impact
- Leadership/management experience
- Career progression

Respond in this EXACT JSON format:
{
  "candidateExperience": ["experience1", "experience2", "experience3"],
  "jobRequirements": ["requirement1", "requirement2", "requirement3"],
  "experienceMatch": 0-100,
  "seniorityMatch": "under-qualified" | "perfect-match" | "over-qualified",
  "seniorityExplanation": "detailed explanation of seniority assessment",
  "quantityMatch": 0-100,
  "quantityExplanation": "explanation of experience quantity assessment",
  "explanation": "detailed explanation of experience alignment",
  "problems": ["problem1", "problem2"],
  "recommendations": ["recommendation1", "recommendation2"]
}
`;

    const result = await this.callGPT(prompt, 'experience');
    return result as ExperienceAnalysis | null;
  }

  /**
   * Analyze job conditions compatibility
   */
  private async analyzeJobConditions(resume: ProcessedDocument, jobPost: ProcessedDocument): Promise<JobConditionsAnalysis | null> {
    const prompt = `
Analyze JOB CONDITIONS compatibility between this resume and job posting.

RESUME:
${resume.text}

JOB POSTING:
${jobPost.text}

Your task is to extract and compare:
1. Location requirements vs candidate location
2. Salary range vs candidate expectations (if mentioned)
3. Work schedule vs candidate preferences
4. Work format (remote/hybrid/onsite) vs candidate preferences

Look for explicit mentions of:
- Geographic location, city, country
- Salary ranges, compensation expectations
- Working hours, schedule flexibility
- Remote work policies, office requirements

Respond in this EXACT JSON format:
{
  "location": {
    "jobLocation": "location from job posting",
    "candidateLocation": "location from resume",
    "compatible": true/false,
    "explanation": "explanation of location compatibility"
  },
  "salary": {
    "jobSalary": "salary range from job posting",
    "candidateExpectation": "salary expectation from resume",
    "compatible": true/false,
    "explanation": "explanation of salary compatibility"
  },
  "schedule": {
    "jobSchedule": "schedule from job posting",
    "candidatePreference": "schedule preference from resume",
    "compatible": true/false,
    "explanation": "explanation of schedule compatibility"
  },
  "workFormat": {
    "jobFormat": "work format from job posting",
    "candidatePreference": "work format preference from resume",
    "compatible": true/false,
    "explanation": "explanation of work format compatibility"
  },
  "overallScore": 0-100,
  "explanation": "overall job conditions assessment"
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
              content: 'You are an expert HR professional and resume analyst. Always respond with valid JSON only. Be thorough and specific in your analysis.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
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

      // Parse JSON response with error handling
      try {
        const result = JSON.parse(content);
        console.log(`Successfully parsed ${category} analysis result`);
        return result;
      } catch (parseError) {
        console.error(`Failed to parse JSON for ${category}:`, parseError);
        console.error('Raw content:', content);
        return null;
      }

    } catch (error) {
      console.error(`Error in ${category} analysis:`, error);
      return null;
    }
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
      summary = '🎉 EXCELLENT MATCH! This candidate is highly suitable for this position.';
    } else if (overallScore >= 70) {
      summary = '👍 STRONG MATCH! This candidate shows good alignment with the role.';
    } else if (overallScore >= 55) {
      summary = '⚠️ MODERATE MATCH. Some areas need attention but candidate has potential.';
    } else if (overallScore >= 40) {
      summary = '❌ WEAK MATCH. Significant gaps need to be addressed.';
    } else {
      summary = '🚫 POOR MATCH. This candidate is not suitable for this position.';
    }

    // Detailed breakdown
    summary += `\n\n📊 **DETAILED BREAKDOWN:**`;
    summary += `\n• **Headlines**: ${headlines.matchScore}/100 - ${headlines.explanation}`;
    summary += `\n• **Skills**: ${skills.matchScore}/100 - ${skills.missingSkills.length} missing skills`;
    summary += `\n• **Experience**: ${experience.experienceMatch}/100 - ${experience.seniorityMatch}`;
    summary += `\n• **Conditions**: ${conditions.overallScore}/100 - Location, salary, schedule compatibility`;

    // Top problems
    const allProblems = [
      ...headlines.problems,
      ...skills.problems,
      ...experience.problems
    ];
    
    if (allProblems.length > 0) {
      summary += `\n\n🚨 **KEY ISSUES:**`;
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
      summary += `\n\n💡 **RECOMMENDATIONS:**`;
      allRecommendations.slice(0, 3).forEach(rec => {
        summary += `\n• ${rec}`;
      });
    }

    return summary;
  }
}
