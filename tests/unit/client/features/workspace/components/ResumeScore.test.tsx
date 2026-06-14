import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResumeScore } from '@client/features/workspace/components/ResumeScore';

// Mock the hook
vi.mock('@client/features/workspace/hooks', () => ({
  useWorkspaceScore: vi.fn(),
}));

import { useWorkspaceScore } from '@client/features/workspace/hooks';

describe('ResumeScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure the hook mock is set up properly
    (useWorkspaceScore as any).mockReturnValue({
      score: null,
      isLoading: false,
      error: null,
    });
  });

  it('should render loading state', () => {
    (useWorkspaceScore as any).mockReturnValue({
      score: null,
      isLoading: true,
      error: null,
    });

    render(<ResumeScore jobId="job-123" />);

    expect(screen.getByText('Resume Score')).toBeInTheDocument();
    expect(screen.getByText('Loading score analysis...')).toBeInTheDocument();
  });

  it('should render error state', () => {
    (useWorkspaceScore as any).mockReturnValue({
      score: null,
      isLoading: false,
      error: 'Failed to load resume score',
    });

    render(<ResumeScore jobId="job-123" />);

    expect(screen.getByText('Resume Score')).toBeInTheDocument();
    expect(screen.getByText('Failed to load resume score')).toBeInTheDocument();
  });

  it('should render with mock score data', () => {
    const mockScore = {
      total: 72,
      maxScore: 100,
      confidence: 0.9,
      categories: {
        atsKeywordMatch: {
          name: 'ATS Keyword Match',
          score: 78,
          maxScore: 100,
          explanation: 'Good coverage',
        },
        roleAlignment: {
          name: 'Role Alignment',
          score: 85,
          maxScore: 100,
          explanation: 'Strong match',
        },
        seniorityAlignment: {
          name: 'Seniority Alignment',
          score: 70,
          maxScore: 100,
          explanation: 'Matches level',
        },
        impactMetrics: {
          name: 'Impact Metrics',
          score: 65,
          maxScore: 100,
          explanation: 'Could improve',
        },
        recruiterReadability: {
          name: 'Recruiter Readability',
          score: 75,
          maxScore: 100,
          explanation: 'Clear structure',
        },
        formattingQuality: {
          name: 'Formatting Quality',
          score: 70,
          maxScore: 100,
          explanation: 'Good format',
        },
      },
      recommendations: ['Add more metrics', 'Enhance keywords'],
      updatedAt: new Date().toISOString(),
    };

    (useWorkspaceScore as any).mockReturnValue({
      score: mockScore,
      isLoading: false,
      error: null,
    });

    render(<ResumeScore jobId="job-123" />);

    expect(screen.getByText('Resume Score')).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('Add more metrics')).toBeInTheDocument();
    expect(screen.getByText('ATS Keyword Match')).toBeInTheDocument();
  });

  it('should render all category scores', () => {
    const mockScore = {
      total: 72,
      maxScore: 100,
      confidence: 0.85,
      categories: {
        atsKeywordMatch: {
          name: 'ATS Keyword Match',
          score: 78,
          maxScore: 100,
          explanation: 'Good coverage',
        },
        roleAlignment: {
          name: 'Role Alignment',
          score: 85,
          maxScore: 100,
          explanation: 'Strong match',
        },
        seniorityAlignment: {
          name: 'Seniority Alignment',
          score: 70,
          maxScore: 100,
          explanation: 'Matches mid-level',
        },
        impactMetrics: {
          name: 'Impact Metrics',
          score: 65,
          maxScore: 100,
          explanation: 'Could improve',
        },
        recruiterReadability: {
          name: 'Recruiter Readability',
          score: 75,
          maxScore: 100,
          explanation: 'Clear structure',
        },
        formattingQuality: {
          name: 'Formatting Quality',
          score: 70,
          maxScore: 100,
          explanation: 'All sections present',
        },
      },
      recommendations: ['Add metrics'],
      updatedAt: new Date().toISOString(),
    };

    (useWorkspaceScore as any).mockReturnValue({
      score: mockScore,
      isLoading: false,
      error: null,
    });

    render(<ResumeScore jobId="job-123" />);

    expect(screen.getByText('ATS Keyword Match')).toBeInTheDocument();
    expect(screen.getByText('Role Alignment')).toBeInTheDocument();
    expect(screen.getByText('Seniority Alignment')).toBeInTheDocument();
    expect(screen.getByText('Impact Metrics')).toBeInTheDocument();
    expect(screen.getByText('Recruiter Readability')).toBeInTheDocument();
    expect(screen.getByText('Formatting Quality')).toBeInTheDocument();
  });

  it('should handle undefined jobId', () => {
    (useWorkspaceScore as any).mockReturnValue({
      score: null,
      isLoading: false,
      error: null,
    });

    render(<ResumeScore jobId={undefined} />);

    expect(screen.getByText('Resume Score')).toBeInTheDocument();
    expect(screen.getByText('No score data available')).toBeInTheDocument();
  });

  it('should display confidence levels correctly', () => {
    const mockScore = {
      total: 85,
      maxScore: 100,
      confidence: 0.95,
      categories: {
        atsKeywordMatch: { name: 'ATS', score: 85, maxScore: 100, explanation: 'Good' },
        roleAlignment: { name: 'Role', score: 85, maxScore: 100, explanation: 'Good' },
        seniorityAlignment: { name: 'Seniority', score: 85, maxScore: 100, explanation: 'Good' },
        impactMetrics: { name: 'Impact', score: 85, maxScore: 100, explanation: 'Good' },
        recruiterReadability: { name: 'Readability', score: 85, maxScore: 100, explanation: 'Good' },
        formattingQuality: { name: 'Formatting', score: 85, maxScore: 100, explanation: 'Good' },
      },
      recommendations: [],
      updatedAt: new Date().toISOString(),
    };

    (useWorkspaceScore as any).mockReturnValue({
      score: mockScore,
      isLoading: false,
      error: null,
    });

    render(<ResumeScore jobId="job-123" />);

    expect(screen.getByText(/High Confidence|95%/)).toBeInTheDocument();
  });
});
