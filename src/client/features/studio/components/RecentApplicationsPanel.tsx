import { useState, useEffect } from "react";
import { Job } from "@shared/types";
import "../styles/recent-applications-panel.css";

function formatApplicationDate(date: Date | string): string {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Applied today";
  if (d.toDateString() === yesterday.toDateString()) return "Applied yesterday";

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[d.getMonth()];
  const day = d.getDate();
  return `Applied ${month} ${day}`;
}

export default function RecentApplicationsPanel(): JSX.Element {
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
        // Limit to latest 10, sorted by date descending
        const limited = (data.jobs || []).slice(0, 10);
        setApplications(limited);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        console.error("Failed to fetch recent applications:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentApplications();
  }, []);

  if (isLoading) {
    return (
      <div className="recent-applications-panel loading">
        <h2 className="studio-section-title">Recent Applications</h2>
        <p className="loading-state">Loading...</p>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="recent-applications-panel empty">
        <h2 className="studio-section-title">Recent Applications</h2>
        <p className="empty-state">Recorded applications will appear here.</p>
      </div>
    );
  }

  return (
    <div className="recent-applications-panel">
      <h2 className="studio-section-title">Recent Applications</h2>
      <div className="applications-list">
        {applications.map((app) => {
          const appliedDate = app.state === "applied" && (app as any).applied_at
            ? formatApplicationDate((app as any).applied_at)
            : "Applied";

          return (
            <div key={app.id} className="application-item">
              <div className="item-company-role">
                {app.company && app.title
                  ? `${app.company} — ${app.title}`
                  : app.title || app.company || "Application"}
              </div>
              <div className="item-date">{appliedDate}</div>
            </div>
          );
        })}
      </div>
      {error && <p className="error-state">{error}</p>}
    </div>
  );
}
