import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWorkspaceScore } from '@client/features/workspace/hooks/useWorkspaceScore';

describe('useWorkspaceScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with null score and no loading', () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ total: 85 }),
    });

    const { result } = renderHook(() => useWorkspaceScore(undefined));

    expect(result.current.score).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fetch score when jobId is provided', async () => {
    const mockScore = {
      total: 85,
      maxScore: 100,
      confidence: 0.9,
      categories: {
        atsKeywordMatch: { name: 'ATS', score: 85, maxScore: 100, explanation: 'Good' },
        roleAlignment: { name: 'Role', score: 85, maxScore: 100, explanation: 'Good' },
        seniorityAlignment: { name: 'Seniority', score: 85, maxScore: 100, explanation: 'Good' },
        impactMetrics: { name: 'Impact', score: 85, maxScore: 100, explanation: 'Good' },
        recruiterReadability: { name: 'Readability', score: 85, maxScore: 100, explanation: 'Good' },
        formattingQuality: { name: 'Format', score: 85, maxScore: 100, explanation: 'Good' },
      },
      recommendations: ['Add metrics'],
      updatedAt: new Date().toISOString(),
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockScore,
    });

    const { result } = renderHook(() => useWorkspaceScore('job-123'));

    await waitFor(() => {
      expect(result.current.score).toBeDefined();
    });

    expect(result.current.score?.total).toBe(85);
    expect(global.fetch).toHaveBeenCalledWith('/api/workspace/job-123/score');
  });

  it('should handle fetch errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useWorkspaceScore('job-123'));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error).toBe('Network error');
  });

  it('should handle non-ok response', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => useWorkspaceScore('job-123'));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error).toBe('Failed to load resume score');
  });

  it('should provide reload function', async () => {
    const mockScore = {
      total: 85,
      maxScore: 100,
      confidence: 0.9,
      categories: {
        atsKeywordMatch: { name: 'ATS', score: 85, maxScore: 100, explanation: 'Good' },
        roleAlignment: { name: 'Role', score: 85, maxScore: 100, explanation: 'Good' },
        seniorityAlignment: { name: 'Seniority', score: 85, maxScore: 100, explanation: 'Good' },
        impactMetrics: { name: 'Impact', score: 85, maxScore: 100, explanation: 'Good' },
        recruiterReadability: { name: 'Readability', score: 85, maxScore: 100, explanation: 'Good' },
        formattingQuality: { name: 'Format', score: 85, maxScore: 100, explanation: 'Good' },
      },
      recommendations: [],
      updatedAt: new Date().toISOString(),
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockScore,
    });

    const { result } = renderHook(() => useWorkspaceScore('job-123'));

    await waitFor(() => {
      expect(result.current.score).toBeDefined();
    });

    expect(result.current.reload).toBeDefined();
    expect(typeof result.current.reload).toBe('function');
  });

  it('should set loading state during fetch', async () => {
    let resolveJson: any;
    const jsonPromise = new Promise(resolve => {
      resolveJson = resolve;
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => jsonPromise,
    });

    const { result } = renderHook(() => useWorkspaceScore('job-123'));

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Resolve the fetch
    resolveJson({
      total: 85,
      maxScore: 100,
      confidence: 0.9,
      categories: {
        atsKeywordMatch: { name: 'ATS', score: 85, maxScore: 100, explanation: 'Good' },
        roleAlignment: { name: 'Role', score: 85, maxScore: 100, explanation: 'Good' },
        seniorityAlignment: { name: 'Seniority', score: 85, maxScore: 100, explanation: 'Good' },
        impactMetrics: { name: 'Impact', score: 85, maxScore: 100, explanation: 'Good' },
        recruiterReadability: { name: 'Readability', score: 85, maxScore: 100, explanation: 'Good' },
        formattingQuality: { name: 'Format', score: 85, maxScore: 100, explanation: 'Good' },
      },
      recommendations: [],
      updatedAt: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should clear score when jobId becomes undefined', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total: 85,
        maxScore: 100,
        confidence: 0.9,
        categories: {
          atsKeywordMatch: { name: 'ATS', score: 85, maxScore: 100, explanation: 'Good' },
          roleAlignment: { name: 'Role', score: 85, maxScore: 100, explanation: 'Good' },
          seniorityAlignment: { name: 'Seniority', score: 85, maxScore: 100, explanation: 'Good' },
          impactMetrics: { name: 'Impact', score: 85, maxScore: 100, explanation: 'Good' },
          recruiterReadability: { name: 'Readability', score: 85, maxScore: 100, explanation: 'Good' },
          formattingQuality: { name: 'Format', score: 85, maxScore: 100, explanation: 'Good' },
        },
        recommendations: [],
        updatedAt: new Date().toISOString(),
      }),
    });

    const { result, rerender } = renderHook(
      ({ jobId }: { jobId?: string }) => useWorkspaceScore(jobId),
      { initialProps: { jobId: 'job-123' } }
    );

    await waitFor(() => {
      expect(result.current.score).toBeDefined();
    });

    // Change to undefined jobId
    rerender({ jobId: undefined });

    expect(result.current.score).toBeNull();
  });

  it('should return mock data on fetch error', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useWorkspaceScore('job-123'));

    await waitFor(() => {
      expect(result.current.score).toBeDefined();
    });

    // Should have mock data structure
    expect(result.current.score?.total).toBe(72);
    expect(result.current.score?.categories).toBeDefined();
    expect(result.current.score?.recommendations).toBeDefined();
  });

  it('should update error state and provide mock on failure', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Failed'));

    const { result } = renderHook(() => useWorkspaceScore('job-123'));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error).toBe('Failed');
    expect(result.current.score).toBeDefined(); // Mock fallback
  });
});
