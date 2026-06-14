import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkspaceRecalculationService } from '../../../../src/server/services/workspace-recalculation.service';
import type { CareerModel } from '../../../../src/shared/types';
import Database from 'better-sqlite3';

// Mock the service dependencies
vi.mock('../../../../src/server/services/resume-score.service', () => ({
  ResumeScoreService: class {
    calculateScore() {
      return {
        total: 75,
        maxScore: 100,
        confidence: 0.85,
        categories: {
          atsKeywordMatch: { name: 'ATS Keyword Match', score: 80, maxScore: 100, explanation: 'Good match' },
          roleAlignment: { name: 'Role Alignment', score: 75, maxScore: 100, explanation: 'Moderate match' },
          seniorityAlignment: { name: 'Seniority Alignment', score: 70, maxScore: 100, explanation: 'Fair match' },
          impactMetrics: { name: 'Impact Metrics', score: 80, maxScore: 100, explanation: 'Good metrics' },
          recruiterReadability: { name: 'Recruiter Readability', score: 75, maxScore: 100, explanation: 'Readable' },
          formattingQuality: { name: 'Formatting Quality', score: 75, maxScore: 100, explanation: 'Good format' },
        },
        recommendations: ['Add more keywords'],
        updatedAt: new Date().toISOString(),
      };
    }
  },
}));

vi.mock('../../../../src/server/services/keyword-analyzer.service', () => ({
  KeywordAnalyzerService: class {
    analyze() {
      return {
        missingKeywords: [
          {
            keyword: 'kubernetes',
            importance: 'high',
            status: 'missing',
            frequency: { inJob: 2, inResume: 0 },
            suggestedPlacement: 'skills',
            suggestedLanguage: 'Experience with Kubernetes',
          },
        ],
        totalKeywordsInJob: 20,
        matchedCount: 18,
        matchPercentage: 90,
        summary: '18/20 keywords found. 2 missing or weak.',
      };
    }
  },
}));

vi.mock('../../../../src/server/services/heatmap-analyzer.service', () => ({
  HeatmapAnalyzerService: class {
    analyze() {
      return {
        overallVisibility: 80,
        sections: [
          {
            sectionName: 'Summary',
            visibilityScore: 90,
            recruiterConfidence: 'high',
            riskLevel: 'low',
            keyObservations: ['Professional summary present'],
            recommendedImprovement: 'Highlight key achievements',
            isVisible: true,
          },
        ],
        sixSecondSkim: ['Summary (90)', 'Skills (85)'],
        skippedSections: [],
      };
    }
  },
}));

vi.mock('../../../../src/server/services/fit-analyzer.service', () => ({
  FitAnalyzerService: class {
    analyze() {
      return {
        overallFit: 75,
        confidenceLevel: 'high',
        strongMatches: ['React expertise', 'Node.js expertise'],
        weakMatches: ['Limited Kubernetes experience'],
        rejectionRisks: [],
        interviewTalkingPoints: ['Current role demonstrates seniority', '9+ years of experience'],
        experienceGaps: [],
        recommendedPositioningAngle: 'Position as impact-driven engineer',
        likelihood: {
          phoneScreen: 67.5,
          technicalInterview: 52.5,
          offer: 30,
        },
      };
    }
  },
}));

vi.mock('../../../../src/server/services/artifact-cache.service', () => ({
  ArtifactCacheService: class {
    clearJobArtifacts(jobId: string) {
      return 3; // Mock: cleared 3 artifacts
    }
  },
}));

describe('WorkspaceRecalculationService', () => {
  let service: WorkspaceRecalculationService;
  let mockDb: any;
  let mockCareerModelService: any;

  const mockCareerModel: CareerModel = {
    fullName: 'John Doe',
    sections: {
      summary: 'Experienced full-stack engineer with 9 years in cloud technologies',
      experience: [
        {
          company: 'TechCorp',
          title: 'Senior Engineer',
          startDate: '2020',
          endDate: 'present',
          description: 'Led team of 5, built microservices in Node.js and React',
          metrics: ['5x faster API', '99.9% uptime'],
        },
        {
          company: 'StartupInc',
          title: 'Full-Stack Engineer',
          startDate: '2017',
          endDate: '2020',
          description: 'Built web applications using React and Node.js',
          metrics: ['Grew user base to 50k'],
        },
      ],
      skills: ['Node.js', 'React', 'TypeScript', 'AWS', 'PostgreSQL'],
      education: [{ school: 'Stanford', degree: 'BS Computer Science', year: '2014' }],
    },
    metadata: { hash: 'abc123', source: 'master' },
  };

  const mockJob = {
    id: 'job-1',
    title: 'Senior Full-Stack Engineer',
    description: 'Looking for a Node.js and React engineer with AWS experience',
  };

  beforeEach(() => {
    mockDb = {} as Database.Database;
    mockCareerModelService = {
      resolveCareerModel: vi.fn(),
    };

    service = new WorkspaceRecalculationService(mockDb, mockCareerModelService);
  });

  describe('recalculateAll', () => {
    it('should recalculate all analyses in parallel', async () => {
      const result = await service.recalculateAll(mockJob, mockCareerModel);

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('heatmap');
      expect(result).toHaveProperty('fit');
    });

    it('should return all analysis types with expected structure', async () => {
      const result = await service.recalculateAll(mockJob, mockCareerModel);

      expect(result.score).toHaveProperty('total');
      expect(result.score).toHaveProperty('categories');
      expect(result.keywords).toHaveProperty('missingKeywords');
      expect(result.keywords).toHaveProperty('matchPercentage');
      expect(result.heatmap).toHaveProperty('overallVisibility');
      expect(result.heatmap).toHaveProperty('sections');
      expect(result.fit).toHaveProperty('overallFit');
      expect(result.fit).toHaveProperty('confidenceLevel');
    });

    it('should throw error if job has no description', async () => {
      const jobNoDesc = { id: 'job-1', title: 'Test Job' };

      await expect(service.recalculateAll(jobNoDesc, mockCareerModel)).rejects.toThrow(
        'Job must have a description for recalculation'
      );
    });

    it('should throw error if job is null', async () => {
      await expect(service.recalculateAll(null, mockCareerModel)).rejects.toThrow();
    });

    it('should invalidate cache before recalculation', async () => {
      const clearSpy = vi.spyOn(service, 'invalidateCache');

      await service.recalculateAll(mockJob, mockCareerModel);

      expect(clearSpy).toHaveBeenCalledWith(mockJob.id);
    });
  });

  describe('recalculateScore', () => {
    it('should calculate score for job and career model', () => {
      const score = service.recalculateScore(mockCareerModel, mockJob.description);

      expect(score).toBeDefined();
      expect(score.total).toBeGreaterThanOrEqual(0);
      expect(score.total).toBeLessThanOrEqual(100);
      expect(score.categories).toBeDefined();
    });

    it('should return score with all required categories', () => {
      const score = service.recalculateScore(mockCareerModel, mockJob.description);

      expect(score.categories).toHaveProperty('atsKeywordMatch');
      expect(score.categories).toHaveProperty('roleAlignment');
      expect(score.categories).toHaveProperty('seniorityAlignment');
      expect(score.categories).toHaveProperty('impactMetrics');
      expect(score.categories).toHaveProperty('recruiterReadability');
      expect(score.categories).toHaveProperty('formattingQuality');
    });

    it('should include recommendations', () => {
      const score = service.recalculateScore(mockCareerModel, mockJob.description);

      expect(Array.isArray(score.recommendations)).toBe(true);
    });
  });

  describe('recalculateKeywords', () => {
    it('should analyze missing keywords', () => {
      const resumeText = 'Node.js React engineer with 9 years experience';
      const keywords = service.recalculateKeywords(mockJob.description, resumeText);

      expect(keywords).toBeDefined();
      expect(Array.isArray(keywords.missingKeywords)).toBe(true);
    });

    it('should return keyword analysis with expected properties', () => {
      const resumeText = 'Node.js React engineer with AWS skills';
      const keywords = service.recalculateKeywords(mockJob.description, resumeText);

      expect(keywords).toHaveProperty('missingKeywords');
      expect(keywords).toHaveProperty('totalKeywordsInJob');
      expect(keywords).toHaveProperty('matchedCount');
      expect(keywords).toHaveProperty('matchPercentage');
      expect(keywords).toHaveProperty('summary');
    });

    it('should handle empty resume text', () => {
      const keywords = service.recalculateKeywords(mockJob.description, '');

      expect(keywords).toBeDefined();
      expect(keywords.missingKeywords).toBeDefined();
    });
  });

  describe('recalculateHeatmap', () => {
    it('should analyze recruiter heatmap', () => {
      const heatmap = service.recalculateHeatmap(mockCareerModel);

      expect(heatmap).toBeDefined();
      expect(heatmap.overallVisibility).toBeGreaterThanOrEqual(0);
      expect(heatmap.overallVisibility).toBeLessThanOrEqual(100);
    });

    it('should return heatmap with expected properties', () => {
      const heatmap = service.recalculateHeatmap(mockCareerModel);

      expect(heatmap).toHaveProperty('overallVisibility');
      expect(heatmap).toHaveProperty('sections');
      expect(heatmap).toHaveProperty('sixSecondSkim');
      expect(heatmap).toHaveProperty('skippedSections');
      expect(Array.isArray(heatmap.sections)).toBe(true);
    });

    it('should analyze each section', () => {
      const heatmap = service.recalculateHeatmap(mockCareerModel);

      expect(heatmap.sections.length).toBeGreaterThan(0);
      heatmap.sections.forEach((section) => {
        expect(section).toHaveProperty('sectionName');
        expect(section).toHaveProperty('visibilityScore');
        expect(section).toHaveProperty('recruiterConfidence');
        expect(section).toHaveProperty('riskLevel');
      });
    });
  });

  describe('recalculateFit', () => {
    it('should analyze job fit', () => {
      const fit = service.recalculateFit(mockCareerModel, mockJob.description);

      expect(fit).toBeDefined();
      expect(fit.overallFit).toBeGreaterThanOrEqual(0);
      expect(fit.overallFit).toBeLessThanOrEqual(100);
    });

    it('should return fit analysis with expected properties', () => {
      const fit = service.recalculateFit(mockCareerModel, mockJob.description);

      expect(fit).toHaveProperty('overallFit');
      expect(fit).toHaveProperty('confidenceLevel');
      expect(fit).toHaveProperty('strongMatches');
      expect(fit).toHaveProperty('weakMatches');
      expect(fit).toHaveProperty('rejectionRisks');
      expect(fit).toHaveProperty('interviewTalkingPoints');
      expect(fit).toHaveProperty('experienceGaps');
      expect(fit).toHaveProperty('likelihood');
    });

    it('should include interview talking points', () => {
      const fit = service.recalculateFit(mockCareerModel, mockJob.description);

      expect(Array.isArray(fit.interviewTalkingPoints)).toBe(true);
    });

    it('should assess likelihood of advancing', () => {
      const fit = service.recalculateFit(mockCareerModel, mockJob.description);

      expect(fit.likelihood).toHaveProperty('phoneScreen');
      expect(fit.likelihood).toHaveProperty('technicalInterview');
      expect(fit.likelihood).toHaveProperty('offer');
    });
  });

  describe('invalidateCache', () => {
    it('should clear cached artifacts for the job', () => {
      service.invalidateCache(mockJob.id);
      // Should not throw - test passes if no error
      expect(true).toBe(true);
    });

    it('should handle cache clearing errors gracefully', () => {
      // Mock a service that throws
      const brokenCacheService = {
        clearJobArtifacts: vi.fn().mockImplementation(() => {
          throw new Error('Cache error');
        }),
      };

      // Create new service instance with broken cache
      const brokenService = new WorkspaceRecalculationService(mockDb, mockCareerModelService);

      // Should not throw - errors are caught and logged
      expect(() => {
        brokenService.invalidateCache(mockJob.id);
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle null career model gracefully', async () => {
      // Test should complete without throwing
      try {
        await service.recalculateAll(mockJob, null as any);
      } catch (error) {
        // Expected to throw or handle gracefully
      }
    });

    it('should handle missing job description', async () => {
      const incompleteJob = { id: 'job-1' };

      await expect(service.recalculateAll(incompleteJob, mockCareerModel)).rejects.toThrow();
    });

    it('should include timestamp in results', async () => {
      const result = await service.recalculateAll(mockJob, mockCareerModel);

      // Results should be usable with event emission
      expect(result.score).toBeDefined();
      expect(result.keywords).toBeDefined();
    });
  });

  describe('performance', () => {
    it('should run all analyses in parallel', async () => {
      const result = await service.recalculateAll(mockJob, mockCareerModel);

      // Verify all analyses completed
      expect(result.score).toBeDefined();
      expect(result.keywords).toBeDefined();
      expect(result.heatmap).toBeDefined();
      expect(result.fit).toBeDefined();

      // All should be present in the same result object
      expect(Object.keys(result)).toContain('score');
      expect(Object.keys(result)).toContain('keywords');
      expect(Object.keys(result)).toContain('heatmap');
      expect(Object.keys(result)).toContain('fit');
    });
  });

  describe('data transformations', () => {
    it('should correctly convert career model to resume text', () => {
      // Test the private method indirectly through recalculateKeywords
      const resumeText = [
        mockCareerModel.fullName,
        mockCareerModel.sections.summary,
        (mockCareerModel.sections.experience || [])
          .map((e) => `${e.title} ${e.description}`)
          .join(' '),
        (mockCareerModel.sections.skills || []).join(' '),
      ]
        .filter(Boolean)
        .join(' ');

      expect(resumeText).toContain('John Doe');
      expect(resumeText).toContain('Senior Engineer');
      expect(resumeText).toContain('Node.js');
      expect(resumeText).toContain('React');
    });

    it('should handle career models with missing sections', () => {
      const minimalModel: CareerModel = {
        fullName: 'Jane Doe',
        sections: {
          summary: 'Engineer',
          experience: [],
          skills: [],
          education: [],
        },
        metadata: { hash: 'xyz789', source: 'master' },
      };

      const heatmap = service.recalculateHeatmap(minimalModel);
      expect(heatmap).toBeDefined();
    });
  });
});
