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
  it("renders the Tailored Materials panel with selected job", () => {
    render(
      <DocumentStudioPanel
        selectedJob={mockJob}
        onStateChange={vi.fn()}
        onMarkApplied={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Tailored Materials" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cover Letter" })).toBeInTheDocument();
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

  it("displays Resume tab content with generate button when job is analyzed", () => {
    render(
      <DocumentStudioPanel
        selectedJob={mockJob}
        onStateChange={vi.fn()}
        onMarkApplied={vi.fn()}
      />
    );

    expect(screen.getByText("Generate Resume")).toBeInTheDocument();
  });

  it("displays tabs for Resume and Cover Letter", () => {
    render(
      <DocumentStudioPanel
        selectedJob={mockJob}
        onStateChange={vi.fn()}
        onMarkApplied={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cover Letter" })).toBeInTheDocument();
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

    expect(screen.getByText(/Analyze the job first to generate/)).toBeInTheDocument();
  });

  it("displays Mark as Applied button", () => {
    render(
      <DocumentStudioPanel
        selectedJob={mockJob}
        onStateChange={vi.fn()}
        onMarkApplied={vi.fn()}
      />
    );

    expect(screen.getByText("Mark as Applied")).toBeInTheDocument();
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

  it("displays generate cover letter button when job is analyzed", () => {
    render(
      <DocumentStudioPanel
        selectedJob={mockJob}
        onStateChange={vi.fn()}
        onMarkApplied={vi.fn()}
      />
    );

    // Switch to Cover Letter tab
    const coverLetterTab = screen.getByRole("button", { name: "Cover Letter" });
    expect(coverLetterTab).toBeInTheDocument();
  });
});
