import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MissingKeywords } from '@client/features/workspace/components/MissingKeywords';

vi.mock('@client/features/workspace/hooks', () => ({
  useKeywordAnalysis: vi.fn(),
}));

import { useKeywordAnalysis } from '@client/features/workspace/hooks';

describe('MissingKeywords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    (useKeywordAnalysis as any).mockReturnValue({
      analysis: null,
      isLoading: true,
      error: null,
    });

    render(<MissingKeywords jobId="job-123" />);

    expect(screen.getByText('Missing Keywords')).toBeInTheDocument();
    expect(screen.getByText('Analyzing keywords...')).toBeInTheDocument();
  });

  it('should render error state', () => {
    (useKeywordAnalysis as any).mockReturnValue({
      analysis: null,
      isLoading: false,
      error: 'Failed to analyze keywords',
    });

    render(<MissingKeywords jobId="job-123" />);

    expect(screen.getByText('Missing Keywords')).toBeInTheDocument();
    expect(screen.getByText('Failed to analyze keywords')).toBeInTheDocument();
  });

  it('should render keyword list with critical filter', () => {
    const mockAnalysis = {
      missingKeywords: [
        {
          keyword: 'Kubernetes',
          importance: 'critical',
          status: 'missing',
          frequency: { inJob: 5, inResume: 0 },
          suggestedPlacement: 'skills',
          suggestedLanguage: 'Kubernetes expertise',
        },
        {
          keyword: 'Docker',
          importance: 'high',
          status: 'weak',
          frequency: { inJob: 4, inResume: 1 },
          suggestedPlacement: 'skills',
          suggestedLanguage: 'Docker experience',
        },
      ],
      totalKeywordsInJob: 50,
      matchedCount: 30,
      matchPercentage: 60,
      summary: 'Missing key terms',
    };

    (useKeywordAnalysis as any).mockReturnValue({
      analysis: mockAnalysis,
      isLoading: false,
      error: null,
    });

    render(<MissingKeywords jobId="job-123" />);

    expect(screen.getByText('Missing Keywords')).toBeInTheDocument();
    expect(screen.getByText('Kubernetes')).toBeInTheDocument();
    expect(screen.getByText('Docker')).toBeInTheDocument();
    expect(screen.getByText('30/50 matched (60%)')).toBeInTheDocument();
  });

  it('should filter by critical importance', () => {
    const mockAnalysis = {
      missingKeywords: [
        {
          keyword: 'Kubernetes',
          importance: 'critical',
          status: 'missing',
          frequency: { inJob: 5, inResume: 0 },
          suggestedPlacement: 'skills',
          suggestedLanguage: 'Kubernetes expertise',
        },
        {
          keyword: 'Docker',
          importance: 'high',
          status: 'weak',
          frequency: { inJob: 4, inResume: 1 },
          suggestedPlacement: 'skills',
          suggestedLanguage: 'Docker experience',
        },
        {
          keyword: 'TypeScript',
          importance: 'medium',
          status: 'missing',
          frequency: { inJob: 3, inResume: 0 },
          suggestedPlacement: 'skills',
          suggestedLanguage: 'TypeScript skills',
        },
      ],
      totalKeywordsInJob: 50,
      matchedCount: 30,
      matchPercentage: 60,
      summary: 'Missing key terms',
    };

    (useKeywordAnalysis as any).mockReturnValue({
      analysis: mockAnalysis,
      isLoading: false,
      error: null,
    });

    const { container } = render(<MissingKeywords jobId="job-123" />);

    // Click critical filter button
    const criticalButton = screen.getByText('Critical (1)');
    fireEvent.click(criticalButton);

    expect(screen.getByText('Kubernetes')).toBeInTheDocument();
  });

  it('should show all filter tabs', () => {
    const mockAnalysis = {
      missingKeywords: [
        {
          keyword: 'Kubernetes',
          importance: 'critical',
          status: 'missing',
          frequency: { inJob: 5, inResume: 0 },
          suggestedPlacement: 'skills',
          suggestedLanguage: 'Kubernetes expertise',
        },
      ],
      totalKeywordsInJob: 50,
      matchedCount: 30,
      matchPercentage: 60,
      summary: 'Missing key terms',
    };

    (useKeywordAnalysis as any).mockReturnValue({
      analysis: mockAnalysis,
      isLoading: false,
      error: null,
    });

    render(<MissingKeywords jobId="job-123" />);

    expect(screen.getByText(/All \(/)).toBeInTheDocument();
    expect(screen.getByText(/Critical \(/)).toBeInTheDocument();
    expect(screen.getByText(/Missing \(/)).toBeInTheDocument();
  });

  it('should display action buttons', () => {
    const mockAnalysis = {
      missingKeywords: [
        {
          keyword: 'Kubernetes',
          importance: 'critical',
          status: 'missing',
          frequency: { inJob: 5, inResume: 0 },
          suggestedPlacement: 'skills',
          suggestedLanguage: 'Kubernetes expertise',
        },
      ],
      totalKeywordsInJob: 50,
      matchedCount: 30,
      matchPercentage: 60,
      summary: 'Missing key terms',
    };

    (useKeywordAnalysis as any).mockReturnValue({
      analysis: mockAnalysis,
      isLoading: false,
      error: null,
    });

    render(<MissingKeywords jobId="job-123" />);

    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Add to Resume')).toBeInTheDocument();
    expect(screen.getByText('Ignore')).toBeInTheDocument();
  });

  it('should show empty state when no keywords', () => {
    (useKeywordAnalysis as any).mockReturnValue({
      analysis: {
        missingKeywords: [],
        totalKeywordsInJob: 50,
        matchedCount: 50,
        matchPercentage: 100,
        summary: 'All keywords matched',
      },
      isLoading: false,
      error: null,
    });

    render(<MissingKeywords jobId="job-123" />);

    expect(screen.getByText('Great! Your resume covers the essential keywords.')).toBeInTheDocument();
  });

  it('should expand and collapse keyword details', () => {
    const mockAnalysis = {
      missingKeywords: [
        {
          keyword: 'Kubernetes',
          importance: 'critical',
          status: 'missing',
          frequency: { inJob: 5, inResume: 0 },
          suggestedPlacement: 'skills',
          suggestedLanguage: 'Kubernetes expertise',
        },
      ],
      totalKeywordsInJob: 50,
      matchedCount: 30,
      matchPercentage: 60,
      summary: 'Missing key terms',
    };

    (useKeywordAnalysis as any).mockReturnValue({
      analysis: mockAnalysis,
      isLoading: false,
      error: null,
    });

    const { rerender } = render(<MissingKeywords jobId="job-123" />);

    const reviewButton = screen.getByText('Review');
    fireEvent.click(reviewButton);

    // After clicking, button should change to "Hide"
    const hideButton = screen.queryByText('Hide');
    expect(hideButton).toBeTruthy();
  });

  it('should handle undefined jobId', () => {
    (useKeywordAnalysis as any).mockReturnValue({
      analysis: null,
      isLoading: false,
      error: null,
    });

    render(<MissingKeywords jobId={undefined} />);

    expect(screen.getByText('Missing Keywords')).toBeInTheDocument();
  });

  it('should display keyword importance badges', () => {
    const mockAnalysis = {
      missingKeywords: [
        {
          keyword: 'Kubernetes',
          importance: 'critical',
          status: 'missing',
          frequency: { inJob: 5, inResume: 0 },
          suggestedPlacement: 'skills',
          suggestedLanguage: 'Kubernetes expertise',
        },
      ],
      totalKeywordsInJob: 50,
      matchedCount: 30,
      matchPercentage: 60,
      summary: 'Missing key terms',
    };

    (useKeywordAnalysis as any).mockReturnValue({
      analysis: mockAnalysis,
      isLoading: false,
      error: null,
    });

    render(<MissingKeywords jobId="job-123" />);

    expect(screen.getByText('Critical')).toBeInTheDocument();
  });
});
