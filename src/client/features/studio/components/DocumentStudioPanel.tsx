import { useState } from "react";
import { Job } from "@shared/types";
import { GenerateButton } from "../../artifacts/index";
import "../styles/document-studio-panel.css";

type JobState = "draft" | "analyzed" | "refining" | "approved" | "generated" | "applied" | "closed";

interface DocumentStudioPanelProps {
  selectedJob?: Job;
  onStateChange: (newState: JobState) => Promise<void>;
  onMarkApplied: () => Promise<void>;
  onOpenWorkspace?: () => void;
}

export default function DocumentStudioPanel({
  selectedJob,
  onStateChange,
  onMarkApplied,
  onOpenWorkspace,
}: DocumentStudioPanelProps) {
  const [hasResume, setHasResume] = useState(false);

  if (!selectedJob) {
    return (
      <div className="document-studio-panel empty">
        <div className="panel-header">
          <h2>Document Studio</h2>
          <p className="panel-subtitle">Your tailored materials</p>
        </div>
        <div className="empty-state">
          <p>Select a job to generate your tailored resume and cover letter.</p>
        </div>
      </div>
    );
  }

  const currentState = (selectedJob.state || "draft") as JobState;
  const canGenerate =
    currentState === "analyzed" ||
    currentState === "refining" ||
    currentState === "approved" ||
    currentState === "generated";

  return (
    <div className="document-studio-panel">
      <div className="panel-header">
        <h2>Document Studio</h2>
        <p className="panel-subtitle">Tailored to this job</p>
      </div>

      <div className="studio-content">
        {/* Resume Card */}
        <div className="document-card resume-card">
          <h3>Resume</h3>
          <p className="card-description">
            Tailored to emphasize your best fit for this role
          </p>

          <div className="card-actions">
            {canGenerate && (
              <GenerateButton
                jobId={selectedJob.id}
                onArtifactCreated={() => {
                  setHasResume(true);
                  if (currentState !== "generated") {
                    onStateChange("generated");
                  }
                }}
              />
            )}
            {!canGenerate && (
              <div className="button-disabled">
                <p>Analyze the job first to generate a tailored resume</p>
              </div>
            )}
          </div>

          {/* Preview button - TODO: Wire to actual artifact preview in Phase 2 */}
          {/* <div className="card-cta-section">
            <button
              className="action-link"
              disabled={!hasResume}
            >
              Preview Resume
            </button>
          </div> */}
        </div>

        {/* Cover Letter Card */}
        <div className="document-card cover-letter-card">
          <h3>Cover Letter</h3>
          <p className="card-description">
            A thoughtful letter addressing this specific role
          </p>

          <div className="card-actions">
            <button className="cta-button disabled" disabled>
              Generate Letter
            </button>
            <p className="coming-soon">Coming in Phase 2</p>
          </div>
        </div>

        {/* Export Section */}
        <div className="export-section">
          <h3>Export & Save</h3>

          <div className="export-options">
            <div className="export-option">
              <label>PDF Export</label>
              <button
                className="export-button"
                disabled={!hasResume}
              >
                Download PDF
              </button>
            </div>

            <div className="export-option">
              <label>Copy to Clipboard</label>
              <button
                className="export-button"
                disabled={!hasResume}
              >
                Copy Text
              </button>
            </div>

            <div className="export-option disabled">
              <label>Google Drive</label>
              <button
                className="export-button"
                disabled
              >
                Save to Drive
              </button>
              <p className="coming-soon">Coming soon</p>
            </div>
          </div>
        </div>

        {/* Workspace Link */}
        {currentState !== "draft" && (
          <div className="workspace-link-section">
            <button
              className="workspace-link"
              onClick={onOpenWorkspace}
              title="Advanced features and analytics"
            >
              Advanced Features →
            </button>
          </div>
        )}

        {/* Close the Loop */}
        <div className="close-loop-section">
          <h3>Mark Applied</h3>
          <p className="section-description">
            When you've submitted your application, mark it as applied to track
            your outreach.
          </p>
          <button
            className={`cta-button ${currentState === "applied" ? "success" : "primary"}`}
            onClick={onMarkApplied}
            disabled={currentState === "applied"}
          >
            {currentState === "applied" ? "✓ Marked as Applied" : "Mark as Applied"}
          </button>
        </div>
      </div>

      {/* Resume Preview Modal - TODO: Wire this to actual artifact data */}
      {/* {showResumePreview && selectedJob.artifacts?.resume && (
        <ResumePreviewModal
          artifact={selectedJob.artifacts.resume}
          onClose={() => setShowResumePreview(false)}
        />
      )} */}
    </div>
  );
}
