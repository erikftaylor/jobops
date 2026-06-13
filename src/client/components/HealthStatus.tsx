import { HealthCheckResponse } from "@shared/types";
import "../styles/health-status.css";

interface HealthStatusProps {
  health: HealthCheckResponse | { status: "unhealthy"; error: string };
}

export default function HealthStatus({ health }: HealthStatusProps) {
  if (health.status === "unhealthy") {
    return (
      <div className="health-status">
        <div className="status-item error">
          <span className="indicator">●</span>
          <span>Server unavailable</span>
        </div>
      </div>
    );
  }

  const dbConnected = health.database?.connected;
  const cvLoaded = health.master_career_document?.loaded;
  const apiConfigured = health.claude_api?.key_configured;

  return (
    <div className="health-status">
      <div className={`status-item ${dbConnected ? "ok" : "error"}`}>
        <span className="indicator">●</span>
        <span>{dbConnected ? "SQLite" : "SQLite (error)"}</span>
      </div>

      <div className={`status-item ${cvLoaded ? "ok" : "warning"}`}>
        <span className="indicator">●</span>
        <span>{cvLoaded ? "Master CV" : "Master CV (missing)"}</span>
      </div>

      <div className={`status-item ${apiConfigured ? "ok" : "warning"}`}>
        <span className="indicator">●</span>
        <span>{apiConfigured ? "API key" : "API key (missing)"}</span>
      </div>
    </div>
  );
}
