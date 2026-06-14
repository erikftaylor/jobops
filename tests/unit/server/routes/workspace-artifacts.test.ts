import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../../../src/server/index.js';

describe('GET /api/workspace/:jobId/artifacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return artifact variants with correct structure', async () => {
    const response = await request(app)
      .get('/api/workspace/job-123/artifacts')
      .expect(200);

    expect(response.body).toHaveProperty('variants');
    expect(Array.isArray(response.body.variants)).toBe(true);
  });

  it('should return exactly 4 artifact variants', async () => {
    const response = await request(app)
      .get('/api/workspace/job-123/artifacts')
      .expect(200);

    expect(response.body.variants.length).toBe(4);
  });

  it('should include all required variant types', async () => {
    const response = await request(app)
      .get('/api/workspace/job-123/artifacts')
      .expect(200);

    const types = response.body.variants.map((v: any) => v.type);
    expect(types).toContain('original');
    expect(types).toContain('atsOptimized');
    expect(types).toContain('executiveSummary');
    expect(types).toContain('recruiterOptimized');
  });

  it('should include score, strengths, risks, and preview per variant', async () => {
    const response = await request(app)
      .get('/api/workspace/job-123/artifacts')
      .expect(200);

    response.body.variants.forEach((variant: any) => {
      expect(variant).toHaveProperty('type');
      expect(variant).toHaveProperty('description');
      expect(variant).toHaveProperty('score');
      expect(variant).toHaveProperty('strengths');
      expect(variant).toHaveProperty('risks');
      expect(variant).toHaveProperty('preview');
      expect(variant).toHaveProperty('artifact');
    });
  });

  it('should have numeric scores for all variants', async () => {
    const response = await request(app)
      .get('/api/workspace/job-123/artifacts')
      .expect(200);

    response.body.variants.forEach((variant: any) => {
      expect(typeof variant.score).toBe('number');
      expect(variant.score).toBeGreaterThanOrEqual(0);
      expect(variant.score).toBeLessThanOrEqual(100);
    });
  });

  it('should have array of strings for strengths', async () => {
    const response = await request(app)
      .get('/api/workspace/job-123/artifacts')
      .expect(200);

    response.body.variants.forEach((variant: any) => {
      expect(Array.isArray(variant.strengths)).toBe(true);
      variant.strengths.forEach((strength: any) => {
        expect(typeof strength).toBe('string');
      });
    });
  });

  it('should have array of strings for risks', async () => {
    const response = await request(app)
      .get('/api/workspace/job-123/artifacts')
      .expect(200);

    response.body.variants.forEach((variant: any) => {
      expect(Array.isArray(variant.risks)).toBe(true);
      variant.risks.forEach((risk: any) => {
        expect(typeof risk).toBe('string');
      });
    });
  });

  it('should return 404 for non-existent job', async () => {
    const response = await request(app)
      .get('/api/workspace/nonexistent-job-id/artifacts')
      .expect(404);

    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('should have unique variant types', async () => {
    const response = await request(app)
      .get('/api/workspace/job-123/artifacts')
      .expect(200);

    const types = response.body.variants.map((v: any) => v.type);
    const uniqueTypes = new Set(types);
    expect(uniqueTypes.size).toBe(types.length);
  });

  it('should include preview text for each variant', async () => {
    const response = await request(app)
      .get('/api/workspace/job-123/artifacts')
      .expect(200);

    response.body.variants.forEach((variant: any) => {
      expect(typeof variant.preview).toBe('string');
      expect(variant.preview.length).toBeGreaterThan(0);
    });
  });

  it('should describe variants accurately', async () => {
    const response = await request(app)
      .get('/api/workspace/job-123/artifacts')
      .expect(200);

    const variantDescriptions: Record<string, string> = {};
    response.body.variants.forEach((variant: any) => {
      variantDescriptions[variant.type] = variant.description;
    });

    expect(variantDescriptions.original).toContain('as-is');
    expect(variantDescriptions.atsOptimized).toContain('ATS');
    expect(variantDescriptions.executiveSummary).toContain('Executive');
    expect(variantDescriptions.recruiterOptimized).toContain('recruiter');
  });
});
