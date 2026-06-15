import { Job } from "@shared/types";
import NewJobForm from "../../jobs/components/NewJobForm";
import "../styles/job-input-panel.css";

interface JobInputPanelProps {
  jobs: Job[];
  selectedJobId?: string;
  isLoading?: boolean;
  onCreateJob: (data: any) => Promise<void>;
  onSelectJob: (jobId: string) => void;
}

export default function JobInputPanel({
  jobs,
  selectedJobId,
  isLoading,
  onCreateJob,
  onSelectJob,
}: JobInputPanelProps) {
  const handleCreateJob = async (data: any) => {
    await onCreateJob(data);
  };

  return (
    <div className="job-input-panel">
      <h2 className="studio-section-title">Job Description</h2>
      <p className="studio-section-description">
        Paste a job description to generate tailored application materials.
      </p>

      {/* Job Form (always visible) */}
      <NewJobForm
        onSubmit={handleCreateJob}
        isLoading={isLoading}
      />

      {/* Recently viewed job selector (compact) */}
      {jobs.length > 0 && (
        <div className="saved-jobs-selector">
          <label className="selector-label">or select from saved jobs</label>
          <select
            className="job-selector"
            value={selectedJobId || ""}
            onChange={(e) => {
              if (e.target.value) {
                onSelectJob(e.target.value);
              }
            }}
          >
            <option value="">Choose a saved job...</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title || "Untitled"} {job.company && `— ${job.company}`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
