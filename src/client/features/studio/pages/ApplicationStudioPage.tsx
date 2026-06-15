import { useState, useCallback, useEffect } from "react";
import { useJobs } from "../../jobs/hooks/useJobs";
import { useMessages } from "../../jobs/hooks/useMessages";
import { HealthCheckResponse } from "@shared/types";
import CareerMemoryPanel from "../components/CareerMemoryPanel";
import JobInputPanel from "../components/JobInputPanel";
import StrategyCoachPanel from "../components/StrategyCoachPanel";
import DocumentStudioPanel from "../components/DocumentStudioPanel";
import "../styles/application-studio.css";

type JobState = "draft" | "analyzed" | "refining" | "approved" | "generated" | "applied" | "closed";

interface ApplicationStudioPageProps {
  onOpenWorkspace?: (jobId: string) => void;
}

export default function ApplicationStudioPage({ onOpenWorkspace }: ApplicationStudioPageProps) {
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();
  const [isCreating, setIsCreating] = useState(false);
  const [health, setHealth] = useState<HealthCheckResponse | { status: "unhealthy"; error: string } | null>(null);

  const { jobs, isLoading: jobsLoading, createJob, updateJobState } = useJobs();
  const { messages, sendMessage } = useMessages(selectedJobId);

  // Fetch health data for career profile info
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch("/api/health");
        const data = await response.json();
        setHealth(data);
      } catch (err) {
        console.error("Failed to fetch health:", err);
        setHealth({
          status: "unhealthy",
          error: "Failed to connect to server",
        });
      }
    };

    fetchHealth();
  }, []);

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
      {/* Left Panel: Career Memory + Job Input */}
      <div className="studio-panel-column studio-left-panel">
        <CareerMemoryPanel health={health} />
        <JobInputPanel
          jobs={jobs}
          selectedJobId={selectedJobId}
          isLoading={isCreating || jobsLoading}
          onCreateJob={handleCreateJob}
          onSelectJob={handleJobSelect}
        />
      </div>

      {/* Center Panel: Strategy Coach */}
      <div className="studio-panel-column studio-center-panel">
        <StrategyCoachPanel
          selectedJob={selectedJob}
          messages={messages}
          onSendMessage={sendMessage}
          onStateChange={handleStateChange}
        />
      </div>

      {/* Right Panel: Document Studio */}
      <div className="studio-panel-column studio-right-panel">
        <DocumentStudioPanel
          selectedJob={selectedJob}
          onStateChange={handleStateChange}
          onMarkApplied={handleMarkApplied}
          onOpenWorkspace={handleAccessWorkspace}
        />
      </div>
    </div>
  );
}
