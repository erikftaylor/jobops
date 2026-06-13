import { describe, it, expect, beforeEach } from 'vitest';
import { KeywordAnalyzerService } from '../../../../src/server/services/keyword-analyzer.service';

describe('KeywordAnalyzerService', () => {
  let service: KeywordAnalyzerService;

  beforeEach(() => {
    service = new KeywordAnalyzerService();
  });

  it('should identify missing critical keywords', () => {
    const jobDescription = 'We need a Kubernetes expert with Docker and Go experience';
    const resumeText = 'Senior engineer with Docker experience';

    const analysis = service.analyze(jobDescription, resumeText);

    expect(analysis.missingKeywords.length).toBeGreaterThan(0);
    expect(analysis.missingKeywords.some(kw => kw.keyword === 'kubernetes')).toBe(true);
  });

  it('should differentiate between missing and weak keywords', () => {
    const jobDescription = 'React, TypeScript, Node.js, Docker, Kubernetes required';
    const resumeText = 'React developer with some Node.js experience';

    const analysis = service.analyze(jobDescription, resumeText);

    const missing = analysis.missingKeywords.find(kw => kw.status === 'missing');
    const weak = analysis.missingKeywords.find(kw => kw.status === 'weak');

    expect(missing).toBeDefined();
    expect(weak).toBeDefined();
  });

  it('should assign importance levels correctly', () => {
    const jobDescription = 'Required: Kubernetes, Docker, Go. Nice to have: Rust, Elixir';
    const resumeText = 'Have Docker experience';

    const analysis = service.analyze(jobDescription, resumeText);

    const kubernetes = analysis.missingKeywords.find(kw => kw.keyword === 'kubernetes');
    expect(kubernetes?.importance).toBe('critical');
  });

  it('should suggest placement for keywords', () => {
    const jobDescription = 'Python, Django, PostgreSQL required';
    const resumeText = 'Full-stack engineer';

    const analysis = service.analyze(jobDescription, resumeText);

    const python = analysis.missingKeywords.find(kw => kw.keyword === 'python');
    expect(['skills', 'experience', 'summary']).toContain(python?.suggestedPlacement);
  });
});
