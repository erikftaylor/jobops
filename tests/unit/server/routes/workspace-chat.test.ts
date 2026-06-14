import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecruiterChatService } from '../../../../src/server/services/recruiter-chat.service';
import type { CareerModel, JobFitAnalysis, ResumeScore } from '../../../../src/shared/types';

describe('POST /api/workspace/:jobId/chat endpoint', () => {
  let service: RecruiterChatService;
  let mockClaudeService: any;

  beforeEach(() => {
    mockClaudeService = {
      generateWithSchema: vi.fn(),
    };
    service = new RecruiterChatService(mockClaudeService);
  });

  it('should validate question ID', async () => {
    const validQuestions = ['worry', 'weakest', 'interview', 'improve-first'];
    expect(validQuestions).toContain('worry');
    expect(validQuestions).not.toContain('invalid');
  });

  it('should handle all valid question types', async () => {
    const careerModel: CareerModel = {
      fullName: 'Test User',
      sections: {
        summary: 'Test',
        experience: [],
        skills: [],
        education: [],
      },
      metadata: { hash: 'test', source: 'master' },
    };

    const jobDescription = 'Test job';
    const score: ResumeScore = {
      total: 50,
      maxScore: 100,
      confidence: 0.5,
      categories: {
        atsKeywordMatch: { name: 'ATS', score: 50, maxScore: 100, explanation: 'Test' },
        roleAlignment: { name: 'Role', score: 50, maxScore: 100, explanation: 'Test' },
        seniorityAlignment: { name: 'Seniority', score: 50, maxScore: 100, explanation: 'Test' },
        impactMetrics: { name: 'Impact', score: 50, maxScore: 100, explanation: 'Test' },
        recruiterReadability: { name: 'Readability', score: 50, maxScore: 100, explanation: 'Test' },
        formattingQuality: { name: 'Formatting', score: 50, maxScore: 100, explanation: 'Test' },
      },
      recommendations: [],
      updatedAt: new Date().toISOString(),
    };
    const fit: JobFitAnalysis = {
      overallFit: 50,
      confidenceLevel: 'low',
      strongMatches: [],
      weakMatches: [],
      rejectionRisks: [],
      interviewTalkingPoints: [],
      experienceGaps: [],
      recommendedPositioningAngle: '',
      likelihood: { phoneScreen: 50, technicalInterview: 40, offer: 20 },
    };

    mockClaudeService.generateWithSchema.mockResolvedValue({
      answer: 'Test answer',
      risks: [],
      suggestedChanges: [],
      followUpQuestions: [],
      confidence: 0.7,
    });

    const validQuestions = ['worry', 'weakest', 'interview', 'improve-first'];

    for (const questionId of validQuestions) {
      const answer = await service.answerQuestion(
        questionId,
        careerModel,
        jobDescription,
        score,
        fit
      );
      expect(answer).toBeDefined();
      expect(answer.answer).toBe('Test answer');
    }
  });

  it('should return structured response with all required fields', async () => {
    const careerModel: CareerModel = {
      fullName: 'Test',
      sections: {
        summary: '',
        experience: [],
        skills: [],
        education: [],
      },
      metadata: { hash: 'test', source: 'master' },
    };

    const jobDescription = 'Test';
    const score: ResumeScore = {
      total: 50,
      maxScore: 100,
      confidence: 0.5,
      categories: {
        atsKeywordMatch: { name: 'ATS', score: 50, maxScore: 100, explanation: 'Test' },
        roleAlignment: { name: 'Role', score: 50, maxScore: 100, explanation: 'Test' },
        seniorityAlignment: { name: 'Seniority', score: 50, maxScore: 100, explanation: 'Test' },
        impactMetrics: { name: 'Impact', score: 50, maxScore: 100, explanation: 'Test' },
        recruiterReadability: { name: 'Readability', score: 50, maxScore: 100, explanation: 'Test' },
        formattingQuality: { name: 'Formatting', score: 50, maxScore: 100, explanation: 'Test' },
      },
      recommendations: [],
      updatedAt: new Date().toISOString(),
    };
    const fit: JobFitAnalysis = {
      overallFit: 50,
      confidenceLevel: 'low',
      strongMatches: [],
      weakMatches: [],
      rejectionRisks: [],
      interviewTalkingPoints: [],
      experienceGaps: [],
      recommendedPositioningAngle: '',
      likelihood: { phoneScreen: 50, technicalInterview: 40, offer: 20 },
    };

    mockClaudeService.generateWithSchema.mockResolvedValue({
      answer: 'Main answer',
      risks: ['Risk 1', 'Risk 2'],
      suggestedChanges: [
        {
          target: 'skills',
          operation: 'add',
          value: 'TypeScript',
          reasoning: 'Job requires TypeScript',
        },
      ],
      followUpQuestions: ['Do you have TypeScript experience?'],
      confidence: 0.85,
    });

    const answer = await service.answerQuestion(
      'worry',
      careerModel,
      jobDescription,
      score,
      fit
    );

    expect(answer).toHaveProperty('question');
    expect(answer).toHaveProperty('answer');
    expect(answer).toHaveProperty('risks');
    expect(answer).toHaveProperty('suggestedChanges');
    expect(answer).toHaveProperty('confidence');
    expect(answer.risks).toHaveLength(2);
    expect(answer.suggestedChanges).toHaveLength(1);
  });
});
