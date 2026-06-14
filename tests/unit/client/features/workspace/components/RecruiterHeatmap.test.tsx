import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecruiterHeatmap } from '@client/features/workspace/components/RecruiterHeatmap';

vi.mock('@client/features/workspace/hooks', () => ({
  useHeatmap: vi.fn(),
}));

import { useHeatmap } from '@client/features/workspace/hooks';

describe('RecruiterHeatmap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state with skeleton', () => {
    (useHeatmap as any).mockReturnValue({
      heatmap: null,
      isLoading: true,
      error: null,
    });

    render(<RecruiterHeatmap jobId="job-123" />);

    expect(screen.getByText('Recruiter Heatmap')).toBeInTheDocument();
    // Skeleton screens rendered, verify no errors
    expect(screen.getByRole('heading', { name: 'Recruiter Heatmap' })).toBeInTheDocument();
  });

  it('should render error state with retry', () => {
    (useHeatmap as any).mockReturnValue({
      heatmap: null,
      isLoading: false,
      error: 'Failed to fetch heatmap',
    });

    render(<RecruiterHeatmap jobId="job-123" />);

    expect(screen.getByText('Recruiter Heatmap')).toBeInTheDocument();
    expect(screen.getByText("Couldn't analyze visibility")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('should render all 7 heatmap sections', () => {
    const mockHeatmap = {
      overallVisibility: 78,
      sections: [
        {
          sectionName: 'Summary',
          visibilityScore: 95,
          recruiterConfidence: 'high',
          riskLevel: 'low',
          keyObservations: ['Clear and concise'],
          recommendedImprovement: 'Add metrics',
          isVisible: true,
        },
        {
          sectionName: 'Experience',
          visibilityScore: 85,
          recruiterConfidence: 'high',
          riskLevel: 'low',
          keyObservations: ['Well-structured'],
          recommendedImprovement: 'Add outcomes',
          isVisible: true,
        },
        {
          sectionName: 'Skills',
          visibilityScore: 70,
          recruiterConfidence: 'medium',
          riskLevel: 'medium',
          keyObservations: ['Missing depth'],
          recommendedImprovement: 'Organize by category',
          isVisible: true,
        },
        {
          sectionName: 'Education',
          visibilityScore: 65,
          recruiterConfidence: 'medium',
          riskLevel: 'medium',
          keyObservations: ['Basic info present'],
          recommendedImprovement: 'Add certifications',
          isVisible: true,
        },
        {
          sectionName: 'Projects',
          visibilityScore: 40,
          recruiterConfidence: 'low',
          riskLevel: 'high',
          keyObservations: ['Minimal presence'],
          recommendedImprovement: 'Add 2-3 projects',
          isVisible: false,
        },
        {
          sectionName: 'Certifications',
          visibilityScore: 30,
          recruiterConfidence: 'low',
          riskLevel: 'high',
          keyObservations: ['Not highlighted'],
          recommendedImprovement: 'Add certifications',
          isVisible: false,
        },
        {
          sectionName: 'Awards',
          visibilityScore: 20,
          recruiterConfidence: 'low',
          riskLevel: 'high',
          keyObservations: ['Completely missing'],
          recommendedImprovement: 'Add awards',
          isVisible: false,
        },
      ],
      sixSecondSkim: ['Current role', 'Company name'],
      skippedSections: ['Projects', 'Certifications', 'Awards'],
    };

    (useHeatmap as any).mockReturnValue({
      heatmap: mockHeatmap,
      isLoading: false,
      error: null,
    });

    render(<RecruiterHeatmap jobId="job-123" />);

    expect(screen.getByText('Recruiter Heatmap')).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Education')).toBeInTheDocument();
    expect(screen.getAllByText(/Projects/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Certifications/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Awards/).length).toBeGreaterThan(0);
  });

  it('should display overall visibility score', () => {
    const mockHeatmap = {
      overallVisibility: 78,
      sections: [],
      sixSecondSkim: [],
      skippedSections: [],
    };

    (useHeatmap as any).mockReturnValue({
      heatmap: mockHeatmap,
      isLoading: false,
      error: null,
    });

    render(<RecruiterHeatmap jobId="job-123" />);

    expect(screen.getByText('78%')).toBeInTheDocument();
    expect(screen.getByText('Overall Visibility')).toBeInTheDocument();
  });

  it('should display section visibility scores', () => {
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
      sixSecondSkim: [],
      skippedSections: [],
    };

    (useHeatmap as any).mockReturnValue({
      heatmap: mockHeatmap,
      isLoading: false,
      error: null,
    });

    render(<RecruiterHeatmap jobId="job-123" />);

    expect(screen.getByText('95% visible')).toBeInTheDocument();
  });

  it('should display six-second skim content', () => {
    const mockHeatmap = {
      overallVisibility: 78,
      sections: [],
      sixSecondSkim: ['Current role/title', 'Company name', 'Key skills'],
      skippedSections: [],
    };

    (useHeatmap as any).mockReturnValue({
      heatmap: mockHeatmap,
      isLoading: false,
      error: null,
    });

    render(<RecruiterHeatmap jobId="job-123" />);

    expect(screen.getByText(/What a recruiter sees in 6 seconds/)).toBeInTheDocument();
    expect(screen.getByText('Current role/title')).toBeInTheDocument();
    expect(screen.getByText('Company name')).toBeInTheDocument();
    expect(screen.getByText('Key skills')).toBeInTheDocument();
  });

  it('should display skipped sections', () => {
    const mockHeatmap = {
      overallVisibility: 78,
      sections: [],
      sixSecondSkim: [],
      skippedSections: ['Projects', 'Certifications', 'Awards'],
    };

    (useHeatmap as any).mockReturnValue({
      heatmap: mockHeatmap,
      isLoading: false,
      error: null,
    });

    render(<RecruiterHeatmap jobId="job-123" />);

    expect(screen.getByText(/Likely skipped/)).toBeInTheDocument();
    expect(screen.getByText(/Projects, Certifications, Awards/)).toBeInTheDocument();
  });

  it('should display recruiter confidence badges', () => {
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
      ],
      sixSecondSkim: [],
      skippedSections: [],
    };

    (useHeatmap as any).mockReturnValue({
      heatmap: mockHeatmap,
      isLoading: false,
      error: null,
    });

    render(<RecruiterHeatmap jobId="job-123" />);

    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('should handle undefined jobId', () => {
    (useHeatmap as any).mockReturnValue({
      heatmap: null,
      isLoading: false,
      error: null,
    });

    render(<RecruiterHeatmap jobId={undefined} />);

    expect(screen.getByText('Recruiter Heatmap')).toBeInTheDocument();
  });

  it('should display section observations', () => {
    const mockHeatmap = {
      overallVisibility: 78,
      sections: [
        {
          sectionName: 'Summary',
          visibilityScore: 95,
          recruiterConfidence: 'high',
          riskLevel: 'low',
          keyObservations: ['Clear and concise', 'Highlights value'],
          recommendedImprovement: 'Add metrics',
          isVisible: true,
        },
      ],
      sixSecondSkim: [],
      skippedSections: [],
    };

    (useHeatmap as any).mockReturnValue({
      heatmap: mockHeatmap,
      isLoading: false,
      error: null,
    });

    render(<RecruiterHeatmap jobId="job-123" />);

    // Verify Summary section is displayed and contains observations
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Clear and concise')).toBeInTheDocument();
  });

  it('should display recommended improvements', () => {
    const mockHeatmap = {
      overallVisibility: 78,
      sections: [
        {
          sectionName: 'Summary',
          visibilityScore: 95,
          recruiterConfidence: 'high',
          riskLevel: 'low',
          keyObservations: [],
          recommendedImprovement: 'Add specific metrics or achievements',
          isVisible: true,
        },
      ],
      sixSecondSkim: [],
      skippedSections: [],
    };

    (useHeatmap as any).mockReturnValue({
      heatmap: mockHeatmap,
      isLoading: false,
      error: null,
    });

    render(<RecruiterHeatmap jobId="job-123" />);

    expect(screen.getByText('Add specific metrics or achievements')).toBeInTheDocument();
  });
});
