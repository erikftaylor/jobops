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

  // Fetch analysis when job is selected
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

      // Update job state to analyzed
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
        <div className="panel-header">
          <h2>Strategy Coach</h2>
          <p className="panel-subtitle">Get personalized guidance</p>
        </div>
        <div className="empty-state">
          <p>Select a job to analyze it and get strategic guidance.</p>
        </div>
      </div>
    );
  }

  const currentState = (selectedJob.state || "draft") as JobState;

  return (
    <div className="strategy-coach-panel">
      <div className="panel-header">
        <h2>Strategy Coach</h2>
        <p className="panel-subtitle">Personalized guidance</p>
      </div>

      <div className="strategy-content">
        {/* Fit Analysis Section */}
        {!analysisData ? (
          <div className="analysis-prompt">
            {currentState === "draft" ? (
              <>
                <p>Analyze this job to see your fit and get strategic guidance.</p>
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
          <div className="analysis-results">
            <div className="fit-score-card">
              <div className="score-header">
                <h3>Your Fit</h3>
                <div className="score-badge">
                  <span className="score-value">{analysisData.analysis.estimatedATSFit.score}</span>
                  <span className="score-label">
                    {analysisData.analysis.estimatedATSFit.label}
                  </span>
                </div>
              </div>
              <p className="score-explanation">
                {analysisData.analysis.estimatedATSFit.explanation}
              </p>
            </div>

            {analysisData.analysis.recommendedAngle && (
              <div className="strategy-section">
                <h4>Recommended Positioning Angle</h4>
                <p className="angle-text">
                  {analysisData.analysis.recommendedAngle}
                </p>
              </div>
            )}

            {analysisData.analysis.topStrengths?.length > 0 && (
              <div className="strategy-section">
                <h4>Your Strengths for This Role</h4>
                <ul className="strength-list">
                  {analysisData.analysis.topStrengths.map((strength, i) => (
                    <li key={i}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysisData.analysis.remainingGaps?.length > 0 && (
              <div className="strategy-section gaps">
                <h4>Areas to Emphasize</h4>
                <ul className="gap-list">
                  {analysisData.analysis.remainingGaps.map((gap, i) => (
                    <li key={i}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="strategy-section">
              <h4>Resume Strategy</h4>
              <p>
                Focus on demonstrating the strengths above. Lead with accomplishments
                that directly address the job requirements.
              </p>
            </div>
          </div>
        )}

        {/* Chat Area */}
        {messages.length > 0 && (
          <div className="chat-area">
            <h4>Conversation</h4>
            <div className="messages-list">
              {messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.role}`}>
                  <p>{msg.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        {analysisData && (
          <form className="message-input-form" onSubmit={handleSendMessage}>
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Ask for strategy advice..."
              rows={3}
              disabled={sendingMessage}
            />
            <button
              type="submit"
              className="send-button"
              disabled={sendingMessage || !messageInput.trim()}
            >
              {sendingMessage ? "Sending..." : "Ask"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
