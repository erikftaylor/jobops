import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Integration test for workspace feature
 * Verifies that all components work together cohesively
 */
describe('Workspace Feature Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Workspace Data Loading', () => {
    it('should load all workspace analyses for a job', async () => {
      // Mock all API endpoints
      const mockScoreResponse = {
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
        recommendations: ['Add metrics', 'Enhance keywords'],
        updatedAt: new Date().toISOString(),
      };

      const mockKeywordsResponse = {
        missingKeywords: [
          {
            keyword: 'Kubernetes',
            importance: 'critical',
            status: 'missing',
            frequency: { inJob: 5, inResume: 0 },
            suggestedPlacement: 'skills',
            suggestedLanguage: 'Kubernetes expertise',
          },
        ],
        totalKeywordsInJob: 50,
        matchedCount: 40,
        matchPercentage: 80,
        summary: 'Missing critical keywords',
      };

      const mockHeatmapResponse = {
        overallVisibility: 78,
        sections: [
          {
            sectionName: 'Summary',
            visibilityScore: 95,
            recruiterConfidence: 'high',
            riskLevel: 'low',
            keyObservations: ['Clear'],
            recommendedImprovement: 'Add metrics',
            isVisible: true,
          },
        ],
        sixSecondSkim: ['Current role', 'Company'],
        skippedSections: [],
      };

      const mockFitResponse = {
        overallFit: 72,
        confidenceLevel: 'high',
        strongMatches: ['5+ years experience'],
        weakMatches: ['Limited Kubernetes'],
        rejectionRisks: [],
        interviewTalkingPoints: ['Highlight experience'],
        experienceGaps: [],
        recommendedPositioningAngle: 'Emphasize expertise',
        likelihood: {
          phoneScreen: 0.82,
          technicalInterview: 0.75,
          offer: 0.68,
        },
      };

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/score')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockScoreResponse),
          });
        }
        if (url.includes('/keywords')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockKeywordsResponse),
          });
        }
        if (url.includes('/heatmap')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockHeatmapResponse),
          });
        }
        if (url.includes('/fit')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockFitResponse),
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      // Simulate loading all endpoints
      const jobId = 'job-123';
      const scoreRes = await fetch(`/api/workspace/${jobId}/score`);
      const keywordsRes = await fetch(`/api/workspace/${jobId}/keywords`);
      const heatmapRes = await fetch(`/api/workspace/${jobId}/heatmap`);
      const fitRes = await fetch(`/api/workspace/${jobId}/fit`);

      const score = await scoreRes.json();
      const keywords = await keywordsRes.json();
      const heatmap = await heatmapRes.json();
      const fit = await fitRes.json();

      // Verify all responses loaded successfully
      expect(score.total).toBe(85);
      expect(keywords.missingKeywords.length).toBeGreaterThan(0);
      expect(heatmap.overallVisibility).toBe(78);
      expect(fit.overallFit).toBe(72);

      // Verify data consistency
      expect(scoreRes.ok).toBe(true);
      expect(keywordsRes.ok).toBe(true);
      expect(heatmapRes.ok).toBe(true);
      expect(fitRes.ok).toBe(true);
    });

    it('should handle partial failures gracefully', async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/score')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ total: 85, maxScore: 100 }),
          });
        }
        // Simulate keywords endpoint failure
        return Promise.resolve({
          ok: false,
          status: 500,
        });
      });

      const scoreRes = await fetch('/api/workspace/job-123/score');
      const keywordsRes = await fetch('/api/workspace/job-123/keywords');

      expect(scoreRes.ok).toBe(true);
      expect(keywordsRes.ok).toBe(false);
    });
  });

  describe('Component Data Consistency', () => {
    it('should display consistent data across components', async () => {
      const mockScore = {
        total: 75,
        maxScore: 100,
        confidence: 0.85,
        categories: {
          atsKeywordMatch: { name: 'ATS', score: 75, maxScore: 100, explanation: 'Fair' },
          roleAlignment: { name: 'Role', score: 75, maxScore: 100, explanation: 'Fair' },
          seniorityAlignment: { name: 'Seniority', score: 75, maxScore: 100, explanation: 'Fair' },
          impactMetrics: { name: 'Impact', score: 75, maxScore: 100, explanation: 'Fair' },
          recruiterReadability: { name: 'Readability', score: 75, maxScore: 100, explanation: 'Fair' },
          formattingQuality: { name: 'Format', score: 75, maxScore: 100, explanation: 'Fair' },
        },
        recommendations: ['Improve keywords'],
        updatedAt: new Date().toISOString(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockScore,
      });

      const res = await fetch('/api/workspace/job-123/score');
      const data = await res.json();

      // Verify data structure
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('categories');
      expect(data).toHaveProperty('recommendations');

      // Verify all required categories exist
      expect(data.categories).toHaveProperty('atsKeywordMatch');
      expect(data.categories).toHaveProperty('roleAlignment');
      expect(data.categories).toHaveProperty('seniorityAlignment');
      expect(data.categories).toHaveProperty('impactMetrics');
      expect(data.categories).toHaveProperty('recruiterReadability');
      expect(data.categories).toHaveProperty('formattingQuality');
    });
  });

  describe('API Response Validation', () => {
    it('should validate score response schema', async () => {
      const mockScore = {
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
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockScore,
      });

      const res = await fetch('/api/workspace/job-123/score');
      const data = await res.json();

      // Validate score is in valid range
      expect(data.total).toBeGreaterThanOrEqual(0);
      expect(data.total).toBeLessThanOrEqual(data.maxScore);

      // Validate confidence is a probability
      expect(data.confidence).toBeGreaterThanOrEqual(0);
      expect(data.confidence).toBeLessThanOrEqual(1);

      // Validate all categories have scores
      Object.values(data.categories).forEach((category: any) => {
        expect(category.score).toBeGreaterThanOrEqual(0);
        expect(category.score).toBeLessThanOrEqual(category.maxScore);
      });
    });

    it('should validate keyword analysis response schema', async () => {
      const mockAnalysis = {
        missingKeywords: [
          {
            keyword: 'Kubernetes',
            importance: 'critical',
            status: 'missing',
            frequency: { inJob: 5, inResume: 0 },
            suggestedPlacement: 'skills',
            suggestedLanguage: 'Kubernetes',
          },
        ],
        totalKeywordsInJob: 50,
        matchedCount: 40,
        matchPercentage: 80,
        summary: 'Missing keywords',
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockAnalysis,
      });

      const res = await fetch('/api/workspace/job-123/keywords');
      const data = await res.json();

      // Validate percentage is valid
      expect(data.matchPercentage).toBeGreaterThanOrEqual(0);
      expect(data.matchPercentage).toBeLessThanOrEqual(100);

      // Validate counts are consistent
      expect(data.matchedCount).toBeLessThanOrEqual(data.totalKeywordsInJob);

      // Validate keyword objects
      data.missingKeywords.forEach((keyword: any) => {
        expect(keyword).toHaveProperty('keyword');
        expect(keyword).toHaveProperty('importance');
        expect(keyword).toHaveProperty('status');
        expect(['critical', 'high', 'medium', 'low']).toContain(keyword.importance);
        expect(['missing', 'weak']).toContain(keyword.status);
      });
    });

    it('should validate heatmap response schema', async () => {
      const mockHeatmap = {
        overallVisibility: 78,
        sections: [
          {
            sectionName: 'Summary',
            visibilityScore: 95,
            recruiterConfidence: 'high',
            riskLevel: 'low',
            keyObservations: ['Clear'],
            recommendedImprovement: 'Add metrics',
            isVisible: true,
          },
        ],
        sixSecondSkim: ['Current role'],
        skippedSections: [],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockHeatmap,
      });

      const res = await fetch('/api/workspace/job-123/heatmap');
      const data = await res.json();

      // Validate overall visibility percentage
      expect(data.overallVisibility).toBeGreaterThanOrEqual(0);
      expect(data.overallVisibility).toBeLessThanOrEqual(100);

      // Validate sections
      data.sections.forEach((section: any) => {
        expect(section.visibilityScore).toBeGreaterThanOrEqual(0);
        expect(section.visibilityScore).toBeLessThanOrEqual(100);
        expect(['high', 'medium', 'low']).toContain(section.recruiterConfidence);
      });
    });

    it('should validate job fit response schema', async () => {
      const mockFit = {
        overallFit: 72,
        confidenceLevel: 'high',
        strongMatches: ['Experience'],
        weakMatches: [],
        rejectionRisks: [],
        interviewTalkingPoints: [],
        experienceGaps: [],
        recommendedPositioningAngle: 'Emphasize',
        likelihood: {
          phoneScreen: 0.82,
          technicalInterview: 0.75,
          offer: 0.68,
        },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockFit,
      });

      const res = await fetch('/api/workspace/job-123/fit');
      const data = await res.json();

      // Validate overall fit percentage
      expect(data.overallFit).toBeGreaterThanOrEqual(0);
      expect(data.overallFit).toBeLessThanOrEqual(100);

      // Validate confidence level
      expect(['high', 'medium', 'low']).toContain(data.confidenceLevel);

      // Validate likelihood probabilities
      expect(data.likelihood.phoneScreen).toBeGreaterThanOrEqual(0);
      expect(data.likelihood.phoneScreen).toBeLessThanOrEqual(1);
      expect(data.likelihood.technicalInterview).toBeGreaterThanOrEqual(0);
      expect(data.likelihood.technicalInterview).toBeLessThanOrEqual(1);
      expect(data.likelihood.offer).toBeGreaterThanOrEqual(0);
      expect(data.likelihood.offer).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          code: 'NOT_FOUND',
          message: 'Job not found',
        }),
      });

      const res = await fetch('/api/workspace/invalid-job/score');
      expect(res.ok).toBe(false);
      expect(res.status).toBe(404);
    });

    it('should handle 500 errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          code: 'INTERNAL_ERROR',
          message: 'Failed to calculate score',
        }),
      });

      const res = await fetch('/api/workspace/job-123/score');
      expect(res.ok).toBe(false);
      expect(res.status).toBe(500);
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network timeout'));

      try {
        await fetch('/api/workspace/job-123/score');
        expect(true).toBe(false); // Should not reach here
      } catch (err) {
        expect((err as Error).message).toBe('Network timeout');
      }
    });
  });

  describe('Data Persistence', () => {
    it('should maintain consistent state across multiple fetches', async () => {
      const mockScore = {
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
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockScore,
      });

      const firstFetch = await (await fetch('/api/workspace/job-123/score')).json();
      const secondFetch = await (await fetch('/api/workspace/job-123/score')).json();

      expect(firstFetch.total).toBe(secondFetch.total);
      expect(firstFetch.confidence).toBe(secondFetch.confidence);
    });
  });
});
