import type {
  CareerModel,
  JobFitAnalysis,
  ResumeScore,
  RecruiterAnswer,
} from '../../shared/types.js';

export class RecruiterChatService {
  constructor(private claudeService: any) {}

  async answerQuestion(
    questionId: string,
    careerModel: CareerModel,
    jobDescription: string,
    score: ResumeScore,
    fit: JobFitAnalysis
  ): Promise<RecruiterAnswer> {
    const questionMap: {
      [key: string]: { question: string; prompt: string };
    } = {
      worry: {
        question: 'What would worry a recruiter?',
        prompt: `You are a hiring manager screening this candidate for: "${jobDescription.split('\\n')[0] || 'this role'}"

RESUME SUMMARY:
Name: ${careerModel.fullName}
Current Role: ${careerModel.sections.experience?.[0]?.title || 'Not specified'}
Years of Experience: ${(careerModel.sections.experience?.length || 1) * 3}
Key Skills: ${(careerModel.sections.skills || []).slice(0, 5).join(', ')}

SCORE: ${score.total}/100 | FIT: ${fit.overallFit}%

CRITICAL: After scanning this resume, what specific concerns would prevent you from moving forward? Be direct and specific.

{
  "answer": "I would be concerned about...",
  "risks": ["specific concern 1", "specific concern 2"],
  "suggestedChanges": [{"target": "skills|summary|experience", "operation": "add|modify", "value": "specific change", "reasoning": "why this helps"}],
  "followUpQuestions": ["verification question"],
  "confidence": 0.8
}`,
      },
      weakest: {
        question: 'Where is my resume weakest?',
        prompt: `You are reviewing this resume against: "${jobDescription.split('\\n')[0] || 'the job description'}"

CANDIDATE: ${careerModel.fullName}
SCORE: ${score.total}/100

Which 2-3 sections hurt this resume the most for THIS job? Rank by impact.

{
  "answer": "The biggest weaknesses are: 1) ..., 2) ...",
  "risks": ["weakness that could trigger immediate rejection", "concern that raises questions"],
  "suggestedChanges": [{"target": "section", "operation": "modify", "value": "how to fix", "reasoning": "impact on fit"}],
  "followUpQuestions": ["what would help address this?"],
  "confidence": 0.85
}`,
      },
      interview: {
        question: 'Would this likely get an interview?',
        prompt: `You are screening resumes for: "${jobDescription.split('\\n')[0] || 'this role'}"

CANDIDATE: ${careerModel.fullName}
SCORE: ${score.total}/100 | FIT: ${fit.overallFit}% | ESTIMATED PHONE SCREEN: ${fit.likelihood.phoneScreen.toFixed(0)}%

Your gut: Would you phone screen this person?

{
  "answer": "Yes/No. Reasons: ...",
  "risks": ["blocker if any", "concern that might kill it"],
  "suggestedChanges": [{"target": "section", "operation": "add|modify", "value": "would change yes to maybe", "reasoning": "impact"}],
  "followUpQuestions": ["question you'd ask on phone screen"],
  "confidence": 0.9
}`,
      },
      'improve-first': {
        question: 'What should I improve first?',
        prompt: `You are a career strategist. What single improvement would have the most impact?

Resume Score: ${score.total}/100
Rejection Risks: ${fit.rejectionRisks.join(', ')}

Career:
${JSON.stringify(careerModel, null, 2)}

Job:
${jobDescription}

Prioritize improvements by impact:
{
  "answer": "Focus on improving... because...",
  "risks": [...],
  "suggestedChanges": [...highest impact first...],
  "followUpQuestions": [...],
  "confidence": 0.85
}`,
      },
    };

    const config = questionMap[questionId] || questionMap.worry;

    const answer = await this.claudeService.generateWithSchema(
      config.prompt,
      {
        type: 'object',
        properties: {
          answer: { type: 'string' },
          risks: { type: 'array', items: { type: 'string' } },
          suggestedChanges: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                target: {
                  type: 'string',
                  enum: ['skills', 'summary', 'experience', 'education'],
                },
                operation: { type: 'string', enum: ['add', 'remove', 'modify'] },
                value: { type: 'string' },
                reasoning: { type: 'string' },
              },
              required: ['target', 'operation', 'value', 'reasoning'],
            },
          },
          followUpQuestions: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: [
          'answer',
          'risks',
          'suggestedChanges',
          'followUpQuestions',
          'confidence',
        ],
      }
    );

    return {
      question: config.question,
      ...answer,
    };
  }
}
