import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHeatmap } from '@client/features/workspace/hooks/useHeatmap';

describe('useHeatmap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with null heatmap', () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sections: [] }),
    });

    const { result } = renderHook(() => useHeatmap(undefined));

    expect(result.current.heatmap).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fetch heatmap data when jobId is provided', async () => {
    const mockHeatmap = {
      overallVisibility: 78,
      sections: [
        {
          sectionName: 'Summary',
          visibilityScore: 95,
          recruiterConfidence: 'high',
          riskLevel: 'low',
          keyObservations: ['Clear'],
          recommendedImprovement: 'Add metrics',
          isVisible: true,
        },
      ],
      sixSecondSkim: ['Current role', 'Company name'],
      skippedSections: [],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHeatmap,
    });

    const { result } = renderHook(() => useHeatmap('job-123'));

    await waitFor(() => {
      expect(result.current.heatmap).toBeDefined();
    });

    expect(result.current.heatmap?.overallVisibility).toBe(78);
    expect(result.current.heatmap?.sections.length).toBe(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/workspace/job-123/heatmap');
  });

  it('should handle fetch errors', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useHeatmap('job-123'));

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

    const { result } = renderHook(() => useHeatmap('job-123'));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error).toBe('Failed to load recruiter heatmap');
  });

  it('should provide reload function', async () => {
    const mockHeatmap = {
      overallVisibility: 78,
      sections: [],
      sixSecondSkim: [],
      skippedSections: [],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockHeatmap,
    });

    const { result } = renderHook(() => useHeatmap('job-123'));

    await waitFor(() => {
      expect(result.current.heatmap).toBeDefined();
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

    const { result } = renderHook(() => useHeatmap('job-123'));

    expect(result.current.isLoading).toBe(true);

    resolveJson({
      overallVisibility: 78,
      sections: [],
      sixSecondSkim: [],
      skippedSections: [],
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should clear heatmap when jobId becomes undefined', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        overallVisibility: 78,
        sections: [],
        sixSecondSkim: [],
        skippedSections: [],
      }),
    });

    const { result, rerender } = renderHook(
      ({ jobId }: { jobId?: string }) => useHeatmap(jobId),
      { initialProps: { jobId: 'job-123' } }
    );

    await waitFor(() => {
      expect(result.current.heatmap).toBeDefined();
    });

    rerender({ jobId: undefined });

    expect(result.current.heatmap).toBeNull();
  });

  it('should return mock data on fetch error', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useHeatmap('job-123'));

    await waitFor(() => {
      expect(result.current.heatmap).toBeDefined();
    });

    expect(result.current.heatmap?.overallVisibility).toBeDefined();
    expect(result.current.heatmap?.sections).toBeDefined();
    expect(result.current.heatmap?.sixSecondSkim).toBeDefined();
  });

  it('should include all 7 heatmap sections in mock data', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useHeatmap('job-123'));

    await waitFor(() => {
      expect(result.current.heatmap).toBeDefined();
    });

    // Mock should have 7 sections
    expect(result.current.heatmap?.sections.length).toBeGreaterThanOrEqual(7);

    const sectionNames = result.current.heatmap!.sections.map(s => s.sectionName);
    expect(sectionNames).toContain('Summary');
    expect(sectionNames).toContain('Experience');
    expect(sectionNames).toContain('Skills');
  });

  it('should have visibility scores for each section', async () => {
    const mockHeatmap = {
      overallVisibility: 78,
      sections: [
        {
          sectionName: 'Summary',
          visibilityScore: 95,
          recruiterConfidence: 'high',
          riskLevel: 'low',
          keyObservations: [],
          recommendedImprovement: 'Add metrics',
          isVisible: true,
        },
        {
          sectionName: 'Experience',
          visibilityScore: 85,
          recruiterConfidence: 'high',
          riskLevel: 'low',
          keyObservations: [],
          recommendedImprovement: 'Add outcomes',
          isVisible: true,
        },
      ],
      sixSecondSkim: [],
      skippedSections: [],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockHeatmap,
    });

    const { result } = renderHook(() => useHeatmap('job-123'));

    await waitFor(() => {
      expect(result.current.heatmap?.sections.length).toBe(2);
    });

    const summarySection = result.current.heatmap!.sections[0];
    expect(summarySection.visibilityScore).toBe(95);
    expect(summarySection.recruiterConfidence).toBe('high');
  });
});
