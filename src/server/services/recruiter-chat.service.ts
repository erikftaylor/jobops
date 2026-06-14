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
        prompt: `You are an expert recruiter reviewing this resume for the role described below.

Career Model:
${JSON.stringify(careerModel, null, 2)}

Job Description:
${jobDescription}

Resume Score: ${score.total}/100
Job Fit: ${fit.overallFit}%

What would worry you about this candidate? Identify:
1. The main concerns
2. Any red flags
3. Specific improvements needed
4. Suggested language or experience to add

Respond with JSON:
{
  "answer": "Main concerns as a recruiter...",
  "risks": ["risk1", "risk2"],
  "suggestedChanges": [
    { "target": "skills|summary|experience", "operation": "add|remove|modify", "value": "...", "reasoning": "..." }
  ],
  "followUpQuestions": ["question1"],
  "confidence": 0.8
}`,
      },
      weakest: {
        question: 'Where is my resume weakest?',
        prompt: `You are an expert career coach. Review this resume and score:

Career Model:
${JSON.stringify(careerModel, null, 2)}

Job Description:
${jobDescription}

Resume Score: ${score.total}/100

What are the weakest areas that need improvement? Respond with:
{
  "answer": "The weakest areas are...",
  "risks": ["weakness1", "weakness2"],
  "suggestedChanges": [...],
  "followUpQuestions": [...],
  "confidence": 0.85
}`,
      },
      interview: {
        question: 'Would this likely get an interview?',
        prompt: `You are a hiring manager. Would you interview this candidate?

Resume Score: ${score.total}/100
Job Fit: ${fit.overallFit}%
Interview Likelihood: ${fit.likelihood.phoneScreen.toFixed(0)}%

Career:
${JSON.stringify(careerModel, null, 2)}

Job:
${jobDescription}

Respond with honest assessment:
{
  "answer": "Yes/No, here's why...",
  "risks": [...],
  "suggestedChanges": [...],
  "followUpQuestions": [...],
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
