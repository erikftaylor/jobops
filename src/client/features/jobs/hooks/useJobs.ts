import { useState, useCallback, useEffect } from "react";
import { Job } from "@shared/types";

type JobState = "draft" | "analyzed" | "refining" | "approved" | "generated" | "applied" | "closed";

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async (state?: JobState) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = state ? `/api/jobs?state=${state}` : "/api/jobs";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load jobs");
      const data = await response.json();
      if (!Array.isArray(data.jobs)) {
        throw new Error("Invalid response: jobs must be an array");
      }
      setJobs(data.jobs);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createJob = useCallback(
    async (jobData: {
      jobDescription: string;
      company?: string;
      title?: string;
      url?: string;
    }) => {
      setError(null);
      try {
        const response = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(jobData),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to create job");
        }
        const newJob = await response.json();
        setJobs((prev) => [newJob, ...prev]);
        return newJob;
      } catch (err) {
        const message = (err as Error).message;
        setError(message);
        throw err;
      }
    },
    []
  );

  const updateJobState = useCallback(async (jobId: string, newState: JobState) => {
    setError(null);
    try {
      const response = await fetch(`/api/jobs/${jobId}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newState }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update job state");
      }
      await response.json();
      // Reload jobs to get updated state
      await loadJobs();
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      throw err;
    }
  }, [loadJobs]);

  const getJob = useCallback(async (jobId: string): Promise<Job | null> => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }, []);

  // Load jobs on mount
  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  return {
    jobs,
    isLoading,
    error,
    loadJobs,
    createJob,
    updateJobState,
    getJob,
  };
}
