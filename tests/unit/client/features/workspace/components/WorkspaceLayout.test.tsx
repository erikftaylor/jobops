import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceLayout } from '@client/features/workspace/components/WorkspaceLayout';
import type { Job } from '@shared/types';

// Mock all child components
vi.mock('@client/features/workspace/components/ResumeScore', () => ({
  ResumeScore: () => <div data-testid="resume-score">Resume Score Mock</div>,
}));

vi.mock('@client/features/workspace/components/MissingKeywords', () => ({
  MissingKeywords: () => <div data-testid="missing-keywords">Missing Keywords Mock</div>,
}));

vi.mock('@client/features/workspace/components/RecruiterHeatmap', () => ({
  RecruiterHeatmap: () => <div data-testid="recruiter-heatmap">Recruiter Heatmap Mock</div>,
}));

vi.mock('@client/features/workspace/components/JobFitDashboard', () => ({
  JobFitDashboard: () => <div data-testid="job-fit">Job Fit Dashboard Mock</div>,
}));

vi.mock('@client/features/workspace/components/ArtifactComparison', () => ({
  ArtifactComparison: () => <div data-testid="artifact-comparison">Artifact Comparison Mock</div>,
}));

vi.mock('@client/features/workspace/components/RecruiterChat', () => ({
  RecruiterChat: () => <div data-testid="recruiter-chat">Recruiter Chat Mock</div>,
}));

vi.mock('@client/features/workspace/components/ResumePreview', () => ({
  ResumePreview: () => <div data-testid="resume-preview">Resume Preview Mock</div>,
}));

describe('WorkspaceLayout', () => {
  const mockJob: Job = {
    id: 'job-123',
    title: 'Senior Engineer',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    salary_min: 150000,
    salary_max: 200000,
    currency: 'USD',
    job_type: 'full_time',
    description: 'Looking for a senior engineer',
    url: 'https://example.com/jobs/123',
    source: 'test',
    date_posted: '2024-01-01',
    archived: false,
    notes: '',
    date_added: '2024-01-01',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<WorkspaceLayout jobId="job-123" />);

    expect(screen.getByText('Resume Analysis Workspace')).toBeInTheDocument();
  });

  it('should display job title and company when provided', () => {
    render(<WorkspaceLayout jobId="job-123" job={mockJob} />);

    expect(screen.getByText('Senior Engineer at TechCorp')).toBeInTheDocument();
  });

  it('should display job metadata when available', () => {
    render(<WorkspaceLayout jobId="job-123" job={mockJob} />);

    expect(screen.getByText(/San Francisco, CA/)).toBeInTheDocument();
    expect(screen.getByText(/150.{0,1}000.*200.{0,1}000/)).toBeInTheDocument();
    expect(screen.getByText(/FULL TIME|FULL_TIME/)).toBeInTheDocument();
  });

  it('should render two-column layout', () => {
    const { container } = render(<WorkspaceLayout jobId="job-123" job={mockJob} />);

    const leftColumn = container.querySelector('.workspace-left-column');
    const rightColumn = container.querySelector('.workspace-right-column');

    expect(leftColumn).toBeInTheDocument();
    expect(rightColumn).toBeInTheDocument();
  });

  it('should render all left column components', () => {
    render(<WorkspaceLayout jobId="job-123" job={mockJob} />);

    expect(screen.getByTestId('resume-score')).toBeInTheDocument();
    expect(screen.getByTestId('missing-keywords')).toBeInTheDocument();
    expect(screen.getByTestId('recruiter-heatmap')).toBeInTheDocument();
    expect(screen.getByTestId('job-fit')).toBeInTheDocument();
  });

  it('should render all right column components', () => {
    render(<WorkspaceLayout jobId="job-123" job={mockJob} />);

    expect(screen.getByTestId('resume-preview')).toBeInTheDocument();
    expect(screen.getByTestId('recruiter-chat')).toBeInTheDocument();
    expect(screen.getByTestId('artifact-comparison')).toBeInTheDocument();
  });

  it('should display back button when onBackClick provided', () => {
    const mockOnBackClick = vi.fn();

    render(
      <WorkspaceLayout
        jobId="job-123"
        job={mockJob}
        onBackClick={mockOnBackClick}
      />
    );

    const backButton = screen.getByText('← Back');
    expect(backButton).toBeInTheDocument();
  });

  it('should call onBackClick when back button clicked', () => {
    const mockOnBackClick = vi.fn();

    render(
      <WorkspaceLayout
        jobId="job-123"
        job={mockJob}
        onBackClick={mockOnBackClick}
      />
    );

    const backButton = screen.getByText('← Back');
    fireEvent.click(backButton);

    expect(mockOnBackClick).toHaveBeenCalled();
  });

  it('should not display back button when onBackClick not provided', () => {
    render(<WorkspaceLayout jobId="job-123" job={mockJob} />);

    expect(screen.queryByText('← Back')).not.toBeInTheDocument();
  });

  it('should handle missing job gracefully', () => {
    render(<WorkspaceLayout jobId="job-123" job={null} />);

    expect(screen.getByText('Resume Analysis Workspace')).toBeInTheDocument();
  });

  it('should display location when present', () => {
    render(<WorkspaceLayout jobId="job-123" job={mockJob} />);

    expect(screen.getByText('📍 San Francisco, CA')).toBeInTheDocument();
  });

  it('should display salary range when available', () => {
    render(<WorkspaceLayout jobId="job-123" job={mockJob} />);

    expect(screen.getByText(/150.{0,1}000.*200.{0,1}000.*USD/)).toBeInTheDocument();
  });

  it('should display job type when available', () => {
    render(<WorkspaceLayout jobId="job-123" job={mockJob} />);

    expect(screen.getByText('📋 FULL TIME')).toBeInTheDocument();
  });

  it('should handle missing location', () => {
    const jobWithoutLocation = { ...mockJob, location: undefined };

    render(<WorkspaceLayout jobId="job-123" job={jobWithoutLocation} />);

    expect(screen.getByText('📍 Location not specified')).toBeInTheDocument();
  });

  it('should have responsive container structure', () => {
    const { container } = render(<WorkspaceLayout jobId="job-123" job={mockJob} />);

    const mainContainer = container.querySelector('.workspace-container');
    const header = container.querySelector('.workspace-header');
    const layout = container.querySelector('.workspace-layout');

    expect(mainContainer).toBeInTheDocument();
    expect(header).toBeInTheDocument();
    expect(layout).toBeInTheDocument();
  });

  it('should pass jobId to child components', () => {
    render(<WorkspaceLayout jobId="job-123" job={mockJob} />);

    // All child components should be rendered with the jobId
    expect(screen.getByTestId('resume-score')).toBeInTheDocument();
  });

  it('should have aria-label on back button for accessibility', () => {
    const mockOnBackClick = vi.fn();

    const { container } = render(
      <WorkspaceLayout
        jobId="job-123"
        job={mockJob}
        onBackClick={mockOnBackClick}
      />
    );

    const backButton = container.querySelector('[aria-label="Back to jobs"]');
    expect(backButton).toBeInTheDocument();
  });
});
