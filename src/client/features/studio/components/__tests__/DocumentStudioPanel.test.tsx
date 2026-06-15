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
  GenerateButton: () => <button>Generate Resume</button>,
  ResumePreviewModal: () => <div>Resume Preview</div>,
}));

describe("DocumentStudioPanel", () => {
  it("renders the Document Studio panel", () => {
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

  it("displays Resume card", () => {
    render(
      <DocumentStudioPanel
        selectedJob={mockJob}
        onStateChange={vi.fn()}
        onMarkApplied={vi.fn()}
      />
    );

    expect(screen.getByText("Resume")).toBeInTheDocument();
    expect(screen.getByText(/Tailored to emphasize/)).toBeInTheDocument();
  });

  it("displays Cover Letter card with coming soon message", () => {
    render(
      <DocumentStudioPanel
        selectedJob={mockJob}
        onStateChange={vi.fn()}
        onMarkApplied={vi.fn()}
      />
    );

    expect(screen.getByText("Cover Letter")).toBeInTheDocument();
    expect(screen.getByText("Coming in Phase 2")).toBeInTheDocument();
  });

  it("displays Export & Save section", () => {
    render(
      <DocumentStudioPanel
        selectedJob={mockJob}
        onStateChange={vi.fn()}
        onMarkApplied={vi.fn()}
      />
    );

    expect(screen.getByText("Export & Save")).toBeInTheDocument();
    expect(screen.getByText("PDF Export")).toBeInTheDocument();
    expect(screen.getByText("Copy to Clipboard")).toBeInTheDocument();
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
        selectedJob={undefined}
        onStateChange={vi.fn()}
        onMarkApplied={vi.fn()}
      />
    );

    const header = screen.getByRole("heading", { name: "Document Studio" });
    expect(header).toBeInTheDocument();
  });
});
