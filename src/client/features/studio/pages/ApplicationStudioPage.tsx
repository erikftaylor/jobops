import { useState, useCallback } from "react";
import { useJobs } from "../../jobs/hooks/useJobs";
import { useMessages } from "../../jobs/hooks/useMessages";
import JobInputPanel from "../components/JobInputPanel";
import StrategyCoachPanel from "../components/StrategyCoachPanel";
import DocumentStudioPanel from "../components/DocumentStudioPanel";
import RecentApplicationsPanel from "../components/RecentApplicationsPanel";
import "../styles/application-studio.css";

type JobState = "draft" | "analyzed" | "refining" | "approved" | "generated" | "applied" | "closed";

interface ApplicationStudioPageProps {
  onOpenWorkspace?: (jobId: string) => void;
}

export default function ApplicationStudioPage({ onOpenWorkspace }: ApplicationStudioPageProps) {
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();
  const [isCreating, setIsCreating] = useState(false);

  const { jobs, isLoading: jobsLoading, createJob, updateJobState } = useJobs();
  const { messages, sendMessage } = useMessages(selectedJobId);

  const selectedJob = selectedJobId ? jobs.find((j) => j.id === selectedJobId) : undefined;

  const handleCreateJob = useCallback(
    async (data: any) => {
      setIsCreating(true);
      try {
        const newJob = await createJob(data);
        setSelectedJobId(newJob.id);
      } finally {
        setIsCreating(false);
      }
    },
    [createJob]
  );

  const handleStateChange = useCallback(
    async (newState: JobState) => {
      if (!selectedJobId) return;
      try {
        await updateJobState(selectedJobId, newState);
      } catch (err) {
        console.error("Failed to update job state:", err);
      }
    },
    [selectedJobId, updateJobState]
  );

  const handleJobSelect = useCallback((jobId: string) => {
    setSelectedJobId(jobId);
  }, []);

  const handleMarkApplied = useCallback(
    async (payload: {
      resumeArtifactId?: string;
      coverLetterArtifactId?: string;
      sourceUrl?: string;
      notes?: string;
    }) => {
      if (!selectedJobId) return;
      try {
        const response = await fetch(`/api/jobs/${selectedJobId}/mark-applied`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error("Failed to mark job as applied");
        }
        await response.json();
        await updateJobState(selectedJobId, "applied");
      } catch (err) {
        console.error("Failed to mark applied:", err);
      }
    },
    [selectedJobId, updateJobState]
  );

  const handleAccessWorkspace = useCallback(() => {
    if (selectedJobId && onOpenWorkspace) {
      onOpenWorkspace(selectedJobId);
    }
  }, [selectedJobId, onOpenWorkspace]);

  return (
    <div className="application-studio-page">
      {/* Header: Application Studio + Career Memory Status */}
      <div className="studio-header">
        <h1 className="studio-header-title">Application Studio</h1>
        <div className="studio-header-status">
          <span className="studio-header-status-indicator">✓ Career Memory Ready</span>
          <span>Updated today</span>
          <button className="studio-header-manage">Manage →</button>
        </div>
      </div>

      {/* Main content: single scrollable column */}
      <div className="studio-content">
        {/* Job Description Section */}
        <div className="studio-section">
          <JobInputPanel
            jobs={jobs}
            selectedJobId={selectedJobId}
            isLoading={isCreating || jobsLoading}
            onCreateJob={handleCreateJob}
            onSelectJob={handleJobSelect}
          />
        </div>

        {/* Analysis Section */}
        {selectedJob && (
          <div className="studio-section">
            <StrategyCoachPanel
              selectedJob={selectedJob}
              messages={messages}
              onSendMessage={sendMessage}
              onStateChange={handleStateChange}
            />
          </div>
        )}

        {/* Documents Section */}
        {selectedJob && (
          <div className="studio-section">
            <DocumentStudioPanel
              selectedJob={selectedJob}
              onStateChange={handleStateChange}
              onMarkApplied={handleMarkApplied}
              onOpenWorkspace={handleAccessWorkspace}
            />
          </div>
        )}

        {/* Recent Applications Section */}
        <div className="studio-section">
          <RecentApplicationsPanel
            onSelectJob={handleJobSelect}
            selectedJobId={selectedJobId}
          />
        </div>
      </div>
    </div>
  );
}
