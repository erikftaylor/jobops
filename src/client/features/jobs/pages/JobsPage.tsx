import { useState, useCallback, useEffect } from "react";
import NewJobForm from "../components/NewJobForm";
import JobList from "../components/JobList";
import ChatPanel from "../components/ChatPanel";
import StudioPanel from "../components/StudioPanel";
import WelcomePanel from "../components/onboarding/WelcomePanel";
import { useJobs } from "../hooks/useJobs";
import { useMessages } from "../hooks/useMessages";
import { HealthCheckResponse } from "@shared/types";
import "../styles/jobs-page.css";

type JobState = "draft" | "analyzed" | "refining" | "approved" | "generated" | "applied" | "closed";

interface JobsPageProps {
  onOpenWorkspace?: (jobId: string) => void;
}

export default function JobsPage({ onOpenWorkspace }: JobsPageProps) {
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();
  const [filter, setFilter] = useState<JobState | "all">("all");
  const [isCreating, setIsCreating] = useState(false);
  const [health, setHealth] = useState<HealthCheckResponse | { status: "unhealthy"; error: string } | null>(null);

  const { jobs, isLoading: jobsLoading, createJob, updateJobState } = useJobs();
  const { messages, isLoading: messagesLoading, loadMessages, sendMessage } = useMessages(
    selectedJobId
  );

  // Fetch health data for career profile card
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

  const handleAddFirstJob = useCallback(() => {
    // Scroll to the form or focus it for better UX
    const formElement = document.querySelector(".new-job-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
      (formElement as any).focus();
    }
  }, []);

  const handleStateChange = useCallback(
    async (newState: JobState) => {
      if (!selectedJobId) return;
      try {
        await updateJobState(selectedJobId, newState);
        // Update selected job's state locally for immediate feedback
        const updatedJob = jobs.find((j) => j.id === selectedJobId);
        if (updatedJob) {
          updatedJob.state = newState;
        }
      } catch (err) {
        console.error("Failed to update state:", err);
      }
    },
    [selectedJobId, jobs, updateJobState]
  );

  const handleAnalysisRefresh = useCallback(async () => {
    if (!selectedJobId) return;
    try {
      // Reload messages to show the findings message
      await loadMessages();
      // Update the job to reflect new state
      const updatedJob = jobs.find((j) => j.id === selectedJobId);
      if (updatedJob) {
        updatedJob.state = "analyzed";
      }
    } catch (err) {
      console.error("Failed to refresh after analysis:", err);
    }
  }, [selectedJobId, jobs, loadMessages]);

  // Show welcome panel on first visit (no jobs)
  const hasNoJobs = !jobsLoading && jobs.length === 0;

  if (hasNoJobs && health) {
    return (
      <div className="jobs-page jobs-page--welcome">
        <WelcomePanel
          health={health}
          onAddFirstJob={handleAddFirstJob}
          experienceCount={0}
          skillCount={0}
          educationCount={0}
        />
      </div>
    );
  }

  return (
    <div className="jobs-page">
      <div className="sources-panel">
        <div className="panel-header">
          <h2>Sources</h2>
          <p className="panel-subtitle">Job opportunities</p>
        </div>

        <NewJobForm onSubmit={handleCreateJob} isLoading={isCreating} />

        <JobList
          jobs={jobs}
          selectedJobId={selectedJobId}
          onSelectJob={setSelectedJobId}
          filter={filter}
          onFilterChange={setFilter}
          isLoading={jobsLoading}
        />
      </div>

      <div className="chat-panel">
        <ChatPanel
          selectedJob={selectedJob}
          messages={messages}
          isLoading={messagesLoading}
          onSendMessage={sendMessage}
          onLoadMessages={loadMessages}
        />
      </div>

      <div className="studio-panel">
        <StudioPanel
          selectedJob={selectedJob}
          isLoading={jobsLoading}
          onStateChange={handleStateChange}
          onAnalysisRefresh={handleAnalysisRefresh}
          onOpenWorkspace={onOpenWorkspace}
        />
      </div>
    </div>
  );
}
