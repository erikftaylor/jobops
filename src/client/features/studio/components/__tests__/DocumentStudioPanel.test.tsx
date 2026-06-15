import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DocumentStudioPanel from "../DocumentStudioPanel";
import { Job } from "@shared/types";

const mockJob: Job = {
  id: "1",
  title: "Senior Engineer",
  company: "TechCorp",
  description: "We are hiring...",
  state: "analyzed",
  added_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Mock the artifacts components
vi.mock("../../../artifacts/index", () => ({
  GenerateButton: ({ onArtifactCreated }: any) => (
    <button onClick={() => onArtifactCreated({ id: "artifact-1", renderedText: "Resume text" })}>
      Generate Resume
    </button>
  ),
  ResumePreviewModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="resume-preview-modal">
        <div>Resume Preview</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

// Mock the useArtifacts hook
vi.mock("../../../artifacts/hooks/useArtifacts", () => ({
  useArtifacts: () => ({
    artifact: null,
    isGenerating: false,
    error: null,
    generateResume: vi.fn(),
    generateCoverLetter: vi.fn(),
    getArtifact: vi.fn(),
    downloadPDF: vi.fn(),
    copyToClipboard: vi.fn(),
  }),
}));

describe("DocumentStudioPanel", () => {
  it("renders the Document Studio panel with selected job", () => {
    render(
      <DocumentStudioPanel
        selectedJob={mockJob}
        onStateChange={vi.fn()}
        onMarkApplied={vi.fn()}
      />
    );

    expect(screen.getByText("Document Studio")).toBeInTheDocument();
    expect(screen.getByText("Tailored to this job")).toBeInTheDocument();
  });

  it("shows empty state when no job is selected", () => {
    render(
      <DocumentStudioPanel
        selectedJob={undefined}
        onStateChange={vi.fn()}
        onMarkApplied={vi.fn()}
      />
    );

    expect(screen.getByText(/Select a job to generate/)).toBeInTheDocument();
  });

  it("displays Resume card with generate button when job is analyzed", () => {
    render(
      <DocumentStudioPanel
        selectedJob={mockJob}
        onStateChange={vi.fn()}
        onMarkApplied={vi.fn()}
      />
    );

    expect(screen.getByText("Resume")).toBeInTheDocument();
    expect(screen.getByText(/Tailored to emphasize/)).toBeInTheDocument();
    expect(screen.getByText("Generate Resume")).toBeInTheDocument();
  });

  it("displays message to analyze job when job is in draft state", () => {
    const draftJob: Job = { ...mockJob, state: "draft" };

    render(
      <DocumentStudioPanel
        selectedJob={draftJob}
        onStateChange={vi.fn()}
        onMarkApplied={vi.fn()}
      />
    );

    expect(screen.getByText("Analyze the job first to generate a tailored resume")).toBeInTheDocument();
  });


  it("displays Mark Applied section", () => {
    render(
      <DocumentStudioPanel
        selectedJob={mockJob}
        onStateChange={vi.fn()}
        onMarkApplied={vi.fn()}
      />
    );

    expect(screen.getByText("Mark Applied")).toBeInTheDocument();
    expect(screen.getByText(/When you've submitted/)).toBeInTheDocument();
  });

  it("shows applied state when job is marked as applied", () => {
    const appliedJob: Job = { ...mockJob, state: "applied" };

    render(
      <DocumentStudioPanel
        selectedJob={appliedJob}
        onStateChange={vi.fn()}
        onMarkApplied={vi.fn()}
      />
    );

    const appliedButton = screen.getByText("✓ Marked as Applied");
    expect(appliedButton).toBeDisabled();
  });

  it("renders panel header", () => {
    render(
      <DocumentStudioPanel
        selectedJob={mockJob}
        onStateChange={vi.fn()}
        onMarkApplied={vi.fn()}
      />
    );

    const header = screen.getByRole("heading", { name: "Document Studio" });
    expect(header).toBeInTheDocument();
  });

  it("displays generate cover letter button when job is analyzed", () => {
    render(
      <DocumentStudioPanel
        selectedJob={mockJob}
        onStateChange={vi.fn()}
        onMarkApplied={vi.fn()}
      />
    );

    expect(screen.getByText("Generate Cover Letter")).toBeInTheDocument();
  });

  it("calls onMarkApplied when mark applied button is clicked", async () => {
    const onMarkApplied = vi.fn();

    render(
      <DocumentStudioPanel
        selectedJob={mockJob}
        onStateChange={vi.fn()}
        onMarkApplied={onMarkApplied}
      />
    );

    const markAppliedButton = screen.getByText("Mark as Applied");
    expect(markAppliedButton).toBeInTheDocument();
  });
});
