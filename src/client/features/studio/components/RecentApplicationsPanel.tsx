import { useState, useEffect } from "react";
import { Job } from "@shared/types";
import "../styles/recent-applications-panel.css";

interface RecentApplicationsPanelProps {
  onSelectJob: (jobId: string) => void;
  selectedJobId?: string;
}

export default function RecentApplicationsPanel({
  onSelectJob,
  selectedJobId,
}: RecentApplicationsPanelProps) {
  const [applications, setApplications] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentApplications = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/jobs/applications/recent");
        if (!response.ok) {
          throw new Error("Failed to fetch recent applications");
        }
        const data = await response.json();
        setApplications(data.jobs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        console.error("Failed to fetch recent applications:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentApplications();
  }, []);

  if (error) {
    return (
      <div className="recent-applications-panel error">
        <p>Error loading applications: {error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="recent-applications-panel loading">
        <p>Loading applications...</p>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="recent-applications-panel empty">
        <h3>Recent Applications</h3>
        <p className="empty-state">No applications marked applied yet.</p>
      </div>
    );
  }

  return (
    <div className="recent-applications-panel">
      <h3>Recent Applications</h3>
      <div className="applications-list">
        {applications.map((app) => {
          const appliedDate = app.state === "applied" && (app as any).applied_at
            ? new Date((app as any).applied_at).toLocaleDateString()
            : "Recently";

          return (
            <button
              key={app.id}
              className={`application-item ${selectedJobId === app.id ? "active" : ""}`}
              onClick={() => onSelectJob(app.id)}
              title={`Applied ${appliedDate} to ${app.title} at ${app.company}`}
            >
              <div className="app-header">
                <span className="app-title">{app.title || "Untitled"}</span>
                <span className="app-date">{appliedDate}</span>
              </div>
              <div className="app-company">{app.company || "Unknown"}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
