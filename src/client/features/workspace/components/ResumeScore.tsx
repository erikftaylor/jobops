import { useEffect, memo } from 'react';
import { useWorkspaceScore } from '../hooks';
import { AnalyticsEvents } from '@client/lib/analytics';

interface ResumeScoreProps {
  jobId: string | undefined;
}

function CircularProgress({ value, max = 100 }: { value: number; max?: number }) {
  const percentage = (value / max) * 100;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="score-circle">
      <svg width="140" height="140" viewBox="0 0 140 140" aria-label={`Resume score: ${value} out of ${max}`} role="img">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="score-circle-text">
        <div className="score-circle-value">{value}</div>
        <div className="score-circle-max">/ {max}</div>
      </div>
    </div>
  );
}

export const ResumeScore = memo(function ResumeScore({ jobId }: ResumeScoreProps) {
  const { score, isLoading, error, reload } = useWorkspaceScore(jobId);

  useEffect(() => {
    if (score) {
      const categoryScores = Object.fromEntries(
        Object.entries(score.categories).map(([key, cat]) => [key, cat.score])
      );
      AnalyticsEvents.resumeScored(score.total, categoryScores);
    }
  }, [score?.total]);

  if (isLoading) {
    return (
      <div className="workspace-card">
        <h3 className="workspace-card-title">Resume Score</h3>
        <div className="skeleton-score" role="status" aria-live="polite" aria-label="Resume score is loading">
          <div className="skeleton-score-circle skeleton" />
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton-score-category">
              <div className="skeleton-category-name skeleton" />
              <div className="skeleton-category-bar skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !score) {
    return (
      <div className="workspace-card">
        <h3 className="workspace-card-title">Resume Score</h3>
        <div className="workspace-error" role="alert" aria-live="assertive">
          <div className="workspace-error-message">
            <strong>Couldn't calculate score</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
              {error === 'Failed to fetch score'
                ? 'Check your internet connection and try again.'
                : error.includes('Claude')
                ? 'The AI service is temporarily unavailable. Please try again in a moment.'
                : 'An unexpected error occurred. Please refresh and try again.'}
            </p>
          </div>
          <div className="workspace-error-recovery">
            <button className="workspace-error-retry" onClick={reload} aria-label="Retry resume score calculation">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!score) {
    return (
      <div className="workspace-card">
        <h3 className="workspace-card-title">Resume Score</h3>
        <div className="workspace-loading">No score data available</div>
      </div>
    );
  }

  const categories = score.categories;
  const categoryEntries = Object.entries(categories);

  return (
    <div className="workspace-card">
      <h3 className="workspace-card-title">Resume Score</h3>
      <div className="resume-score-container">
        <div className="score-display">
          <CircularProgress value={score.total} max={score.maxScore} />
          <div className="score-info">
            <div className="score-confidence" aria-label={`Confidence level: ${score.confidence >= 0.9 ? 'high' : score.confidence >= 0.7 ? 'medium' : 'lower'}, ${Math.round(score.confidence * 100)}%`}>
              <span aria-hidden="true">{score.confidence >= 0.9 ? '✓ ' :
               score.confidence >= 0.7 ? '◐ ' :
               '⚠️ '}</span>
              {score.confidence >= 0.9 ? 'High Confidence' :
               score.confidence >= 0.7 ? 'Medium Confidence' :
               'Lower Confidence'} ({Math.round(score.confidence * 100)}%)
            </div>
            {score.recommendations.length > 0 && (
              <div className="score-recommendations">
                <p className="workspace-card-subtitle">Top Recommendations:</p>
                <ul className="score-recommendations-list">
                  {score.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="score-categories">
          {categoryEntries.map(([key, category]) => (
            <div key={key} className="score-category">
              <div className="score-category-label">
                {category.name}
              </div>
              <div className="score-category-bar">
                <div
                  className="score-category-fill"
                  style={{ width: `${Math.min(category.score, 100)}%` }}
                />
              </div>
              <div className="score-category-value">
                {category.score}
              </div>
            </div>
          ))}
        </div>

        <button className="workspace-back-btn" style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }} aria-label="View detailed score breakdown by category">
          View Detailed Breakdown
        </button>
      </div>
    </div>
  );
});
