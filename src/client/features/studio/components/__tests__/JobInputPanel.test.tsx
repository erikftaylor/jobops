import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import JobInputPanel from "../JobInputPanel";
import { Job } from "@shared/types";

const mockJob: Job = {
  id: "1",
  title: "Senior Engineer",
  company: "TechCorp",
  description: "We are hiring...",
  url: "https://example.com/job/1",
  state: "draft",
  added_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("JobInputPanel", () => {
  it("renders the Job Input panel", () => {
    render(
      <JobInputPanel
        jobs={[]}
        selectedJobId={undefined}
        onCreateJob={vi.fn()}
        onSelectJob={vi.fn()}
      />
    );

    expect(screen.getByText("Job Description")).toBeInTheDocument();
    expect(screen.getByText("One job at a time")).toBeInTheDocument();
  });

  it("shows empty state when no job is selected", () => {
    render(
      <JobInputPanel
        jobs={[]}
        selectedJobId={undefined}
        onCreateJob={vi.fn()}
        onSelectJob={vi.fn()}
      />
    );

    expect(screen.getByText(/No job selected/)).toBeInTheDocument();
    expect(screen.getByText("+ Add Job")).toBeInTheDocument();
  });

  it("displays selected job details", () => {
    const { container } = render(
      <JobInputPanel
        jobs={[mockJob]}
        selectedJobId={mockJob.id}
        onCreateJob={vi.fn()}
        onSelectJob={vi.fn()}
      />
    );

    const detailCard = container.querySelector(".job-detail-card");
    expect(detailCard?.textContent).toContain("Senior Engineer");
    expect(detailCard?.textContent).toContain("TechCorp");
    expect(screen.getByRole("link", { name: /View Posting/ })).toBeInTheDocument();
  });

  it("shows job description preview", () => {
    render(
      <JobInputPanel
        jobs={[mockJob]}
        selectedJobId={mockJob.id}
        onCreateJob={vi.fn()}
        onSelectJob={vi.fn()}
      />
    );

    expect(screen.getByText("We are hiring...")).toBeInTheDocument();
  });

  it("displays saved jobs list when jobs exist", () => {
    const jobs = [mockJob, { ...mockJob, id: "2", title: "Junior Engineer" }];

    render(
      <JobInputPanel
        jobs={jobs}
        selectedJobId={mockJob.id}
        onCreateJob={vi.fn()}
        onSelectJob={vi.fn()}
      />
    );

    expect(screen.getByText("Saved Jobs")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("calls onSelectJob when a job from the list is clicked", () => {
    const onSelectJob = vi.fn();
    const jobs = [mockJob, { ...mockJob, id: "2", title: "Junior Engineer", added_at: new Date().toISOString(), updated_at: new Date().toISOString() }];

    render(
      <JobInputPanel
        jobs={jobs}
        selectedJobId={mockJob.id}
        onCreateJob={vi.fn()}
        onSelectJob={onSelectJob}
      />
    );

    const jobListItem = screen.getByText("Junior Engineer");
    jobListItem.click();

    expect(onSelectJob).toHaveBeenCalledWith("2");
  });

  it("highlights the selected job in the list", () => {
    const jobs = [mockJob, { ...mockJob, id: "2", title: "Junior Engineer" }];

    const { container } = render(
      <JobInputPanel
        jobs={jobs}
        selectedJobId={mockJob.id}
        onCreateJob={vi.fn()}
        onSelectJob={vi.fn()}
      />
    );

    const activeJobItem = container.querySelector(".job-list-item.active");
    expect(activeJobItem).toBeInTheDocument();
    expect(activeJobItem?.textContent).toContain("Senior Engineer");
  });

  it("shows Edit Job button when job is selected", () => {
    render(
      <JobInputPanel
        jobs={[mockJob]}
        selectedJobId={mockJob.id}
        onCreateJob={vi.fn()}
        onSelectJob={vi.fn()}
      />
    );

    expect(screen.getByText("Edit Job")).toBeInTheDocument();
  });
});
