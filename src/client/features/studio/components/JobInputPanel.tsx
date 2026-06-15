import { useState } from "react";
import { Job } from "@shared/types";
import NewJobForm from "../../jobs/components/NewJobForm";
import RecentApplicationsPanel from "./RecentApplicationsPanel";
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
  const [showForm, setShowForm] = useState(false);
  const selectedJob = selectedJobId ? jobs.find((j) => j.id === selectedJobId) : undefined;

  const handleCreateJob = async (data: any) => {
    await onCreateJob(data);
    setShowForm(false);
  };

  return (
    <div className="job-input-panel">
      <div className="panel-header">
        <h2>Job Description</h2>
        <p className="panel-subtitle">One job at a time</p>
      </div>

      <div className="job-input-content">
        {!selectedJob ? (
          <div className="empty-state">
            <p>No job selected. Add a new job or select one from below.</p>
            <button
              className="cta-button primary"
              onClick={() => setShowForm(true)}
              disabled={isLoading}
            >
              + Add Job
            </button>
          </div>
        ) : (
          <div className="job-detail-card">
            <div className="job-header">
              <h3>{selectedJob.title || "Untitled Position"}</h3>
              {selectedJob.company && <p className="company">{selectedJob.company}</p>}
            </div>

            <div className="job-meta">
              {selectedJob.url && (
                <a href={selectedJob.url} target="_blank" rel="noopener noreferrer" className="job-url">
                  View Posting →
                </a>
              )}
            </div>

            {selectedJob.description && (
              <div className="job-description">
                <h4>Job Description</h4>
                <div className="description-preview">
                  {selectedJob.description.substring(0, 400)}
                  {selectedJob.description.length > 400 && "..."}
                </div>
              </div>
            )}

            <div className="job-actions">
              <button
                className="action-link"
                onClick={() => setShowForm(true)}
              >
                Edit Job
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <div className="job-form-overlay">
            <NewJobForm
              onSubmit={handleCreateJob}
              isLoading={isLoading}
            />
            <button
              className="overlay-close"
              onClick={() => setShowForm(false)}
              aria-label="Close form"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {jobs.length > 0 && (
        <div className="job-list-section">
          <div className="list-header">
            <h3>Saved Jobs</h3>
            <span className="count">{jobs.length}</span>
          </div>
          <div className="job-list">
            {jobs.map((job) => (
              <button
                key={job.id}
                className={`job-list-item ${selectedJobId === job.id ? "active" : ""}`}
                onClick={() => onSelectJob(job.id)}
              >
                <div className="list-item-title">
                  {job.title || "Untitled"}
                </div>
                {job.company && (
                  <div className="list-item-company">
                    {job.company}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <RecentApplicationsPanel
        onSelectJob={onSelectJob}
        selectedJobId={selectedJobId}
      />
    </div>
  );
}
