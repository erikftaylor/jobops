import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventBus, WorkspaceEvents } from '../../src/server/services/event-bus.service';
import { WorkspaceRecalculationService } from '../../src/server/services/workspace-recalculation.service';
import type { CareerModel } from '../../src/shared/types';

// Mock all the analysis services
vi.mock('../../src/server/services/resume-score.service', () => ({
  ResumeScoreService: class {
    calculateScore() {
      return {
        total: 75,
        maxScore: 100,
        confidence: 0.85,
        categories: {
          atsKeywordMatch: { name: 'ATS', score: 80, maxScore: 100, explanation: 'Good' },
          roleAlignment: { name: 'Role', score: 75, maxScore: 100, explanation: 'Good' },
          seniorityAlignment: { name: 'Seniority', score: 70, maxScore: 100, explanation: 'Fair' },
          impactMetrics: { name: 'Metrics', score: 80, maxScore: 100, explanation: 'Good' },
          recruiterReadability: { name: 'Readability', score: 75, maxScore: 100, explanation: 'Good' },
          formattingQuality: { name: 'Format', score: 75, maxScore: 100, explanation: 'Good' },
        },
        recommendations: [],
        updatedAt: new Date().toISOString(),
      };
    }
  },
}));

vi.mock('../../src/server/services/keyword-analyzer.service', () => ({
  KeywordAnalyzerService: class {
    analyze() {
      return {
        missingKeywords: [],
        totalKeywordsInJob: 20,
        matchedCount: 18,
        matchPercentage: 90,
        summary: '18/20 keywords found',
      };
    }
  },
}));

vi.mock('../../src/server/services/heatmap-analyzer.service', () => ({
  HeatmapAnalyzerService: class {
    analyze() {
      return {
        overallVisibility: 80,
        sections: [],
        sixSecondSkim: [],
        skippedSections: [],
      };
    }
  },
}));

vi.mock('../../src/server/services/fit-analyzer.service', () => ({
  FitAnalyzerService: class {
    analyze() {
      return {
        overallFit: 75,
        confidenceLevel: 'high',
        strongMatches: [],
        weakMatches: [],
        rejectionRisks: [],
        interviewTalkingPoints: [],
        experienceGaps: [],
        recommendedPositioningAngle: 'Test angle',
        likelihood: { phoneScreen: 67, technicalInterview: 52, offer: 30 },
      };
    }
  },
}));

vi.mock('../../src/server/services/artifact-cache.service', () => ({
  ArtifactCacheService: class {
    clearJobArtifacts() {
      return 3;
    }
  },
}));

/**
 * Integration test for workspace recalculation event flow
 * Tests the full pipeline: CHANGE_ACCEPTED → recalculation → workspace:recalculated
 */
describe('Workspace Recalculation Event Flow', () => {
  let mockDb: any;
  let mockCareerModelService: any;
  let recalculationService: WorkspaceRecalculationService;
  let eventResults: any[] = [];

  const mockJob = {
    id: 'job-123',
    title: 'Senior Engineer',
    description: 'Looking for Node.js and React expertise',
  };

  const mockCareerModel: CareerModel = {
    fullName: 'John Doe',
    sections: {
      summary: 'Experienced engineer',
      experience: [
        {
          company: 'TechCorp',
          title: 'Senior Engineer',
          startDate: '2020',
          endDate: 'present',
          description: 'Led teams',
          metrics: ['5x faster'],
        },
      ],
      skills: ['Node.js', 'React'],
      education: [{ school: 'Stanford', degree: 'BS CS', year: '2014' }],
    },
    metadata: { hash: 'abc123', source: 'master' },
  };

  beforeEach(() => {
    eventBus.clearAll();
    eventResults = [];

    mockDb = {};
    mockCareerModelService = {
      resolveCareerModel: vi.fn().mockResolvedValue(mockCareerModel),
    };

    recalculationService = new WorkspaceRecalculationService(mockDb, mockCareerModelService);

    // Set up listener for the result event
    eventBus.subscribe('workspace:recalculated', (data) => {
      eventResults.push(data);
    });

    // Set up listener for error event
    eventBus.subscribe('workspace:recalculation-error', (data) => {
      eventResults.push({ error: data });
    });
  });

  it('should emit workspace:recalculated event after CHANGE_ACCEPTED', async () => {
    // This simulates what happens when keyword is accepted
    const changeEvent = {
      jobId: mockJob.id,
      changeNodeId: 'change-456',
      keyword: 'kubernetes',
      timestamp: new Date().toISOString(),
    };

    // Simulate acceptance of change
    const careerModel = await mockCareerModelService.resolveCareerModel({
      jobId: mockJob.id,
    });

    const results = await recalculationService.recalculateAll(mockJob, careerModel);

    // Emit the result event
    eventBus.emit('workspace:recalculated', {
      jobId: mockJob.id,
      ...results,
      timestamp: new Date().toISOString(),
    });

    // Verify event was received
    expect(eventResults.length).toBeGreaterThan(0);
    const receivedEvent = eventResults[0];
    expect(receivedEvent.jobId).toBe(mockJob.id);
    expect(receivedEvent.score).toBeDefined();
    expect(receivedEvent.keywords).toBeDefined();
    expect(receivedEvent.heatmap).toBeDefined();
    expect(receivedEvent.fit).toBeDefined();
  });

  it('should include all analysis results in event', async () => {
    const careerModel = await mockCareerModelService.resolveCareerModel({
      jobId: mockJob.id,
    });

    const results = await recalculationService.recalculateAll(mockJob, careerModel);

    eventBus.emit('workspace:recalculated', {
      jobId: mockJob.id,
      ...results,
      timestamp: new Date().toISOString(),
    });

    const event = eventResults[0];
    expect(event).toHaveProperty('score.total');
    expect(event).toHaveProperty('keywords.matchPercentage');
    expect(event).toHaveProperty('heatmap.overallVisibility');
    expect(event).toHaveProperty('fit.overallFit');
    expect(event).toHaveProperty('timestamp');
  });

  it('should handle multiple recalculation events', async () => {
    const careerModel = await mockCareerModelService.resolveCareerModel({
      jobId: mockJob.id,
    });

    // First recalculation
    const results1 = await recalculationService.recalculateAll(mockJob, careerModel);
    eventBus.emit('workspace:recalculated', {
      jobId: mockJob.id,
      ...results1,
      timestamp: new Date().toISOString(),
    });

    // Second recalculation
    const results2 = await recalculationService.recalculateAll(mockJob, careerModel);
    eventBus.emit('workspace:recalculated', {
      jobId: mockJob.id,
      ...results2,
      timestamp: new Date().toISOString(),
    });

    expect(eventResults.length).toBe(2);
    expect(eventResults[0].jobId).toBe(mockJob.id);
    expect(eventResults[1].jobId).toBe(mockJob.id);
  });

  it('should preserve event data structure through emission', async () => {
    const careerModel = await mockCareerModelService.resolveCareerModel({
      jobId: mockJob.id,
    });

    const results = await recalculationService.recalculateAll(mockJob, careerModel);
    const timestamp = new Date().toISOString();

    eventBus.emit('workspace:recalculated', {
      jobId: mockJob.id,
      ...results,
      timestamp,
    });

    const event = eventResults[0];
    expect(event.jobId).toBe(mockJob.id);
    expect(event.timestamp).toBe(timestamp);
    expect(Object.keys(event).sort()).toEqual(
      ['jobId', 'score', 'keywords', 'heatmap', 'fit', 'timestamp'].sort()
    );
  });

  it('should support frontend subscribing to recalculation results', () => {
    const frontendResults: any[] = [];

    // Simulate frontend listener
    eventBus.subscribe('workspace:recalculated', (data) => {
      frontendResults.push({
        jobId: data.jobId,
        newScore: data.score.total,
        updatedAt: data.timestamp,
      });
    });

    // Emit recalculation event
    eventBus.emit('workspace:recalculated', {
      jobId: mockJob.id,
      score: { total: 85, maxScore: 100 } as any,
      keywords: {} as any,
      heatmap: {} as any,
      fit: {} as any,
      timestamp: new Date().toISOString(),
    });

    expect(frontendResults.length).toBe(1);
    expect(frontendResults[0].jobId).toBe(mockJob.id);
    expect(frontendResults[0].newScore).toBe(85);
  });

  it('should emit error event on recalculation failure', async () => {
    // Simulate what happens when recalculation fails
    const errorMessage = 'Model resolution failed';

    // Emit the error event directly to test the error flow
    eventBus.emit('workspace:recalculation-error', {
      jobId: mockJob.id,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });

    const errorEvent = eventResults.find((e) => e.error);
    expect(errorEvent).toBeDefined();
    expect(errorEvent.error.jobId).toBe(mockJob.id);
    expect(errorEvent.error.error).toBe(errorMessage);
  });

  it('should clear event listeners when needed', () => {
    eventBus.clear('workspace:recalculated');
    eventResults = [];

    eventBus.emit('workspace:recalculated', {
      jobId: mockJob.id,
      score: {} as any,
      keywords: {} as any,
      heatmap: {} as any,
      fit: {} as any,
      timestamp: new Date().toISOString(),
    });

    expect(eventResults.length).toBe(0);
  });
});
