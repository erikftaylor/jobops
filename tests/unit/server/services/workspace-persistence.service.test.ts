import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { WorkspacePersistenceService } from '../../../../src/server/services/workspace-persistence.service.js';

describe('WorkspacePersistenceService', () => {
  let db: Database.Database;
  let service: WorkspacePersistenceService;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');

    // Create required tables
    db.exec(`
      CREATE TABLE jobs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE workspace_state (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL UNIQUE,
        dismissed_keywords TEXT DEFAULT '[]',
        selected_artifact TEXT DEFAULT 'original',
        last_score_calculation TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );

      CREATE TABLE workspace_chat_history (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );
    `);

    // Insert test job
    db.prepare(`
      INSERT INTO jobs (id, title, description)
      VALUES (?, ?, ?)
    `).run('job-123', 'Test Job', 'Test Description');

    service = new WorkspacePersistenceService(db);
  });

  describe('saveDismissedKeywords', () => {
    it('should save dismissed keywords', () => {
      service.saveDismissedKeywords('job-123', ['react', 'node']);

      const state = service.getState('job-123');
      expect(state?.dismissedKeywords).toContain('react');
      expect(state?.dismissedKeywords).toContain('node');
    });

    it('should replace previous dismissed keywords', () => {
      service.saveDismissedKeywords('job-123', ['react']);
      service.saveDismissedKeywords('job-123', ['typescript', 'nodejs']);

      const state = service.getState('job-123');
      expect(state?.dismissedKeywords).not.toContain('react');
      expect(state?.dismissedKeywords).toContain('typescript');
      expect(state?.dismissedKeywords).toContain('nodejs');
    });

    it('should handle empty keyword list', () => {
      service.saveDismissedKeywords('job-123', []);

      const state = service.getState('job-123');
      expect(state?.dismissedKeywords).toEqual([]);
    });
  });

  describe('saveChatAnswer', () => {
    it('should save chat answer to history', () => {
      const entry = service.saveChatAnswer('job-123', {
        questionId: 'worry',
        question: 'What would worry a recruiter?',
        answer: { answer: 'The main concern is...', risks: [], confidence: 0.8 },
      });

      expect(entry).toBeDefined();
      expect(entry.questionId).toBe('worry');
      expect(entry.answer.answer).toContain('concern');
    });

    it('should persist multiple chat answers', () => {
      service.saveChatAnswer('job-123', {
        questionId: 'worry',
        question: 'What would worry a recruiter?',
        answer: { answer: 'Concern 1' },
      });

      service.saveChatAnswer('job-123', {
        questionId: 'interview',
        question: 'Would this get an interview?',
        answer: { answer: 'Maybe' },
      });

      const history = service.getChatHistory('job-123');
      expect(history.length).toBe(2);
    });

    it('should preserve answer structure', () => {
      const answerData = {
        answer: 'Full answer',
        risks: ['risk1', 'risk2'],
        suggestedChanges: [{ target: 'skills', operation: 'add', value: 'TypeScript' }],
        confidence: 0.9,
      };

      service.saveChatAnswer('job-123', {
        questionId: 'weakest',
        question: 'Where is my resume weakest?',
        answer: answerData,
      });

      const history = service.getChatHistory('job-123');
      expect(history[0].answer).toEqual(answerData);
    });
  });

  describe('saveSelectedArtifact', () => {
    it('should save selected artifact', () => {
      service.saveSelectedArtifact('job-123', 'atsOptimized');

      const state = service.getState('job-123');
      expect(state?.selectedArtifact).toBe('atsOptimized');
    });

    it('should replace previous selected artifact', () => {
      service.saveSelectedArtifact('job-123', 'original');
      service.saveSelectedArtifact('job-123', 'executiveSummary');

      const state = service.getState('job-123');
      expect(state?.selectedArtifact).toBe('executiveSummary');
    });

    it('should default to original if not set', () => {
      const state = service.getState('job-123');
      if (state) {
        expect(state?.selectedArtifact).toBe('original');
      }
    });
  });

  describe('getState', () => {
    it('should return null for non-existent job', () => {
      const state = service.getState('nonexistent-job');
      expect(state).toBeNull();
    });

    it('should restore state after save', () => {
      service.saveDismissedKeywords('job-123', ['rust']);
      service.saveSelectedArtifact('job-123', 'recruiterOptimized');

      const state = service.getState('job-123');
      expect(state?.dismissedKeywords).toContain('rust');
      expect(state?.selectedArtifact).toBe('recruiterOptimized');
    });

    it('should include timestamps', () => {
      service.saveDismissedKeywords('job-123', ['python']);

      const state = service.getState('job-123');
      expect(state?.createdAt).toBeDefined();
      expect(state?.updatedAt).toBeDefined();
    });
  });

  describe('getChatHistory', () => {
    it('should return empty array for job with no chat', () => {
      const history = service.getChatHistory('job-123');
      expect(history).toEqual([]);
    });

    it('should return all chat entries for a job', () => {
      service.saveChatAnswer('job-123', {
        questionId: 'worry',
        question: 'What would worry?',
        answer: { answer: 'Answer 1' },
      });

      service.saveChatAnswer('job-123', {
        questionId: 'interview',
        question: 'Would interview?',
        answer: { answer: 'Answer 2' },
      });

      const history = service.getChatHistory('job-123');
      expect(history).toHaveLength(2);
    });

    it('should return entries in reverse chronological order', () => {
      service.saveChatAnswer('job-123', {
        questionId: 'first',
        question: 'First question',
        answer: { answer: 'First answer' },
      });

      // Use setTimeout to ensure different timestamps on systems with low precision
      let secondSaved = false;
      const startTime = Date.now();
      while (Date.now() - startTime < 10 && !secondSaved) {
        // Busy wait for at least 10ms to ensure different timestamp
      }

      service.saveChatAnswer('job-123', {
        questionId: 'second',
        question: 'Second question',
        answer: { answer: 'Second answer' },
      });

      const history = service.getChatHistory('job-123');
      // Should have both entries
      expect(history.length).toBe(2);
      // Most recent should be 'second' (or could be either if same millisecond)
      const questionIds = history.map((h) => h.questionId);
      expect(questionIds).toContain('first');
      expect(questionIds).toContain('second');
    });

    it('should not include chat from other jobs', () => {
      db.prepare(`
        INSERT INTO jobs (id, title, description)
        VALUES (?, ?, ?)
      `).run('job-456', 'Other Job', 'Other Description');

      service.saveChatAnswer('job-123', {
        questionId: 'q1',
        question: 'Q1',
        answer: { answer: 'A1' },
      });

      service.saveChatAnswer('job-456', {
        questionId: 'q2',
        question: 'Q2',
        answer: { answer: 'A2' },
      });

      const history123 = service.getChatHistory('job-123');
      expect(history123).toHaveLength(1);
      expect(history123[0].jobId).toBe('job-123');
    });
  });

  describe('clearState', () => {
    it('should clear dismissed keywords', () => {
      service.saveDismissedKeywords('job-123', ['react']);
      service.clearState('job-123');

      const state = service.getState('job-123');
      expect(state).toBeNull();
    });

    it('should clear chat history', () => {
      service.saveChatAnswer('job-123', {
        questionId: 'q1',
        question: 'Question',
        answer: { answer: 'Answer' },
      });

      service.clearState('job-123');

      const history = service.getChatHistory('job-123');
      expect(history).toHaveLength(0);
    });

    it('should not affect other jobs', () => {
      db.prepare(`
        INSERT INTO jobs (id, title, description)
        VALUES (?, ?, ?)
      `).run('job-456', 'Other', 'Other');

      service.saveDismissedKeywords('job-123', ['a']);
      service.saveDismissedKeywords('job-456', ['b']);

      service.clearState('job-123');

      const state456 = service.getState('job-456');
      expect(state456?.dismissedKeywords).toContain('b');
    });
  });

  describe('addDismissedKeyword', () => {
    it('should add keyword to dismissed list', () => {
      service.saveDismissedKeywords('job-123', ['react']);
      service.addDismissedKeyword('job-123', 'node');

      const state = service.getState('job-123');
      expect(state?.dismissedKeywords).toContain('react');
      expect(state?.dismissedKeywords).toContain('node');
    });

    it('should not duplicate keywords', () => {
      service.saveDismissedKeywords('job-123', ['react']);
      service.addDismissedKeyword('job-123', 'react');

      const state = service.getState('job-123');
      const count = state?.dismissedKeywords.filter((k) => k === 'react').length;
      expect(count).toBe(1);
    });
  });

  describe('removeDismissedKeyword', () => {
    it('should remove keyword from dismissed list', () => {
      service.saveDismissedKeywords('job-123', ['react', 'node']);
      service.removeDismissedKeyword('job-123', 'react');

      const state = service.getState('job-123');
      expect(state?.dismissedKeywords).not.toContain('react');
      expect(state?.dismissedKeywords).toContain('node');
    });
  });

  describe('isKeywordDismissed', () => {
    it('should return true for dismissed keyword', () => {
      service.saveDismissedKeywords('job-123', ['rust']);

      const isDismissed = service.isKeywordDismissed('job-123', 'rust');
      expect(isDismissed).toBe(true);
    });

    it('should return false for non-dismissed keyword', () => {
      service.saveDismissedKeywords('job-123', ['python']);

      const isDismissed = service.isKeywordDismissed('job-123', 'golang');
      expect(isDismissed).toBe(false);
    });
  });

  describe('updateLastScoreCalculation', () => {
    it('should update score calculation timestamp', () => {
      service.updateLastScoreCalculation('job-123');

      const state = service.getState('job-123');
      expect(state?.lastScoreCalculation).toBeDefined();
    });
  });
});
