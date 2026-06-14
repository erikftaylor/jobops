import { useState } from "react";
import { Job } from "@shared/types";
import ConversationPanel from "./ConversationPanel.js";
import "../styles/studio-panel.css";

type JobState = "draft" | "analyzed" | "refining" | "approved" | "generated" | "applied" | "closed";

interface StudioPanelProps {
  selectedJob?: Job;
  isLoading?: boolean;
  onStateChange: (newState: JobState) => Promise<void>;
  onAnalysisRefresh?: () => void;
  onOpenWorkspace?: (jobId: string) => void;
}

interface AnalysisData {
  id: string;
  jobId: string;
  analysis: {
    verdict: "APPLY" | "STRETCH" | "SKIP";
    estimatedATSFit: {
      score: number;
      label: string;
      explanation: string;
      formulaNote: string;
    };
    topStrengths: string[];
    redFlags: string[];
    remainingGaps: string[];
    recommendedAngle: string;
  };
}

const STATE_LABELS: Record<JobState, string> = {
  draft: "Draft",
  analyzed: "Analyzed",
  refining: "Refining",
  approved: "Approved",
  generated: "Generated",
  applied: "Applied",
  closed: "Closed",
};

const STATE_ACTIONS: Record<JobState, { label: string; nextState: JobState }[]> = {
  draft: [
    { label: "Analyze Job", nextState: "analyzed" },
    { label: "Close", nextState: "closed" },
  ],
  analyzed: [
    { label: "Start Refining", nextState: "refining" },
    { label: "Close", nextState: "closed" },
  ],
  refining: [
    { label: "Approve", nextState: "approved" },
    { label: "Close", nextState: "closed" },
  ],
  approved: [
    { label: "Generate Documents", nextState: "generated" },
    { label: "Close", nextState: "closed" },
  ],
  generated: [
    { label: "I Applied", nextState: "applied" },
    { label: "Close", nextState: "closed" },
  ],
  applied: [
    { label: "Mark Closed", nextState: "closed" },
  ],
  closed: [],
};

export default function StudioPanel({ selectedJob, isLoading, onStateChange, onAnalysisRefresh, onOpenWorkspace }: StudioPanelProps) {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  if (!selectedJob) {
    return (
      <div className="studio-panel-empty">
        <p>Select a job from the Sources panel to use Studio controls.</p>
      </div>
    );
  }

  const currentState = (selectedJob.state || "draft") as JobState;
  const availableActions = STATE_ACTIONS[currentState] || [];

  const handleAnalyzeJob = async () => {
    if (currentState !== "draft" || !selectedJob.description) {
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch(`/api/jobs/${selectedJob.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Analysis failed");
      }

      const data = await response.json();
      setAnalysisData(data);
      if (onAnalysisRefresh) {
        onAnalysisRefresh();
      }

      // Start a conversation after successful analysis
      try {
        const conversationResponse = await fetch("/api/conversations/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: selectedJob.id,
            analysisId: data.id,
          }),
        });

        if (conversationResponse.ok) {
          const conversation = await conversationResponse.json();
          setActiveConversation(conversation.id);
        } else {
          console.error("Failed to start conversation:", await conversationResponse.json());
        }
      } catch (err) {
        console.error("Error starting conversation:", err);
      }
    } catch (err) {
      setAnalysisError((err as Error).message);
      console.error("Analysis error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleActionClick = async (nextState: JobState) => {
    if (nextState === "analyzed" && currentState === "draft") {
      await handleAnalyzeJob();
    } else {
      await onStateChange(nextState);
    }
  };

  return (
    <div className="studio-panel-container">
      <div className="studio-header">
        <h3>Studio Controls</h3>
        <p className="studio-subtitle">Job analysis & actions</p>
      </div>

      <div className="state-info">
        <div className="state-badge">
          <span className="label">Current State</span>
          <span className={`state-value state-${currentState}`}>
            {STATE_LABELS[currentState]}
          </span>
        </div>
      </div>

      {analysisError && (
        <div className="analysis-error">
          <strong>Analysis Error:</strong> {analysisError}
        </div>
      )}

      {analysisData && analysisData.analysis && (
        <div className="analysis-summary">
          <h4>Analysis Results</h4>

          <div className="verdict-badge">
            <span className="label">Verdict</span>
            <span
              className={`verdict ${analysisData.analysis.verdict.toLowerCase()}`}
            >
              {analysisData.analysis.verdict}
            </span>
          </div>

          <div className="fit-score">
            <span className="label">Estimated ATS Fit</span>
            <span className="score">{analysisData.analysis.estimatedATSFit.score}%</span>
            <span className="label-score">{analysisData.analysis.estimatedATSFit.label}</span>
            <p className="formula-note">
              {analysisData.analysis.estimatedATSFit.formulaNote}
            </p>
          </div>

          {analysisData.analysis.topStrengths.length > 0 && (
            <div className="analysis-section">
              <h5>Top Strengths</h5>
              <ul>
                {analysisData.analysis.topStrengths.slice(0, 3).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {analysisData.analysis.redFlags.length > 0 && (
            <div className="analysis-section red-flags">
              <h5>Red Flags</h5>
              <ul>
                {analysisData.analysis.redFlags.slice(0, 3).map((flag, i) => (
                  <li key={i}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {analysisData.analysis.remainingGaps.length > 0 && (
            <div className="analysis-section">
              <h5>Remaining Gaps</h5>
              <ul>
                {analysisData.analysis.remainingGaps.slice(0, 3).map((gap, i) => (
                  <li key={i}>{gap}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="analysis-section">
            <h5>Recommended Positioning Angle</h5>
            <p>{analysisData.analysis.recommendedAngle}</p>
          </div>

          <p className="analysis-note">
            📊 See the Chat panel for full analysis details, including the gap table and terminology mapping.
          </p>
        </div>
      )}

      {/* Workspace Button */}
      {selectedJob.state === "analyzed" && onOpenWorkspace && (
        <div style={{ marginBottom: "20px" }}>
          <button
            className="action-button"
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              color: "white",
              fontWeight: "600",
            }}
            onClick={() => onOpenWorkspace(selectedJob.id)}
          >
            📊 Open Workspace Analysis
          </button>
        </div>
      )}

      <div className="state-controls">
        {availableActions.length > 0 ? (
          <>
            <h4>Next Actions</h4>
            <div className="action-buttons">
              {availableActions.map((action) => (
                <button
                  key={action.nextState}
                  className="action-button"
                  onClick={() => handleActionClick(action.nextState)}
                  disabled={isLoading || analyzing}
                >
                  {analyzing && action.label.includes("Analyze") ? "Analyzing..." : action.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="closed-message">This job is closed. No further actions available.</p>
        )}
      </div>

      {activeConversation && (
        <ConversationPanel
          conversationId={activeConversation}
        />
      )}
    </div>
  );
}
