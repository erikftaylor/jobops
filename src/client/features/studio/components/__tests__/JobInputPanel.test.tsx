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

// Mock NewJobForm to avoid complex form setup
vi.mock("../../jobs/components/NewJobForm", () => ({
  default: ({ onSubmit }: any) => (
    <button aria-label="Add new job" onClick={() => onSubmit({ title: "Test Job" })}>
      + New Job
    </button>
  ),
}));

describe("JobInputPanel", () => {
  it("renders the Job Input panel with title and description", () => {
    render(
      <JobInputPanel
        jobs={[]}
        selectedJobId={undefined}
        onCreateJob={vi.fn()}
        onSelectJob={vi.fn()}
      />
    );

    expect(screen.getByText("Job Description")).toBeInTheDocument();
    expect(screen.getByText("Paste a job description to generate tailored application materials.")).toBeInTheDocument();
  });

  it("shows NewJobForm when rendered", () => {
    render(
      <JobInputPanel
        jobs={[]}
        selectedJobId={undefined}
        onCreateJob={vi.fn()}
        onSelectJob={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /Add new job/ })).toBeInTheDocument();
  });

  it("displays saved jobs selector when jobs exist", () => {
    const jobs = [mockJob];

    render(
      <JobInputPanel
        jobs={jobs}
        selectedJobId={undefined}
        onCreateJob={vi.fn()}
        onSelectJob={vi.fn()}
      />
    );

    expect(screen.getByText("or select from saved jobs")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows saved jobs in dropdown", () => {
    const jobs = [mockJob, { ...mockJob, id: "2", title: "Junior Engineer", added_at: new Date().toISOString(), updated_at: new Date().toISOString() }];

    render(
      <JobInputPanel
        jobs={jobs}
        selectedJobId={undefined}
        onCreateJob={vi.fn()}
        onSelectJob={vi.fn()}
      />
    );

    const select = screen.getByRole("combobox");
    expect(select.textContent).toContain("Senior Engineer");
    expect(select.textContent).toContain("Junior Engineer");
  });

  it("calls onSelectJob when a job is selected from dropdown", () => {
    const onSelectJob = vi.fn();
    const jobs = [mockJob, { ...mockJob, id: "2", title: "Junior Engineer", added_at: new Date().toISOString(), updated_at: new Date().toISOString() }];

    render(
      <JobInputPanel
        jobs={jobs}
        selectedJobId={undefined}
        onCreateJob={vi.fn()}
        onSelectJob={onSelectJob}
      />
    );

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    select.value = "2";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    expect(onSelectJob).toHaveBeenCalledWith("2");
  });

  it("selects the current job in dropdown when selectedJobId is set", () => {
    const jobs = [mockJob, { ...mockJob, id: "2", title: "Junior Engineer", added_at: new Date().toISOString(), updated_at: new Date().toISOString() }];

    render(
      <JobInputPanel
        jobs={jobs}
        selectedJobId={mockJob.id}
        onCreateJob={vi.fn()}
        onSelectJob={vi.fn()}
      />
    );

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe(mockJob.id);
  });
});
