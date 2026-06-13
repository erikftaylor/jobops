import { Job } from "@shared/types";
import "../styles/job-list.css";

type JobState = "draft" | "analyzed" | "refining" | "approved" | "generated" | "applied" | "closed";

interface JobListProps {
  jobs: Job[];
  selectedJobId?: string;
  onSelectJob: (jobId: string) => void;
  filter?: JobState | "all";
  onFilterChange?: (filter: JobState | "all") => void;
  isLoading?: boolean;
}

const STATE_LABELS: Record<JobState, string> = {
  draft: "Needs Review",
  analyzed: "Analyzed",
  refining: "Refining",
  approved: "Approved",
  generated: "Generated",
  applied: "Applied",
  closed: "Closed",
};

export default function JobList({
  jobs,
  selectedJobId,
  onSelectJob,
  filter = "all",
  onFilterChange,
  isLoading,
}: JobListProps) {
  const filteredJobs = filter === "all" ? jobs : jobs.filter((job) => job.state === filter);

  return (
    <div className="job-list-container">
      <div className="filter-chips">
        <button
          className={`chip ${filter === "all" ? "active" : ""}`}
          onClick={() => onFilterChange?.("all")}
          disabled={isLoading}
        >
          All
        </button>
        {(["draft", "analyzed", "refining", "approved", "generated", "applied", "closed"] as JobState[]).map(
          (state) => (
            <button
              key={state}
              className={`chip ${filter === state ? "active" : ""}`}
              onClick={() => onFilterChange?.(state)}
              disabled={isLoading}
            >
              {STATE_LABELS[state]}
            </button>
          )
        )}
      </div>

      <div className="job-list">
        {filteredJobs.length === 0 ? (
          <div className="empty-state">
            <p>{isLoading ? "Loading jobs..." : "No jobs found"}</p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <button
              key={job.id}
              className={`job-item ${selectedJobId === job.id ? "selected" : ""}`}
              onClick={() => onSelectJob(job.id)}
              aria-pressed={selectedJobId === job.id}
              aria-label={`${job.title} at ${job.company}`}
            >
              <div className="job-title">{job.title}</div>
              <div className="job-company">{job.company}</div>
              <div className={`job-state state-${job.state}`}>
                {STATE_LABELS[job.state as JobState] || job.state}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
