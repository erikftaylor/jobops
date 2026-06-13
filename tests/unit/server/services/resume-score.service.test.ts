import { describe, it, expect, beforeEach } from 'vitest';
import { ResumeScoreService } from '../../../../src/server/services/resume-score.service';
import type { CareerModel } from '../../../../src/shared/types';

describe('ResumeScoreService', () => {
  let service: ResumeScoreService;

  beforeEach(() => {
    service = new ResumeScoreService();
  });

  it('should calculate resume score with all categories', () => {
    const careerModel: CareerModel = {
      fullName: 'John Doe',
      sections: {
        summary: 'Experienced engineer with 10 years in full-stack development',
        experience: [
          {
            company: 'TechCorp',
            title: 'Senior Engineer',
            startDate: '2020',
            endDate: 'present',
            description: 'Led team of 5, built microservices in Node.js and Python',
            metrics: ['5x faster API', '99.9% uptime'],
          }
        ],
        skills: ['Node.js', 'React', 'Python', 'AWS'],
        education: [{ school: 'Stanford', degree: 'BS Computer Science', year: '2012' }],
      },
      metadata: { hash: 'abc123', source: 'master' },
    };

    const jobDescription = 'Looking for a Node.js engineer with React experience and AWS skills';

    const score = service.calculateScore(careerModel, jobDescription);

    expect(score).toBeDefined();
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
    expect(score.categories).toHaveProperty('atsKeywordMatch');
    expect(score.categories).toHaveProperty('roleAlignment');
    expect(score.categories).toHaveProperty('seniorityAlignment');
    expect(score.categories).toHaveProperty('impactMetrics');
    expect(score.categories).toHaveProperty('recruiterReadability');
    expect(score.categories).toHaveProperty('formattingQuality');
  });

  it('should detect strong keyword matches', () => {
    const careerModel: CareerModel = {
      fullName: 'Jane Smith',
      sections: {
        summary: 'Full-stack developer specializing in React and Node.js',
        experience: [
          {
            company: 'StartupXYZ',
            title: 'Lead Developer',
            startDate: '2019',
            endDate: 'present',
            description: 'Architected React app, built REST APIs in Node.js, deployed to AWS',
            metrics: ['10 million users', 'Zero-downtime deployment'],
          }
        ],
        skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'Docker'],
        education: [],
      },
      metadata: { hash: 'def456', source: 'master' },
    };

    const jobDescription = 'Senior Full Stack Engineer: React, Node.js, TypeScript, AWS required';
    const score = service.calculateScore(careerModel, jobDescription);

    expect(score.categories.atsKeywordMatch.score).toBeGreaterThan(80);
  });

  it('should penalize missing metrics', () => {
    const careerModel: CareerModel = {
      fullName: 'Bob Jones',
      sections: {
        summary: 'Software engineer',
        experience: [
          {
            company: 'SomeCorp',
            title: 'Engineer',
            startDate: '2015',
            endDate: 'present',
            description: 'Worked on projects',
            metrics: [],
          }
        ],
        skills: ['Java'],
        education: [],
      },
      metadata: { hash: 'ghi789', source: 'master' },
    };

    const jobDescription = 'Senior Engineer needed';
    const score = service.calculateScore(careerModel, jobDescription);

    expect(score.categories.impactMetrics.score).toBeLessThan(50);
  });
});
