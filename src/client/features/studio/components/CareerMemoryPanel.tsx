import { HealthCheckResponse } from "@shared/types";
import "../styles/career-memory-panel.css";

interface CareerMemoryPanelProps {
  health: HealthCheckResponse | { status: "unhealthy"; error: string } | null;
}

export default function CareerMemoryPanel({ health }: CareerMemoryPanelProps) {
  const masterCV = (health as any)?.master_career_document;
  const isLoaded = masterCV?.loaded === true;

  return (
    <div className="career-memory-panel">
      <div className="panel-header">
        <h2>Career Memory</h2>
        <p className="panel-subtitle">Your professional foundation</p>
      </div>

      <div className="career-memory-content">
        <div className={`career-memory-card ${isLoaded ? "loaded" : "empty"}`}>
          {isLoaded ? (
            <>
              <div className="card-status">
                <span className="status-badge success">✓ Loaded</span>
              </div>
              <div className="card-details">
                <div className="detail-row">
                  <span className="label">Status</span>
                  <span className="value">Active</span>
                </div>
                {masterCV?.content_hash && (
                  <div className="detail-row">
                    <span className="label">Version</span>
                    <span className="value" title={masterCV.content_hash}>
                      {masterCV.content_hash.substring(0, 8)}...
                    </span>
                  </div>
                )}
                {masterCV?.sections?.length > 0 && (
                  <div className="detail-row">
                    <span className="label">Sections</span>
                    <span className="value">{masterCV.sections.length}</span>
                  </div>
                )}
              </div>
              <button className="cta-button secondary">
                View Career Memory
              </button>
            </>
          ) : (
            <>
              <div className="card-status">
                <span className="status-badge empty">○ Not loaded</span>
              </div>
              <div className="card-message">
                <p>
                  Your career memory is the foundation for tailored resumes.
                  Upload or create your career profile to get started.
                </p>
              </div>
              <button className="cta-button primary">
                Create Career Memory
              </button>
            </>
          )}
        </div>
      </div>

      <div className="career-memory-help">
        <details>
          <summary>What is Career Memory?</summary>
          <p>
            Career Memory is a comprehensive record of your professional history, skills,
            achievements, and experience. The system uses it to generate truthful,
            customized resumes and cover letters that highlight your best fit for each job.
          </p>
        </details>
      </div>
    </div>
  );
}
