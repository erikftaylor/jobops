import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../src/server/index.js';

describe('Phase 6.5 Full Workflow Integration', () => {
  const jobId = 'phase-6-5-test-job';

  beforeEach(() => {
    // Tests expect job to exist
    expect(jobId).toBeDefined();
  });

  describe('Artifact Generation', () => {
    it('should generate 4 artifact variants with correct structure', async () => {
      const response = await request(app)
        .get(`/api/workspace/${jobId}/artifacts`)
        .expect(200);

      expect(response.body).toHaveProperty('variants');
      expect(response.body.variants).toHaveLength(4);

      const types = response.body.variants.map((v: any) => v.type);
      expect(types).toContain('original');
      expect(types).toContain('atsOptimized');
      expect(types).toContain('executiveSummary');
      expect(types).toContain('recruiterOptimized');
    });

    it('should include all required properties for each variant', async () => {
      const response = await request(app)
        .get(`/api/workspace/${jobId}/artifacts`)
        .expect(200);

      response.body.variants.forEach((variant: any) => {
        expect(variant).toHaveProperty('type');
        expect(variant).toHaveProperty('description');
        expect(variant).toHaveProperty('artifact');
        expect(variant).toHaveProperty('score');
        expect(variant).toHaveProperty('strengths');
        expect(variant).toHaveProperty('risks');
        expect(variant).toHaveProperty('preview');
      });
    });

    it('should have valid scores for all variants', async () => {
      const response = await request(app)
        .get(`/api/workspace/${jobId}/artifacts`)
        .expect(200);

      response.body.variants.forEach((variant: any) => {
        expect(typeof variant.score).toBe('number');
        expect(variant.score).toBeGreaterThanOrEqual(0);
        expect(variant.score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Recruiter Chat & Persistence', () => {
    it('should answer recruiter question', async () => {
      const response = await request(app)
        .post(`/api/workspace/${jobId}/chat`)
        .send({ questionId: 'worry' })
        .expect(200);

      expect(response.body).toHaveProperty('question');
      expect(response.body).toHaveProperty('answer');
      expect(response.body).toHaveProperty('risks');
      expect(response.body).toHaveProperty('suggestedChanges');
      expect(response.body).toHaveProperty('confidence');
    });

    it('should save chat answer to persistence', async () => {
      await request(app)
        .post(`/api/workspace/${jobId}/chat`)
        .send({ questionId: 'weakest' })
        .expect(200);

      const persistence = await request(app)
        .get(`/api/workspace/${jobId}/persistence`)
        .expect(200);

      expect(persistence.body).toHaveProperty('chatHistory');
      expect(Array.isArray(persistence.body.chatHistory)).toBe(true);
    });

    it('should maintain chat history across multiple questions', async () => {
      await request(app)
        .post(`/api/workspace/${jobId}/chat`)
        .send({ questionId: 'worry' });

      await request(app)
        .post(`/api/workspace/${jobId}/chat`)
        .send({ questionId: 'interview' });

      const persistence = await request(app)
        .get(`/api/workspace/${jobId}/persistence`)
        .expect(200);

      // Should have at least 2 entries (may have more from previous tests)
      expect(persistence.body.chatHistory.length).toBeGreaterThanOrEqual(2);
    });

    it('should restore state after page refresh', async () => {
      // Save some chat history
      await request(app)
        .post(`/api/workspace/${jobId}/chat`)
        .send({ questionId: 'improve-first' });

      // Simulate page refresh by fetching persistence
      const persistence1 = await request(app)
        .get(`/api/workspace/${jobId}/persistence`)
        .expect(200);

      const chatCountBefore = persistence1.body.chatHistory.length;

      // Fetch again to simulate refresh
      const persistence2 = await request(app)
        .get(`/api/workspace/${jobId}/persistence`)
        .expect(200);

      const chatCountAfter = persistence2.body.chatHistory.length;

      // Should have same number of chat entries
      expect(chatCountAfter).toBe(chatCountBefore);
    });
  });

  describe('Keyword Workflow', () => {
    it('should propose a keyword', async () => {
      const response = await request(app)
        .post(`/api/workspace/${jobId}/keywords/propose`)
        .send({
          keyword: 'TypeScript',
          suggestedLanguage: 'Developed scalable applications using TypeScript',
          target: 'skills',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('proposed');
    });

    it('should accept a keyword proposal', async () => {
      const proposeResponse = await request(app)
        .post(`/api/workspace/${jobId}/keywords/propose`)
        .send({
          keyword: 'Kubernetes',
          suggestedLanguage: 'Deployed containerized applications',
          target: 'experience',
        });

      const keywordId = proposeResponse.body.id;

      const acceptResponse = await request(app)
        .post(`/api/workspace/${jobId}/keywords/${keywordId}/accept`)
        .expect(200);

      expect(acceptResponse.body.status).toBe('accepted');
    });

    it('should ignore a keyword proposal', async () => {
      const proposeResponse = await request(app)
        .post(`/api/workspace/${jobId}/keywords/propose`)
        .send({
          keyword: 'Ruby',
          suggestedLanguage: 'Ruby on Rails experience',
          target: 'skills',
        });

      const keywordId = proposeResponse.body.id;

      const ignoreResponse = await request(app)
        .post(`/api/workspace/${jobId}/keywords/${keywordId}/ignore`)
        .expect(200);

      expect(ignoreResponse.body.status).toBe('ignored');
    });
  });

  describe('Score Analysis', () => {
    it('should calculate resume score', async () => {
      const response = await request(app)
        .get(`/api/workspace/${jobId}/score`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('maxScore');
      expect(response.body.total).toBeGreaterThanOrEqual(0);
      expect(response.body.maxScore).toBeGreaterThanOrEqual(response.body.total);
    });

    it('should analyze job fit', async () => {
      const response = await request(app)
        .get(`/api/workspace/${jobId}/fit`)
        .expect(200);

      expect(response.body).toHaveProperty('overallFit');
      expect(response.body).toHaveProperty('strongMatches');
      expect(response.body).toHaveProperty('weakMatches');
      expect(response.body).toHaveProperty('rejectionRisks');
    });

    it('should analyze keywords', async () => {
      const response = await request(app)
        .get(`/api/workspace/${jobId}/keywords`)
        .expect(200);

      expect(response.body).toHaveProperty('foundKeywords');
      expect(response.body).toHaveProperty('missingKeywords');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent job for artifacts', async () => {
      const response = await request(app)
        .get(`/api/workspace/nonexistent/artifacts`)
        .expect(404);

      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should handle invalid question ID', async () => {
      const response = await request(app)
        .post(`/api/workspace/${jobId}/chat`)
        .send({ questionId: 'invalid-question' })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should handle invalid keyword target', async () => {
      const response = await request(app)
        .post(`/api/workspace/${jobId}/keywords/propose`)
        .send({
          keyword: 'test',
          suggestedLanguage: 'test',
          target: 'invalid-target',
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Persistence & State Management', () => {
    it('should retrieve workspace state', async () => {
      const response = await request(app)
        .get(`/api/workspace/${jobId}/persistence`)
        .expect(200);

      expect(response.body).toHaveProperty('state');
      expect(response.body).toHaveProperty('chatHistory');
      expect(Array.isArray(response.body.chatHistory)).toBe(true);
    });

    it('should have consistent job ID in state', async () => {
      const response = await request(app)
        .get(`/api/workspace/${jobId}/persistence`)
        .expect(200);

      expect(response.body.state.jobId).toBe(jobId);
    });

    it('should preserve state across requests', async () => {
      // Get initial state
      const state1 = await request(app)
        .get(`/api/workspace/${jobId}/persistence`)
        .expect(200);

      const initialChatCount = state1.body.chatHistory.length;

      // Get state again
      const state2 = await request(app)
        .get(`/api/workspace/${jobId}/persistence`)
        .expect(200);

      const finalChatCount = state2.body.chatHistory.length;

      // Should have same number of chats
      expect(finalChatCount).toBe(initialChatCount);
    });
  });

  describe('Data Consistency', () => {
    it('should have consistent score across requests', async () => {
      const response1 = await request(app)
        .get(`/api/workspace/${jobId}/score`)
        .expect(200);

      const response2 = await request(app)
        .get(`/api/workspace/${jobId}/score`)
        .expect(200);

      expect(response1.body.total).toBe(response2.body.total);
    });

    it('should have consistent job fit across requests', async () => {
      const response1 = await request(app)
        .get(`/api/workspace/${jobId}/fit`)
        .expect(200);

      const response2 = await request(app)
        .get(`/api/workspace/${jobId}/fit`)
        .expect(200);

      expect(response1.body.overallFit).toBe(response2.body.overallFit);
    });

    it('should maintain artifact variant types', async () => {
      const response1 = await request(app)
        .get(`/api/workspace/${jobId}/artifacts`)
        .expect(200);

      const response2 = await request(app)
        .get(`/api/workspace/${jobId}/artifacts`)
        .expect(200);

      const types1 = response1.body.variants.map((v: any) => v.type).sort();
      const types2 = response2.body.variants.map((v: any) => v.type).sort();

      expect(types1).toEqual(types2);
    });
  });

  describe('Response Validation', () => {
    it('artifact endpoint should return valid JSON', async () => {
      const response = await request(app)
        .get(`/api/workspace/${jobId}/artifacts`)
        .expect(200);

      expect(() => JSON.stringify(response.body)).not.toThrow();
    });

    it('chat endpoint should return valid JSON', async () => {
      const response = await request(app)
        .post(`/api/workspace/${jobId}/chat`)
        .send({ questionId: 'worry' })
        .expect(200);

      expect(() => JSON.stringify(response.body)).not.toThrow();
    });

    it('persistence endpoint should return valid JSON', async () => {
      const response = await request(app)
        .get(`/api/workspace/${jobId}/persistence`)
        .expect(200);

      expect(() => JSON.stringify(response.body)).not.toThrow();
    });
  });
});
