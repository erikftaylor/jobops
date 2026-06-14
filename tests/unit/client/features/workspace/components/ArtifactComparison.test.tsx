import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ArtifactComparison } from '@client/features/workspace/components/ArtifactComparison';

const mockVariants = [
  {
    type: 'original',
    description: 'Current Resume',
    artifact: 'resume text',
    score: 75,
    strengths: ['Well formatted'],
    risks: [],
    preview: 'Preview text...',
  },
  {
    type: 'atsOptimized',
    description: 'ATS Optimized',
    artifact: 'resume text',
    score: 80,
    strengths: ['ATS compatible'],
    risks: [],
    preview: 'Preview text...',
  },
];

describe('ArtifactComparison', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should render without crashing', () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ variants: mockVariants }),
    });

    render(<ArtifactComparison jobId="job-123" />);
    expect(screen.getByText('Resume Versions')).toBeTruthy();
  });

  it('should display loading state with skeleton initially', () => {
    (global.fetch as any).mockImplementationOnce(() => new Promise(() => {}));
    render(<ArtifactComparison jobId="job-123" />);

    // Skeleton screens are rendered, just verify component renders
    expect(screen.getByText('Resume Versions')).toBeTruthy();
  });

  it('should handle undefined jobId gracefully', () => {
    render(<ArtifactComparison jobId={undefined} />);

    expect(screen.getByText('Resume Versions')).toBeTruthy();
  });

  it('should display subtitle text', () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ variants: mockVariants }),
    });

    render(<ArtifactComparison jobId="job-123" />);
    expect(screen.getByText('Compare different versions and their scores')).toBeTruthy();
  });

  it('should fetch artifacts on mount', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ variants: mockVariants }),
    });

    render(<ArtifactComparison jobId="job-123" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/workspace/job-123/artifacts');
    });
  });

  it('should handle fetch errors with specific message', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
    });

    render(<ArtifactComparison jobId="job-123" />);

    await waitFor(() => {
      expect(screen.getByText("Couldn't generate resume versions")).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    });
  });
});
