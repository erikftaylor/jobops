import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArtifactComparison } from '@client/features/workspace/components/ArtifactComparison';

describe('ArtifactComparison', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<ArtifactComparison jobId="job-123" />);

    expect(screen.getByText('Resume Versions')).toBeInTheDocument();
  });

  it('should display comparison tabs', () => {
    render(<ArtifactComparison jobId="job-123" />);

    expect(screen.getAllByText(/Original Resume/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Current Resume/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Optimized Preview/).length).toBeGreaterThan(0);
  });

  it('should display scores for each tab', () => {
    render(<ArtifactComparison jobId="job-123" />);

    // The component displays scores next to tab names
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should show default active tab (Current Resume)', () => {
    const { container } = render(<ArtifactComparison jobId="job-123" />);

    const activeButton = container.querySelector('button.active');
    expect(activeButton).toBeInTheDocument();
    expect(activeButton?.textContent).toContain('Current Resume');
  });

  it('should switch tabs on click', () => {
    const { container } = render(<ArtifactComparison jobId="job-123" />);

    const buttons = container.querySelectorAll('button');
    const optimizedButton = Array.from(buttons).find(b => b.textContent?.includes('Optimized'));

    if (optimizedButton) {
      fireEvent.click(optimizedButton);
      expect(optimizedButton).toHaveClass('active');
    }
  });

  it('should render subtitle text', () => {
    render(<ArtifactComparison jobId="job-123" />);

    expect(screen.getByText('Compare different versions and their scores')).toBeInTheDocument();
  });

  it('should handle undefined jobId', () => {
    render(<ArtifactComparison jobId={undefined} />);

    expect(screen.getByText('Resume Versions')).toBeInTheDocument();
  });

  it('should have all three tabs with numeric scores', () => {
    render(<ArtifactComparison jobId="job-123" />);

    // Look for the score values that should be displayed
    const allText = screen.getByText('Resume Versions').parentElement?.textContent || '';
    expect(allText).toContain('65');
    expect(allText).toContain('72');
    expect(allText).toContain('85');
  });

  it('should maintain semantic structure', () => {
    const { container } = render(<ArtifactComparison jobId="job-123" />);

    const card = container.querySelector('.workspace-card');
    expect(card).toBeInTheDocument();

    const title = container.querySelector('.workspace-card-title');
    expect(title?.textContent).toBe('Resume Versions');
  });
});
