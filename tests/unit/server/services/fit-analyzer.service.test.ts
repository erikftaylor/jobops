import { describe, it, expect, beforeEach } from 'vitest';
import { FitAnalyzerService } from '../../../../src/server/services/fit-analyzer.service';
import type { CareerModel } from '../../../../src/shared/types';

describe('FitAnalyzerService', () => {
  let service: FitAnalyzerService;

  beforeEach(() => {
    service = new FitAnalyzerService();
  });

  it('should calculate overall job fit', () => {
    const careerModel: CareerModel = {
      fullName: 'Alice Engineer',
      sections: {
        summary: 'Full-stack engineer with 8 years experience',
        experience: [
          {
            company: 'TechCorp',
            title: 'Senior Full-Stack Engineer',
            startDate: '2020',
            endDate: 'present',
            description: 'Built React and Node.js applications',
            metrics: ['10M users', '50% performance improvement'],
          }
        ],
        skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'PostgreSQL'],
        education: [{ school: 'MIT', degree: 'BS Computer Science', year: '2016' }],
      },
      metadata: { hash: 'abc', source: 'master' },
    };

    const jobDescription = `
      Senior Full-Stack Engineer
      Requirements:
      - 5+ years full-stack experience
      - React and Node.js expertise
      - TypeScript knowledge
      - AWS experience
      - Team leadership experience
    `;

    const analysis = service.analyze(careerModel, jobDescription);

    expect(analysis.overallFit).toBeGreaterThanOrEqual(0);
    expect(analysis.overallFit).toBeLessThanOrEqual(100);
    expect(analysis.strongMatches.length).toBeGreaterThan(0);
  });

  it('should identify rejection risks', () => {
    const careerModel: CareerModel = {
      fullName: 'Junior Dev',
      sections: {
        summary: 'Junior developer with 1 year experience',
        experience: [
          {
            company: 'StartupXYZ',
            title: 'Junior Developer',
            startDate: '2025',
            endDate: 'present',
            description: 'Frontend work',
            metrics: [],
          }
        ],
        skills: ['HTML', 'CSS', 'JavaScript'],
        education: [],
      },
      metadata: { hash: 'def', source: 'master' },
    };

    const jobDescription = 'Senior Engineer needed: 10+ years required. React, Node, Kubernetes, AWS.';
    const analysis = service.analyze(careerModel, jobDescription);

    expect(analysis.rejectionRisks.length).toBeGreaterThan(0);
    expect(analysis.confidenceLevel).toBe('low');
  });

  it('should provide interview talking points', () => {
    const careerModel: CareerModel = {
      fullName: 'Bob Engineer',
      sections: {
        summary: 'Experienced engineer',
        experience: [
          {
            company: 'BigTech',
            title: 'Staff Engineer',
            startDate: '2018',
            endDate: 'present',
            description: 'Led team of 10, built microservices',
            metrics: ['99.99% uptime', '5x throughput improvement'],
          }
        ],
        skills: ['Go', 'Kubernetes', 'AWS'],
        education: [],
      },
      metadata: { hash: 'ghi', source: 'master' },
    };

    const jobDescription = 'Staff Engineer: Go, Kubernetes, AWS, microservices, team leadership';
    const analysis = service.analyze(careerModel, jobDescription);

    expect(analysis.interviewTalkingPoints.length).toBeGreaterThan(0);
    expect(analysis.interviewTalkingPoints[0]).toContain('Staff');
  });
});
