import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecruiterChatService } from '../../../../src/server/services/recruiter-chat.service';
import type {
  CareerModel,
  JobFitAnalysis,
  ResumeScore,
} from '../../../../src/shared/types';

describe('RecruiterChatService', () => {
  let service: RecruiterChatService;
  let mockClaudeService: any;

  beforeEach(() => {
    mockClaudeService = {
      generateWithSchema: vi.fn(),
    };
    service = new RecruiterChatService(mockClaudeService);
  });

  it('should answer recruiter question with structured response', async () => {
    const careerModel: CareerModel = {
      fullName: 'John Doe',
      sections: {
        summary: 'Engineer',
        experience: [
          {
            company: 'Tech',
            title: 'Engineer',
            startDate: '2020',
            endDate: 'present',
            description: 'Worked',
            metrics: [],
          },
        ],
        skills: ['Node.js'],
        education: [],
      },
      metadata: { hash: 'abc', source: 'master' },
    };

    const jobDescription =
      'Senior Engineer: 5+ years required, leadership experience needed';
    const score: ResumeScore = {
      total: 60,
      maxScore: 100,
      confidence: 0.8,
      categories: {
        atsKeywordMatch: {
          name: 'ATS Keyword Match',
          score: 50,
          maxScore: 100,
          explanation: 'Missing some keywords',
        },
        roleAlignment: {
          name: 'Role Alignment',
          score: 60,
          maxScore: 100,
          explanation: 'Partial match',
        },
        seniorityAlignment: {
          name: 'Seniority Alignment',
          score: 50,
          maxScore: 100,
          explanation: 'Below requirement',
        },
        impactMetrics: {
          name: 'Impact Metrics',
          score: 40,
          maxScore: 100,
          explanation: 'Few quantified results',
        },
        recruiterReadability: {
          name: 'Recruiter Readability',
          score: 70,
          maxScore: 100,
          explanation: 'Generally clear',
        },
        formattingQuality: {
          name: 'Formatting Quality',
          score: 80,
          maxScore: 100,
          explanation: 'Well formatted',
        },
      },
      recommendations: [],
      updatedAt: new Date().toISOString(),
    };
    const fit: JobFitAnalysis = {
      overallFit: 60,
      confidenceLevel: 'medium',
      strongMatches: [],
      weakMatches: [],
      rejectionRisks: ['Missing leadership'],
      interviewTalkingPoints: [],
      experienceGaps: [],
      recommendedPositioningAngle: 'Senior IC',
      likelihood: { phoneScreen: 50, technicalInterview: 40, offer: 20 },
    };

    mockClaudeService.generateWithSchema.mockResolvedValue({
      answer: 'The main concern is lack of leadership experience mentioned',
      risks: ['Leadership gap'],
      suggestedChanges: [],
      followUpQuestions: [],
      confidence: 0.8,
    });

    const answer = await service.answerQuestion(
      'worry',
      careerModel,
      jobDescription,
      score,
      fit
    );

    expect(answer).toBeDefined();
    expect(answer.answer).toContain('leadership');
    expect(answer.confidence).toBeGreaterThan(0);
    expect(answer.question).toBe('What would worry a recruiter?');
    expect(mockClaudeService.generateWithSchema).toHaveBeenCalled();
  });

  it('should include suggested changes when appropriate', async () => {
    const careerModel: CareerModel = {
      fullName: 'Jane Smith',
      sections: {
        summary: 'Engineer with 3 years experience',
        experience: [
          {
            company: 'Startup',
            title: 'Engineer',
            startDate: '2021',
            endDate: 'present',
            description: 'Built APIs',
            metrics: ['10x faster'],
          },
        ],
        skills: ['React', 'Node.js'],
        education: [
          { school: 'State University', degree: 'BS', year: '2020' },
        ],
      },
      metadata: { hash: 'def', source: 'master' },
    };

    const jobDescription =
      'Senior Full Stack Engineer: React, Node.js, TypeScript, 5+ years';
    const score: ResumeScore = {
      total: 75,
      maxScore: 100,
      confidence: 0.85,
      categories: {
        atsKeywordMatch: {
          name: 'ATS Keyword Match',
          score: 70,
          maxScore: 100,
          explanation: 'Good match',
        },
        roleAlignment: {
          name: 'Role Alignment',
          score: 75,
          maxScore: 100,
          explanation: 'Strong match',
        },
        seniorityAlignment: {
          name: 'Seniority Alignment',
          score: 60,
          maxScore: 100,
          explanation: 'Slightly below',
        },
        impactMetrics: {
          name: 'Impact Metrics',
          score: 80,
          maxScore: 100,
          explanation: 'Good metrics',
        },
        recruiterReadability: {
          name: 'Recruiter Readability',
          score: 85,
          maxScore: 100,
          explanation: 'Clear',
        },
        formattingQuality: {
          name: 'Formatting Quality',
          score: 85,
          maxScore: 100,
          explanation: 'Well formatted',
        },
      },
      recommendations: [],
      updatedAt: new Date().toISOString(),
    };
    const fit: JobFitAnalysis = {
      overallFit: 75,
      confidenceLevel: 'medium',
      strongMatches: [],
      weakMatches: [],
      rejectionRisks: [],
      interviewTalkingPoints: [],
      experienceGaps: [],
      recommendedPositioningAngle: '',
      likelihood: { phoneScreen: 70, technicalInterview: 60, offer: 40 },
    };

    mockClaudeService.generateWithSchema.mockResolvedValue({
      answer: 'You are a strong match overall.',
      risks: [],
      suggestedChanges: [
        {
          target: 'skills',
          operation: 'add',
          value: 'TypeScript',
          reasoning: 'Job requires TypeScript',
        },
      ],
      followUpQuestions: ['Did you use TypeScript at any point?'],
      confidence: 0.9,
    });

    const answer = await service.answerQuestion(
      'interview',
      careerModel,
      jobDescription,
      score,
      fit
    );

    expect(answer.suggestedChanges).toHaveLength(1);
    expect(answer.suggestedChanges[0].value).toBe('TypeScript');
    expect(answer.suggestedChanges[0].target).toBe('skills');
    expect(answer.confidence).toBe(0.9);
  });

  it('should handle all question types', async () => {
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
        atsKeywordMatch: {
          name: 'ATS',
          score: 50,
          maxScore: 100,
          explanation: 'Test',
        },
        roleAlignment: {
          name: 'Role',
          score: 50,
          maxScore: 100,
          explanation: 'Test',
        },
        seniorityAlignment: {
          name: 'Seniority',
          score: 50,
          maxScore: 100,
          explanation: 'Test',
        },
        impactMetrics: {
          name: 'Impact',
          score: 50,
          maxScore: 100,
          explanation: 'Test',
        },
        recruiterReadability: {
          name: 'Readability',
          score: 50,
          maxScore: 100,
          explanation: 'Test',
        },
        formattingQuality: {
          name: 'Formatting',
          score: 50,
          maxScore: 100,
          explanation: 'Test',
        },
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

    const mockResponse = {
      answer: 'Test answer',
      risks: [],
      suggestedChanges: [],
      followUpQuestions: [],
      confidence: 0.7,
    };

    mockClaudeService.generateWithSchema.mockResolvedValue(mockResponse);

    const questions = ['worry', 'weakest', 'interview', 'improve-first'];

    for (const questionId of questions) {
      const answer = await service.answerQuestion(
        questionId,
        careerModel,
        jobDescription,
        score,
        fit
      );
      expect(answer).toBeDefined();
      expect(answer.answer).toBe('Test answer');
      expect(answer.confidence).toBe(0.7);
    }

    expect(mockClaudeService.generateWithSchema).toHaveBeenCalledTimes(4);
  });

  it('should handle unknown question ID with default (worry)', async () => {
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
        atsKeywordMatch: {
          name: 'ATS',
          score: 50,
          maxScore: 100,
          explanation: 'Test',
        },
        roleAlignment: {
          name: 'Role',
          score: 50,
          maxScore: 100,
          explanation: 'Test',
        },
        seniorityAlignment: {
          name: 'Seniority',
          score: 50,
          maxScore: 100,
          explanation: 'Test',
        },
        impactMetrics: {
          name: 'Impact',
          score: 50,
          maxScore: 100,
          explanation: 'Test',
        },
        recruiterReadability: {
          name: 'Readability',
          score: 50,
          maxScore: 100,
          explanation: 'Test',
        },
        formattingQuality: {
          name: 'Formatting',
          score: 50,
          maxScore: 100,
          explanation: 'Test',
        },
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
      answer: 'Default response',
      risks: [],
      suggestedChanges: [],
      followUpQuestions: [],
      confidence: 0.7,
    });

    const answer = await service.answerQuestion(
      'unknown-question',
      careerModel,
      jobDescription,
      score,
      fit
    );

    expect(answer).toBeDefined();
    expect(answer.question).toBe('What would worry a recruiter?');
  });
});
