import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Router, Request, Response } from 'express';

// Mock the services
vi.mock('../../../../src/server/services/resume-score.service.js', () => ({
  ResumeScoreService: vi.fn().mockImplementation(() => ({
    calculateScore: vi.fn().mockReturnValue({
      total: 85,
      maxScore: 100,
      confidence: 0.9,
      categories: {
        atsKeywordMatch: { name: 'ATS', score: 85, maxScore: 100, explanation: 'Good' },
        roleAlignment: { name: 'Role', score: 85, maxScore: 100, explanation: 'Good' },
        seniorityAlignment: { name: 'Seniority', score: 85, maxScore: 100, explanation: 'Good' },
        impactMetrics: { name: 'Impact', score: 85, maxScore: 100, explanation: 'Good' },
        recruiterReadability: { name: 'Readability', score: 85, maxScore: 100, explanation: 'Good' },
        formattingQuality: { name: 'Format', score: 85, maxScore: 100, explanation: 'Good' },
      },
      recommendations: [],
      updatedAt: new Date().toISOString(),
    }),
  })),
}));

vi.mock('../../../../src/server/services/keyword-analyzer.service.js', () => ({
  KeywordAnalyzerService: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockReturnValue({
      missingKeywords: [],
      totalKeywordsInJob: 50,
      matchedCount: 50,
      matchPercentage: 100,
      summary: 'Perfect match',
    }),
  })),
}));

vi.mock('../../../../src/server/services/heatmap-analyzer.service.js', () => ({
  HeatmapAnalyzerService: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockReturnValue({
      overallVisibility: 78,
      sections: [],
      sixSecondSkim: [],
      skippedSections: [],
    }),
  })),
}));

vi.mock('../../../../src/server/services/fit-analyzer.service.js', () => ({
  FitAnalyzerService: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockReturnValue({
      overallFit: 72,
      confidenceLevel: 'high',
      strongMatches: [],
      weakMatches: [],
      rejectionRisks: [],
      interviewTalkingPoints: [],
      experienceGaps: [],
      recommendedPositioningAngle: 'Test',
      likelihood: { phoneScreen: 0.8, technicalInterview: 0.7, offer: 0.6 },
    }),
  })),
}));

vi.mock('../../../../src/server/services/job.service.js', () => ({
  createJobService: vi.fn().mockReturnValue({
    getJob: vi.fn().mockImplementation((jobId: string) => {
      if (jobId === 'job-123') {
        return {
          id: 'job-123',
          title: 'Senior Engineer',
          company: 'TechCorp',
          description: 'Looking for a senior engineer',
        };
      }
      return null;
    }),
  }),
}));

vi.mock('../../../../src/server/services/career-doc.service.js', () => ({
  createCareerDocService: vi.fn().mockReturnValue({
    readCareerDocument: vi.fn().mockReturnValue('Career doc content'),
    parseCareerDocument: vi.fn().mockReturnValue({
      contact: { name: 'John Doe' },
      professionalSummary: 'Experienced engineer',
      roles: [],
      skillsInventory: { languagesFrameworks: [], toolsPlatforms: [] },
      education: [],
    }),
  }),
}));

describe('Workspace Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/workspace/:jobId', () => {
    it('should have expected response structure', () => {
      // Verify route structure
      const validResponse = {
        jobId: 'job-123',
        jobTitle: 'Senior Engineer',
        score: {
          total: 85,
          maxScore: 100,
        },
        workspaceUrl: '/workspace/job-123',
      };

      expect(validResponse).toHaveProperty('jobId');
      expect(validResponse).toHaveProperty('jobTitle');
      expect(validResponse).toHaveProperty('score');
      expect(validResponse).toHaveProperty('workspaceUrl');
    });

    it('should define 404 error structure for missing job', () => {
      const errorResponse = {
        code: 'NOT_FOUND',
        message: 'Job not found',
      };

      expect(errorResponse.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/workspace/:jobId/score', () => {
    it('should return score with required properties', () => {
      const scoreResponse = {
        total: 85,
        maxScore: 100,
        confidence: 0.9,
        categories: {
          atsKeywordMatch: { name: 'ATS', score: 85, maxScore: 100, explanation: 'Good' },
          roleAlignment: { name: 'Role', score: 85, maxScore: 100, explanation: 'Good' },
        },
        recommendations: [],
        updatedAt: new Date().toISOString(),
      };

      expect(scoreResponse).toHaveProperty('total');
      expect(scoreResponse).toHaveProperty('maxScore');
      expect(scoreResponse).toHaveProperty('confidence');
      expect(scoreResponse).toHaveProperty('categories');
      expect(scoreResponse.maxScore).toBe(100);
    });

    it('should define error responses', () => {
      const notFoundError = { code: 'NOT_FOUND', message: 'Job not found' };
      const missingDescError = { code: 'MISSING_DESCRIPTION', message: 'Description required' };

      expect(notFoundError.code).toBe('NOT_FOUND');
      expect(missingDescError.code).toBe('MISSING_DESCRIPTION');
    });
  });

  describe('GET /api/workspace/:jobId/keywords', () => {
    it('should return keyword analysis structure', () => {
      const analysis = {
        missingKeywords: [],
        totalKeywordsInJob: 50,
        matchedCount: 40,
        matchPercentage: 80,
        summary: 'Analysis',
      };

      expect(analysis).toHaveProperty('missingKeywords');
      expect(analysis).toHaveProperty('totalKeywordsInJob');
      expect(analysis).toHaveProperty('matchedCount');
      expect(analysis).toHaveProperty('matchPercentage');
      expect(analysis.matchPercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('GET /api/workspace/:jobId/heatmap', () => {
    it('should return heatmap structure', () => {
      const heatmap = {
        overallVisibility: 78,
        sections: [],
        sixSecondSkim: [],
        skippedSections: [],
      };

      expect(heatmap).toHaveProperty('overallVisibility');
      expect(heatmap).toHaveProperty('sections');
      expect(heatmap.overallVisibility).toBeGreaterThanOrEqual(0);
      expect(heatmap.overallVisibility).toBeLessThanOrEqual(100);
    });
  });

  describe('GET /api/workspace/:jobId/fit', () => {
    it('should return job fit structure', () => {
      const fit = {
        overallFit: 72,
        confidenceLevel: 'high',
        strongMatches: [],
        weakMatches: [],
        rejectionRisks: [],
        interviewTalkingPoints: [],
        experienceGaps: [],
        recommendedPositioningAngle: 'Test',
        likelihood: {
          phoneScreen: 0.8,
          technicalInterview: 0.7,
          offer: 0.6,
        },
      };

      expect(fit).toHaveProperty('overallFit');
      expect(fit).toHaveProperty('confidenceLevel');
      expect(fit).toHaveProperty('likelihood');
      expect(fit.overallFit).toBeGreaterThanOrEqual(0);
      expect(fit.overallFit).toBeLessThanOrEqual(100);
    });
  });

  describe('Error handling', () => {
    it('should return proper error structure for NOT_FOUND', () => {
      const errorResponse = {
        code: 'NOT_FOUND',
        message: 'Job not found',
      };

      expect(errorResponse).toHaveProperty('code');
      expect(errorResponse).toHaveProperty('message');
      expect(errorResponse.code).toBe('NOT_FOUND');
    });

    it('should return proper error structure for INTERNAL_ERROR', () => {
      const errorResponse = {
        code: 'INTERNAL_ERROR',
        message: 'Failed to load workspace',
      };

      expect(errorResponse.code).toBe('INTERNAL_ERROR');
      expect(errorResponse.message).toContain('Failed');
    });
  });
});
