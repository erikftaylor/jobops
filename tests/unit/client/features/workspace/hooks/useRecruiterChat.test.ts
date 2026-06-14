import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRecruiterChat } from '@client/features/workspace/hooks/useRecruiterChat';

describe('useRecruiterChat', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() =>
      useRecruiterChat({ jobId: 'test-job' })
    );

    expect(result.current.answer).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should answer recruiter question successfully', async () => {
    const mockAnswer = {
      question: 'What would worry a recruiter?',
      answer: 'The main concern is lack of leadership experience',
      risks: ['Leadership gap'],
      suggestedChanges: [],
      followUpQuestions: [],
      confidence: 0.8,
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAnswer),
      })
    );

    const { result } = renderHook(() =>
      useRecruiterChat({ jobId: 'job-123' })
    );

    result.current.askQuestion('worry');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.answer).toEqual(mockAnswer);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/workspace/job-123/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ questionId: 'worry' }),
      })
    );
  });

  it('should set isLoading during request', async () => {
    let resolveResponse: any;
    const promise = new Promise(resolve => {
      resolveResponse = resolve;
    });

    global.fetch = vi.fn(() => promise);

    const { result } = renderHook(() =>
      useRecruiterChat({ jobId: 'job-123' })
    );

    const askPromise = result.current.askQuestion('worry');

    // Give React time to update state
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(result.current.isLoading).toBe(true);

    resolveResponse({
      ok: true,
      json: () =>
        Promise.resolve({
          question: 'Test',
          answer: 'Test answer',
          risks: [],
          suggestedChanges: [],
          followUpQuestions: [],
          confidence: 0.8,
        }),
    });

    await askPromise;

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle API errors', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            code: 'VALIDATION_ERROR',
            message: 'Invalid question ID',
          }),
      })
    );

    const { result } = renderHook(() =>
      useRecruiterChat({ jobId: 'job-123' })
    );

    result.current.askQuestion('invalid');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('Invalid question ID');
    expect(result.current.answer).toBeNull();
  });

  it('should handle network errors', async () => {
    global.fetch = vi.fn(() =>
      Promise.reject(new Error('Network error'))
    );

    const { result } = renderHook(() =>
      useRecruiterChat({ jobId: 'job-123' })
    );

    result.current.askQuestion('worry');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('Network error');
  });

  it('should require jobId', async () => {
    const { result } = renderHook(() => useRecruiterChat());

    const returnValue = result.current.askQuestion('worry');

    await waitFor(() => {
      expect(result.current.error).toBe('Job ID is required');
    });

    expect(returnValue).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should accept all valid question types', async () => {
    const mockAnswer = {
      question: 'Test question',
      answer: 'Test answer',
      risks: [],
      suggestedChanges: [],
      followUpQuestions: [],
      confidence: 0.8,
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAnswer),
      })
    );

    const { result } = renderHook(() =>
      useRecruiterChat({ jobId: 'job-123' })
    );

    const questions = ['worry', 'weakest', 'interview', 'improve-first'];

    for (const questionId of questions) {
      result.current.askQuestion(questionId);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.answer).toEqual(mockAnswer);
      expect(result.current.error).toBeNull();
    }

    expect(global.fetch).toHaveBeenCalledTimes(4);
  });
});
