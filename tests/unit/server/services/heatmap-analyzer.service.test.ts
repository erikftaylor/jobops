import { describe, it, expect, beforeEach } from 'vitest';
import { HeatmapAnalyzerService } from '../../../../src/server/services/heatmap-analyzer.service';
import type { CareerModel } from '../../../../src/shared/types';

describe('HeatmapAnalyzerService', () => {
  let service: HeatmapAnalyzerService;

  beforeEach(() => {
    service = new HeatmapAnalyzerService();
  });

  it('should generate heatmap for well-formed career model', () => {
    const careerModel: CareerModel = {
      fullName: 'John Doe',
      sections: {
        summary: 'Experienced engineer with 10 years in full-stack',
        experience: [
          {
            company: 'TechCorp',
            title: 'Senior Engineer',
            startDate: '2020',
            endDate: 'present',
            description: 'Led team of 5',
            metrics: ['50% faster', '99.9% uptime'],
          }
        ],
        skills: ['Node.js', 'React', 'Python', 'AWS'],
        education: [{ school: 'Stanford', degree: 'BS', year: '2012' }],
      },
      metadata: { hash: 'abc123', source: 'master' },
    };

    const heatmap = service.analyze(careerModel);

    expect(heatmap.sections).toBeDefined();
    expect(heatmap.sections.length).toBeGreaterThan(0);
    expect(heatmap.sixSecondSkim).toBeDefined();
    expect(heatmap.overallVisibility).toBeGreaterThanOrEqual(0);
  });

  it('should identify visible sections in six-second skim', () => {
    const careerModel: CareerModel = {
      fullName: 'Jane Smith',
      sections: {
        summary: 'Award-winning product engineer',
        experience: [
          {
            company: 'FamousStartup',
            title: 'Lead Engineer',
            startDate: '2021',
            endDate: 'present',
            description: 'Built product from zero to $10M ARR',
            metrics: ['10 million users'],
          }
        ],
        skills: ['React', 'Python', 'AWS'],
        education: [],
      },
      metadata: { hash: 'def456', source: 'master' },
    };

    const heatmap = service.analyze(careerModel);
    const summarySection = heatmap.sections.find(s => s.sectionName === 'Summary');

    expect(summarySection?.isVisible).toBe(true);
    expect(heatmap.sixSecondSkim.some(s => s.includes('Summary'))).toBe(true);
  });

  it('should flag missing skills section as risk', () => {
    const careerModel: CareerModel = {
      fullName: 'Bob Jones',
      sections: {
        summary: 'Engineer',
        experience: [],
        skills: [],
        education: [],
      },
      metadata: { hash: 'ghi789', source: 'master' },
    };

    const heatmap = service.analyze(careerModel);
    const skillsSection = heatmap.sections.find(s => s.sectionName === 'Skills');

    expect(skillsSection?.riskLevel).toBe('high');
    expect(heatmap.skippedSections).toContain('Skills');
  });
});
