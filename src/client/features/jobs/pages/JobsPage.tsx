import { useState, useCallback } from "react";
import NewJobForm from "../components/NewJobForm";
import JobList from "../components/JobList";
import ChatPanel from "../components/ChatPanel";
import StudioPanel from "../components/StudioPanel";
import { useJobs } from "../hooks/useJobs";
import { useMessages } from "../hooks/useMessages";
import "../styles/jobs-page.css";

type JobState = "draft" | "analyzed" | "refining" | "approved" | "generated" | "applied" | "closed";

export default function JobsPage() {
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();
  const [filter, setFilter] = useState<JobState | "all">("all");
  const [isCreating, setIsCreating] = useState(false);

  const { jobs, isLoading: jobsLoading, createJob, updateJobState } = useJobs();
  const { messages, isLoading: messagesLoading, loadMessages, sendMessage } = useMessages(
    selectedJobId
  );

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
        />
      </div>
    </div>
  );
}
