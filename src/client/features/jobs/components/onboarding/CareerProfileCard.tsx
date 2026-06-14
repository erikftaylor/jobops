import React from "react";
import { HealthCheckResponse } from "@shared/types";
import "./career-profile-card.css";

interface CareerProfileCardProps {
  health: HealthCheckResponse | { status: "unhealthy"; error: string };
  experienceCount?: number;
  skillCount?: number;
  educationCount?: number;
}

export default React.memo(function CareerProfileCard({
  health,
  experienceCount = 0,
  skillCount = 0,
  educationCount = 0,
}: CareerProfileCardProps) {
  if (!health || health.status === "unhealthy") {
    return (
      <div className="career-profile-card">
        <div className="card-header">
          <div className="card-title">
            <h3>Career Profile</h3>
            <span className="status-badge error">Unavailable</span>
          </div>
        </div>
        <div className="card-content">
          <p className="status-message">Server unavailable. Please check your connection.</p>
        </div>
      </div>
    );
  }

  const cvHealth = (health as HealthCheckResponse).master_career_document;
  const isLoaded = cvHealth?.loaded || false;
  const loadedAt = cvHealth?.loaded_at ? new Date(cvHealth.loaded_at) : null;

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div className="career-profile-card">
      <div className="card-header">
        <div className="card-title">
          <h3>Career Profile</h3>
          <span className={`status-badge ${isLoaded ? "loaded" : "missing"}`}>
            {isLoaded ? "Loaded" : "Not Found"}
          </span>
        </div>
      </div>

      <div className="card-content">
        {!isLoaded ? (
          <div className="status-message">
            <p>Career Profile not found at <code>data/Master_Career_Document.md</code></p>
            <p className="help-text">Add your professional history to get started.</p>
          </div>
        ) : (
          <>
            <div className="profile-details">
              <div className="detail-item">
                <span className="detail-label">Source</span>
                <span className="detail-value">Master_Career_Document.md</span>
              </div>

              {loadedAt && (
                <div className="detail-item">
                  <span className="detail-label">Last Updated</span>
                  <span className="detail-value">{formatDate(loadedAt)}</span>
                </div>
              )}

              {cvHealth?.hash && (
                <div className="detail-item">
                  <span className="detail-label">Version</span>
                  <span className="detail-value mono">{cvHealth.hash.substring(0, 8)}...</span>
                </div>
              )}
            </div>

            <div className="profile-stats">
              <div className="stat">
                <span className="stat-count">{experienceCount}</span>
                <span className="stat-label">Experience</span>
              </div>
              <div className="stat">
                <span className="stat-count">{skillCount}</span>
                <span className="stat-label">Skills</span>
              </div>
              <div className="stat">
                <span className="stat-count">{educationCount}</span>
                <span className="stat-label">Education</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});
