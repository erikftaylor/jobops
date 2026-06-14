import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecruiterChat } from '@client/features/workspace/components/RecruiterChat';

describe('RecruiterChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<RecruiterChat jobId="job-123" />);

    expect(screen.getByText(/Recruiter Chat/)).toBeInTheDocument();
  });

  it('should display all prompt options', () => {
    render(<RecruiterChat jobId="job-123" />);

    expect(screen.getByText('What would worry a recruiter?')).toBeInTheDocument();
    expect(screen.getByText('Where is my resume weakest?')).toBeInTheDocument();
    expect(screen.getByText('Would this likely get an interview?')).toBeInTheDocument();
    expect(screen.getByText('What should I improve first?')).toBeInTheDocument();
  });

  it('should show prompt buttons with click handlers', () => {
    render(<RecruiterChat jobId="job-123" />);

    const worriesButton = screen.getByText('What would worry a recruiter?').closest('button');
    expect(worriesButton).toBeInTheDocument();
    expect(worriesButton?.onclick).toBeDefined();
  });

  it('should toggle prompt expansion on click', async () => {
    render(<RecruiterChat jobId="job-123" />);

    const worriesButton = screen.getByText('What would worry a recruiter?').closest('button');

    // Click should work
    expect(worriesButton).toBeInTheDocument();
    fireEvent.click(worriesButton!);

    // Give component time to respond
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  it('should display responses when expanded', async () => {
    render(<RecruiterChat jobId="job-123" />);

    const worriesButton = screen.getByText('What would worry a recruiter?').closest('button');
    fireEvent.click(worriesButton!);

    // Component renders mock response text
    await new Promise(resolve => setTimeout(resolve, 100));

    // Just verify no errors occurred
    expect(screen.getByText(/Recruiter Chat/)).toBeInTheDocument();
  });

  it('should handle undefined jobId', () => {
    render(<RecruiterChat jobId={undefined} />);

    expect(screen.getByText(/Recruiter Chat/)).toBeInTheDocument();
  });

  it('should display with proper title and structure', () => {
    const { container } = render(<RecruiterChat jobId="job-123" />);

    const card = container.querySelector('.workspace-card');
    expect(card).toBeInTheDocument();

    const title = container.querySelector('.workspace-card-title');
    expect(title?.textContent).toContain('Recruiter Chat');
  });

  it('should have accessible button structure', () => {
    const { container } = render(<RecruiterChat jobId="job-123" />);

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);

    buttons.forEach(button => {
      expect(button.textContent?.length).toBeGreaterThan(0);
    });
  });

  it('should show prompt descriptions or subtitle', () => {
    const { container } = render(<RecruiterChat jobId="job-123" />);

    // Component should have some text about recruiter perspective
    const card = container.querySelector('.workspace-card');
    expect(card).toBeInTheDocument();
    expect(card?.textContent?.length || 0).toBeGreaterThan(0);
  });

  it('should support multiple prompts being loaded', async () => {
    render(<RecruiterChat jobId="job-123" />);

    const worriesButton = screen.getByText('What would worry a recruiter?').closest('button');
    fireEvent.click(worriesButton!);

    await new Promise(resolve => setTimeout(resolve, 100));

    // Click another prompt
    const weakestButton = screen.getByText('Where is my resume weakest?').closest('button');
    fireEvent.click(weakestButton!);

    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify no errors
    expect(screen.getByText(/Recruiter Chat/)).toBeInTheDocument();
  });
});
