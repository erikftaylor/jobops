import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useKeywordAnalysis } from '@client/features/workspace/hooks/useKeywordAnalysis';

describe('useKeywordAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with null analysis', () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ missingKeywords: [] }),
    });

    const { result } = renderHook(() => useKeywordAnalysis(undefined));

    expect(result.current.analysis).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fetch keyword analysis when jobId is provided', async () => {
    const mockAnalysis = {
      missingKeywords: [
        {
          keyword: 'Kubernetes',
          importance: 'critical',
          status: 'missing',
          frequency: { inJob: 5, inResume: 0 },
          suggestedPlacement: 'skills',
          suggestedLanguage: 'Container orchestration',
        },
      ],
      totalKeywordsInJob: 50,
      matchedCount: 40,
      matchPercentage: 80,
      summary: 'Missing critical keywords',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalysis,
    });

    const { result } = renderHook(() => useKeywordAnalysis('job-123'));

    await waitFor(() => {
      expect(result.current.analysis).toBeDefined();
    });

    expect(result.current.analysis?.missingKeywords.length).toBe(1);
    expect(result.current.analysis?.missingKeywords[0].keyword).toBe('Kubernetes');
    expect(global.fetch).toHaveBeenCalledWith('/api/workspace/job-123/keywords');
  });

  it('should handle fetch errors', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useKeywordAnalysis('job-123'));

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

    const { result } = renderHook(() => useKeywordAnalysis('job-123'));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error).toBe('Failed to load keyword analysis');
  });

  it('should provide reload function', async () => {
    const mockAnalysis = {
      missingKeywords: [],
      totalKeywordsInJob: 50,
      matchedCount: 50,
      matchPercentage: 100,
      summary: 'Perfect match',
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockAnalysis,
    });

    const { result } = renderHook(() => useKeywordAnalysis('job-123'));

    await waitFor(() => {
      expect(result.current.analysis).toBeDefined();
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

    const { result } = renderHook(() => useKeywordAnalysis('job-123'));

    expect(result.current.isLoading).toBe(true);

    resolveJson({
      missingKeywords: [],
      totalKeywordsInJob: 50,
      matchedCount: 50,
      matchPercentage: 100,
      summary: 'Perfect',
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should clear analysis when jobId becomes undefined', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        missingKeywords: [],
        totalKeywordsInJob: 50,
        matchedCount: 50,
        matchPercentage: 100,
        summary: 'Perfect',
      }),
    });

    const { result, rerender } = renderHook(
      ({ jobId }: { jobId?: string }) => useKeywordAnalysis(jobId),
      { initialProps: { jobId: 'job-123' } }
    );

    await waitFor(() => {
      expect(result.current.analysis).toBeDefined();
    });

    rerender({ jobId: undefined });

    expect(result.current.analysis).toBeNull();
  });

  it('should return mock data on fetch error', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useKeywordAnalysis('job-123'));

    await waitFor(() => {
      expect(result.current.analysis).toBeDefined();
    });

    expect(result.current.analysis?.missingKeywords).toBeDefined();
    expect(result.current.analysis?.totalKeywordsInJob).toBeDefined();
    expect(result.current.analysis?.matchPercentage).toBeDefined();
  });

  it('should include keywords with various importance levels', async () => {
    const mockAnalysis = {
      missingKeywords: [
        {
          keyword: 'Kubernetes',
          importance: 'critical',
          status: 'missing',
          frequency: { inJob: 5, inResume: 0 },
          suggestedPlacement: 'skills',
          suggestedLanguage: 'Kubernetes',
        },
        {
          keyword: 'Docker',
          importance: 'high',
          status: 'weak',
          frequency: { inJob: 4, inResume: 1 },
          suggestedPlacement: 'skills',
          suggestedLanguage: 'Docker',
        },
      ],
      totalKeywordsInJob: 50,
      matchedCount: 40,
      matchPercentage: 80,
      summary: 'Missing keywords',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalysis,
    });

    const { result } = renderHook(() => useKeywordAnalysis('job-123'));

    await waitFor(() => {
      expect(result.current.analysis?.missingKeywords.length).toBe(2);
    });

    const criticalKeywords = result.current.analysis!.missingKeywords.filter(
      k => k.importance === 'critical'
    );
    expect(criticalKeywords.length).toBe(1);
  });
});
