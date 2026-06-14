import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useJobFit } from '@client/features/workspace/hooks/useJobFit';

describe('useJobFit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with null fit', () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ overallFit: 72 }),
    });

    const { result } = renderHook(() => useJobFit(undefined));

    expect(result.current.fit).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fetch job fit analysis when jobId is provided', async () => {
    const mockFit = {
      overallFit: 72,
      confidenceLevel: 'high',
      strongMatches: ['5+ years experience'],
      weakMatches: ['Limited Kubernetes'],
      rejectionRisks: [],
      interviewTalkingPoints: [],
      experienceGaps: [],
      recommendedPositioningAngle: 'Test angle',
      likelihood: {
        phoneScreen: 0.82,
        technicalInterview: 0.75,
        offer: 0.68,
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFit,
    });

    const { result } = renderHook(() => useJobFit('job-123'));

    await waitFor(() => {
      expect(result.current.fit).toBeDefined();
    });

    expect(result.current.fit?.overallFit).toBe(72);
    expect(result.current.fit?.confidenceLevel).toBe('high');
    expect(global.fetch).toHaveBeenCalledWith('/api/workspace/job-123/fit');
  });

  it('should handle fetch errors', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useJobFit('job-123'));

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

    const { result } = renderHook(() => useJobFit('job-123'));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error).toBe('Failed to load job fit analysis');
  });

  it('should provide reload function', async () => {
    const mockFit = {
      overallFit: 72,
      confidenceLevel: 'high',
      strongMatches: [],
      weakMatches: [],
      rejectionRisks: [],
      interviewTalkingPoints: [],
      experienceGaps: [],
      recommendedPositioningAngle: 'Test',
      likelihood: { phoneScreen: 0.8, technicalInterview: 0.7, offer: 0.6 },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockFit,
    });

    const { result } = renderHook(() => useJobFit('job-123'));

    await waitFor(() => {
      expect(result.current.fit).toBeDefined();
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

    const { result } = renderHook(() => useJobFit('job-123'));

    expect(result.current.isLoading).toBe(true);

    resolveJson({
      overallFit: 72,
      confidenceLevel: 'high',
      strongMatches: [],
      weakMatches: [],
      rejectionRisks: [],
      interviewTalkingPoints: [],
      experienceGaps: [],
      recommendedPositioningAngle: 'Test',
      likelihood: { phoneScreen: 0.8, technicalInterview: 0.7, offer: 0.6 },
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should clear fit when jobId becomes undefined', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        overallFit: 72,
        confidenceLevel: 'high',
        strongMatches: [],
        weakMatches: [],
        rejectionRisks: [],
        interviewTalkingPoints: [],
        experienceGaps: [],
        recommendedPositioningAngle: 'Test',
        likelihood: { phoneScreen: 0.8, technicalInterview: 0.7, offer: 0.6 },
      }),
    });

    const { result, rerender } = renderHook(
      ({ jobId }: { jobId?: string }) => useJobFit(jobId),
      { initialProps: { jobId: 'job-123' } }
    );

    await waitFor(() => {
      expect(result.current.fit).toBeDefined();
    });

    rerender({ jobId: undefined });

    expect(result.current.fit).toBeNull();
  });

  it('should return mock data on fetch error', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useJobFit('job-123'));

    await waitFor(() => {
      expect(result.current.fit).toBeDefined();
    });

    expect(result.current.fit?.overallFit).toBeDefined();
    expect(result.current.fit?.strongMatches).toBeDefined();
    expect(result.current.fit?.likelihood).toBeDefined();
  });

  it('should include all analysis sections', async () => {
    const mockFit = {
      overallFit: 72,
      confidenceLevel: 'high',
      strongMatches: ['Strength 1'],
      weakMatches: ['Weakness 1'],
      rejectionRisks: ['Risk 1'],
      interviewTalkingPoints: ['Point 1'],
      experienceGaps: [
        {
          requirement: 'Kubernetes',
          hasMatch: false,
          severity: 'critical',
          suggestion: 'Learn it',
        },
      ],
      recommendedPositioningAngle: 'Position as X',
      likelihood: {
        phoneScreen: 0.82,
        technicalInterview: 0.75,
        offer: 0.68,
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFit,
    });

    const { result } = renderHook(() => useJobFit('job-123'));

    await waitFor(() => {
      expect(result.current.fit).toBeDefined();
    });

    expect(result.current.fit?.strongMatches).toBeDefined();
    expect(result.current.fit?.weakMatches).toBeDefined();
    expect(result.current.fit?.rejectionRisks).toBeDefined();
    expect(result.current.fit?.interviewTalkingPoints).toBeDefined();
    expect(result.current.fit?.experienceGaps).toBeDefined();
    expect(result.current.fit?.recommendedPositioningAngle).toBeDefined();
    expect(result.current.fit?.likelihood).toBeDefined();
  });

  it('should have likelihood probabilities', async () => {
    const mockFit = {
      overallFit: 72,
      confidenceLevel: 'high',
      strongMatches: [],
      weakMatches: [],
      rejectionRisks: [],
      interviewTalkingPoints: [],
      experienceGaps: [],
      recommendedPositioningAngle: 'Test',
      likelihood: {
        phoneScreen: 0.82,
        technicalInterview: 0.75,
        offer: 0.68,
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFit,
    });

    const { result } = renderHook(() => useJobFit('job-123'));

    await waitFor(() => {
      expect(result.current.fit?.likelihood).toBeDefined();
    });

    expect(result.current.fit?.likelihood.phoneScreen).toBe(0.82);
    expect(result.current.fit?.likelihood.technicalInterview).toBe(0.75);
    expect(result.current.fit?.likelihood.offer).toBe(0.68);
  });
});
