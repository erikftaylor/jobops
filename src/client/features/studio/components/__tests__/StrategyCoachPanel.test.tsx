import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StrategyCoachPanel from "../StrategyCoachPanel";
import { Job } from "@shared/types";

const mockJob: Job = {
  id: "1",
  title: "Senior Engineer",
  company: "TechCorp",
  description: "We are hiring a senior engineer...",
  state: "draft",
  added_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("StrategyCoachPanel", () => {
  it("renders the Strategy Coach panel", () => {
    render(
      <StrategyCoachPanel
        selectedJob={mockJob}
        messages={[]}
        onSendMessage={vi.fn()}
        onStateChange={vi.fn()}
      />
    );

    expect(screen.getByText("Strategy Coach")).toBeInTheDocument();
    expect(screen.getByText("Personalized guidance")).toBeInTheDocument();
  });

  it("shows empty state when no job is selected", () => {
    render(
      <StrategyCoachPanel
        selectedJob={undefined}
        messages={[]}
        onSendMessage={vi.fn()}
        onStateChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Select a job to analyze/)).toBeInTheDocument();
  });

  it("shows analyze prompt when job is in draft state", () => {
    render(
      <StrategyCoachPanel
        selectedJob={mockJob}
        messages={[]}
        onSendMessage={vi.fn()}
        onStateChange={vi.fn()}
      />
    );

    expect(screen.getByText("Analyze Job")).toBeInTheDocument();
  });

  it("disables analyze button when job has no description", () => {
    const jobWithoutDescription = { ...mockJob, description: "" };

    render(
      <StrategyCoachPanel
        selectedJob={jobWithoutDescription}
        messages={[]}
        onSendMessage={vi.fn()}
        onStateChange={vi.fn()}
      />
    );

    const analyzeButton = screen.getByText("Analyze Job");
    expect(analyzeButton).toBeDisabled();
  });

  it("renders panel header", () => {
    render(
      <StrategyCoachPanel
        selectedJob={undefined}
        messages={[]}
        onSendMessage={vi.fn()}
        onStateChange={vi.fn()}
      />
    );

    const header = screen.getByRole("heading", { name: "Strategy Coach" });
    expect(header).toBeInTheDocument();
  });
});
