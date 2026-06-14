import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JobFitDashboard } from '@client/features/workspace/components/JobFitDashboard';

vi.mock('@client/features/workspace/hooks', () => ({
  useJobFit: vi.fn(),
}));

import { useJobFit } from '@client/features/workspace/hooks';

describe('JobFitDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    (useJobFit as any).mockReturnValue({
      fit: null,
      isLoading: true,
      error: null,
    });

    render(<JobFitDashboard jobId="job-123" />);

    expect(screen.getByText('Job Fit Analysis')).toBeInTheDocument();
    expect(screen.getByText('Analyzing job fit...')).toBeInTheDocument();
  });

  it('should render error state', () => {
    (useJobFit as any).mockReturnValue({
      fit: null,
      isLoading: false,
      error: 'Failed to load job fit analysis',
    });

    render(<JobFitDashboard jobId="job-123" />);

    expect(screen.getByText('Job Fit Analysis')).toBeInTheDocument();
    expect(screen.getByText('Failed to load job fit analysis')).toBeInTheDocument();
  });

  it('should render fit percentage and talking points', () => {
    const mockFit = {
      overallFit: 72,
      confidenceLevel: 'high',
      strongMatches: [
        '5+ years of full-stack development',
        'React and Node.js expertise',
      ],
      weakMatches: ['Limited Kubernetes experience'],
      rejectionRisks: ['Could be screened out'],
      interviewTalkingPoints: [
        'Highlight transferable knowledge',
        'Emphasize learning ability',
      ],
      experienceGaps: [
        {
          requirement: 'Kubernetes',
          hasMatch: false,
          severity: 'critical',
          suggestion: 'Emphasize containerization knowledge',
        },
      ],
      recommendedPositioningAngle: 'Emphasize full-stack expertise',
      likelihood: {
        phoneScreen: 0.82,
        technicalInterview: 0.75,
        offer: 0.68,
      },
    };

    (useJobFit as any).mockReturnValue({
      fit: mockFit,
      isLoading: false,
      error: null,
    });

    render(<JobFitDashboard jobId="job-123" />);

    expect(screen.getByText('Job Fit Analysis')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.getByText('fit')).toBeInTheDocument();
  });

  it('should display all sections', () => {
    const mockFit = {
      overallFit: 72,
      confidenceLevel: 'high',
      strongMatches: ['5+ years of experience'],
      weakMatches: ['Limited Kubernetes'],
      rejectionRisks: ['Could be screened out'],
      interviewTalkingPoints: ['Highlight transferable knowledge'],
      experienceGaps: [],
      recommendedPositioningAngle: 'Emphasize full-stack',
      likelihood: {
        phoneScreen: 0.82,
        technicalInterview: 0.75,
        offer: 0.68,
      },
    };

    (useJobFit as any).mockReturnValue({
      fit: mockFit,
      isLoading: false,
      error: null,
    });

    render(<JobFitDashboard jobId="job-123" />);

    expect(screen.getByText(/Strong Matches/)).toBeInTheDocument();
    expect(screen.getByText(/Weak Matches/)).toBeInTheDocument();
    expect(screen.getByText(/Rejection Risks/)).toBeInTheDocument();
    expect(screen.getByText(/Interview Talking Points/)).toBeInTheDocument();
    expect(screen.getByText(/Recommended Positioning/)).toBeInTheDocument();
    expect(screen.getByText(/Success Likelihood/)).toBeInTheDocument();
  });

  it('should display strong matches list', () => {
    const mockFit = {
      overallFit: 72,
      confidenceLevel: 'high',
      strongMatches: ['5+ years experience', 'React expertise', 'Node.js skills'],
      weakMatches: [],
      rejectionRisks: [],
      interviewTalkingPoints: [],
      experienceGaps: [],
      recommendedPositioningAngle: 'Test angle',
      likelihood: { phoneScreen: 0.8, technicalInterview: 0.7, offer: 0.6 },
    };

    (useJobFit as any).mockReturnValue({
      fit: mockFit,
      isLoading: false,
      error: null,
    });

    render(<JobFitDashboard jobId="job-123" />);

    expect(screen.getByText('5+ years experience')).toBeInTheDocument();
    expect(screen.getByText('React expertise')).toBeInTheDocument();
    expect(screen.getByText('Node.js skills')).toBeInTheDocument();
  });

  it('should display weak matches list', () => {
    const mockFit = {
      overallFit: 72,
      confidenceLevel: 'high',
      strongMatches: [],
      weakMatches: ['Limited Kubernetes', 'No TypeScript experience'],
      rejectionRisks: [],
      interviewTalkingPoints: [],
      experienceGaps: [],
      recommendedPositioningAngle: 'Test angle',
      likelihood: { phoneScreen: 0.8, technicalInterview: 0.7, offer: 0.6 },
    };

    (useJobFit as any).mockReturnValue({
      fit: mockFit,
      isLoading: false,
      error: null,
    });

    render(<JobFitDashboard jobId="job-123" />);

    expect(screen.getByText('Limited Kubernetes')).toBeInTheDocument();
    expect(screen.getByText('No TypeScript experience')).toBeInTheDocument();
  });

  it('should display rejection risks', () => {
    const mockFit = {
      overallFit: 72,
      confidenceLevel: 'high',
      strongMatches: [],
      weakMatches: [],
      rejectionRisks: ['Could be screened out', 'Seniority mismatch'],
      interviewTalkingPoints: [],
      experienceGaps: [],
      recommendedPositioningAngle: 'Test angle',
      likelihood: { phoneScreen: 0.8, technicalInterview: 0.7, offer: 0.6 },
    };

    (useJobFit as any).mockReturnValue({
      fit: mockFit,
      isLoading: false,
      error: null,
    });

    render(<JobFitDashboard jobId="job-123" />);

    expect(screen.getByText(/screened out/)).toBeInTheDocument();
    expect(screen.getByText(/Seniority/)).toBeInTheDocument();
  });

  it('should display interview talking points', () => {
    const mockFit = {
      overallFit: 72,
      confidenceLevel: 'high',
      strongMatches: [],
      weakMatches: [],
      rejectionRisks: [],
      interviewTalkingPoints: [
        'Highlight transferable knowledge',
        'Emphasize learning ability',
      ],
      experienceGaps: [],
      recommendedPositioningAngle: 'Test angle',
      likelihood: { phoneScreen: 0.8, technicalInterview: 0.7, offer: 0.6 },
    };

    (useJobFit as any).mockReturnValue({
      fit: mockFit,
      isLoading: false,
      error: null,
    });

    render(<JobFitDashboard jobId="job-123" />);

    expect(screen.getByText('Highlight transferable knowledge')).toBeInTheDocument();
    expect(screen.getByText('Emphasize learning ability')).toBeInTheDocument();
  });

  it('should display positioning angle', () => {
    const mockFit = {
      overallFit: 72,
      confidenceLevel: 'high',
      strongMatches: [],
      weakMatches: [],
      rejectionRisks: [],
      interviewTalkingPoints: [],
      experienceGaps: [],
      recommendedPositioningAngle: 'Emphasize full-stack expertise and ability to learn',
      likelihood: { phoneScreen: 0.8, technicalInterview: 0.7, offer: 0.6 },
    };

    (useJobFit as any).mockReturnValue({
      fit: mockFit,
      isLoading: false,
      error: null,
    });

    render(<JobFitDashboard jobId="job-123" />);

    expect(screen.getByText('Emphasize full-stack expertise and ability to learn')).toBeInTheDocument();
  });

  it('should display success likelihood percentages', () => {
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

    (useJobFit as any).mockReturnValue({
      fit: mockFit,
      isLoading: false,
      error: null,
    });

    render(<JobFitDashboard jobId="job-123" />);

    expect(screen.getByText('Phone Screen')).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText('Tech Interview')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Offer')).toBeInTheDocument();
    expect(screen.getByText('68%')).toBeInTheDocument();
  });

  it('should display confidence level', () => {
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

    (useJobFit as any).mockReturnValue({
      fit: mockFit,
      isLoading: false,
      error: null,
    });

    render(<JobFitDashboard jobId="job-123" />);

    expect(screen.getByText('High Confidence')).toBeInTheDocument();
  });

  it('should handle undefined jobId', () => {
    (useJobFit as any).mockReturnValue({
      fit: null,
      isLoading: false,
      error: null,
    });

    render(<JobFitDashboard jobId={undefined} />);

    expect(screen.getByText('Job Fit Analysis')).toBeInTheDocument();
  });
});
