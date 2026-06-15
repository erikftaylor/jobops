import { useState, useEffect } from "react";
import { Job } from "@shared/types";
import { Message } from "../../jobs/hooks/useMessages";
import "../styles/strategy-coach-panel.css";

type JobState = "draft" | "analyzed" | "refining" | "approved" | "generated" | "applied" | "closed";

interface AnalysisData {
  id: string;
  jobId: string;
  analysis: {
    verdict: "APPLY" | "STRETCH" | "SKIP";
    estimatedATSFit: {
      score: number;
      label: string;
      explanation: string;
    };
    topStrengths: string[];
    remainingGaps: string[];
    recommendedAngle: string;
  };
}

interface StrategyCoachPanelProps {
  selectedJob?: Job;
  messages: Message[];
  onSendMessage: (content: string) => Promise<void>;
  onStateChange: (newState: JobState) => Promise<void>;
}

export default function StrategyCoachPanel({
  selectedJob,
  messages,
  onSendMessage,
  onStateChange,
}: StrategyCoachPanelProps) {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);

  useEffect(() => {
    if (!selectedJob) {
      setAnalysisData(null);
      return;
    }

    const fetchAnalysis = async () => {
      try {
        const response = await fetch(`/api/jobs/${selectedJob.id}/analyses`);
        if (response.ok) {
          const data = await response.json();
          setAnalysisData(data);
        }
      } catch (err) {
        console.error("Failed to fetch analysis:", err);
      }
    };

    fetchAnalysis();
  }, [selectedJob?.id]);

  const handleAnalyzeJob = async () => {
    if (!selectedJob) return;

    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch(`/api/jobs/${selectedJob.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: selectedJob.description,
        }),
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const data = await response.json();
      setAnalysisData(data);

      if (selectedJob.state === "draft") {
        await onStateChange("analyzed");
      }
    } catch (err) {
      setAnalysisError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedJob) return;

    setSendingMessage(true);
    try {
      await onSendMessage(messageInput);
      setMessageInput("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSendingMessage(false);
    }
  };

  if (!selectedJob) {
    return (
      <div className="strategy-coach-panel empty">
        <h2 className="studio-section-title">Job Analysis</h2>
        <p className="studio-section-description">
          Select a job to analyze it and get tailored guidance.
        </p>
      </div>
    );
  }

  const currentState = (selectedJob.state || "draft") as JobState;

  return (
    <div className="strategy-coach-panel">
      <h2 className="studio-section-title">Job Analysis</h2>

      <div className="strategy-content">
        {!analysisData ? (
          <div className="analysis-prompt">
            {currentState === "draft" ? (
              <>
                <p>Ready to analyze? We'll assess your fit and identify the best way to approach this role.</p>
                <button
                  className="cta-button primary"
                  onClick={handleAnalyzeJob}
                  disabled={analyzing || !selectedJob.description}
                >
                  {analyzing ? "Analyzing..." : "Analyze Job"}
                </button>
                {analysisError && (
                  <div className="error-message">{analysisError}</div>
                )}
              </>
            ) : (
              <p>Loading analysis...</p>
            )}
          </div>
        ) : (
          <>
            {/* Analysis Summary */}
            <div className="analysis-summary">
              <div className="summary-header">
                <div className="fit-badge">
                  <span className="fit-label">{analysisData.analysis.estimatedATSFit.label}</span>
                  <span className="fit-score">{analysisData.analysis.estimatedATSFit.score}</span>
                </div>
              </div>

              <p className="fit-explanation">
                {analysisData.analysis.estimatedATSFit.explanation}
              </p>

              {analysisData.analysis.topStrengths?.length > 0 && (
                <div className="summary-section">
                  <h4>What You Bring</h4>
                  <ul className="strength-list">
                    {analysisData.analysis.topStrengths.map((strength, i) => (
                      <li key={i}>{strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisData.analysis.remainingGaps?.length > 0 && (
                <div className="summary-section">
                  <h4>What to Emphasize</h4>
                  <ul className="gap-list">
                    {analysisData.analysis.remainingGaps.map((gap, i) => (
                      <li key={i}>{gap}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisData.analysis.recommendedAngle && (
                <div className="summary-section">
                  <h4>Your Best Angle</h4>
                  <p className="angle-text">
                    {analysisData.analysis.recommendedAngle}
                  </p>
                </div>
              )}
            </div>

            {/* Collapsible Chat Section */}
            <div className="chat-section">
              <button
                className="chat-toggle"
                onClick={() => setChatExpanded(!chatExpanded)}
                aria-expanded={chatExpanded}
              >
                <span className="toggle-label">Ask Strategy Coach</span>
                <span className="toggle-icon">{chatExpanded ? "−" : "+"}</span>
              </button>

              {chatExpanded && (
                <div className="chat-content">
                  {messages.length > 0 && (
                    <div className="messages-list">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`message ${msg.role}`}>
                          <p>{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <form className="message-input-form" onSubmit={handleSendMessage}>
                    <textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Ask for strategy advice..."
                      rows={2}
                      disabled={sendingMessage}
                    />
                    <button
                      type="submit"
                      className="send-button"
                      disabled={sendingMessage || !messageInput.trim()}
                    >
                      {sendingMessage ? "Sending..." : "Send"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
