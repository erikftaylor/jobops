import { useEffect, memo } from 'react';
import { useJobFit } from '../hooks';
import { AnalyticsEvents } from '@client/lib/analytics';

interface JobFitDashboardProps {
  jobId: string | undefined;
}

function CircularProgress({ value, max = 100 }: { value: number; max?: number }) {
  const percentage = (value / max) * 100;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="fit-circle">
      <svg width="120" height="120" viewBox="0 0 120 120" aria-label={`Job fit: ${value}%`} role="img">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="6"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="fit-circle-text">
        <div className="fit-circle-value">{value}%</div>
        <div className="fit-circle-percent">fit</div>
      </div>
    </div>
  );
}

export const JobFitDashboard = memo(function JobFitDashboard({ jobId }: JobFitDashboardProps) {
  const { fit, isLoading, error } = useJobFit(jobId);

  useEffect(() => {
    if (fit) {
      AnalyticsEvents.jobFitAnalyzed(fit.overallFit, fit.confidenceLevel);
    }
  }, [fit?.overallFit]);

  if (isLoading) {
    return (
      <div className="workspace-card">
        <h3 className="workspace-card-title">Job Fit Analysis</h3>
        <div className="skeleton-fit" role="status" aria-live="polite" aria-label="Job fit analysis is loading">
          <div className="skeleton-fit-circle skeleton" style={{ width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto 16px' }} />
          <div className="skeleton skeleton-fit-badge" style={{ height: '24px', width: '120px', margin: '0 auto 16px' }} />
          {[1, 2, 3].map(i => (
            <div key={i} style={{ marginBottom: '16px' }}>
              <div className="skeleton" style={{ height: '16px', width: '60%', marginBottom: '8px' }} />
              <div className="skeleton" style={{ height: '12px', width: '100%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !fit) {
    return (
      <div className="workspace-card">
        <h3 className="workspace-card-title">Job Fit Analysis</h3>
        <div className="workspace-error" role="alert" aria-live="assertive">
          <div className="workspace-error-message">
            <strong>Couldn't analyze job fit</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
              {error.includes('fetch')
                ? 'Check your internet connection and try again.'
                : error.includes('Claude')
                ? 'The AI service is temporarily unavailable. Please try again in a moment.'
                : 'An unexpected error occurred. Please refresh and try again.'}
            </p>
          </div>
          <div className="workspace-error-recovery">
            <button className="workspace-error-retry" onClick={() => window.location.reload()} aria-label="Retry job fit analysis">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!fit) {
    return (
      <div className="workspace-card">
        <h3 className="workspace-card-title">Job Fit Analysis</h3>
        <div className="workspace-loading">No fit data available</div>
      </div>
    );
  }

  const confidenceColor =
    fit.confidenceLevel === 'high' ? '#10b981' :
    fit.confidenceLevel === 'medium' ? '#f59e0b' : '#ef4444';

  return (
    <div className="workspace-card">
      <h3 className="workspace-card-title">Job Fit Analysis</h3>

      <div className="fit-dashboard">
        {/* Overall Fit */}
        <div className="fit-overall">
          <CircularProgress value={fit.overallFit} max={100} />
          <div className="fit-info">
            <div
              className="fit-confidence-badge"
              style={{
                backgroundColor: confidenceColor + '20',
                color: confidenceColor,
              }}
            >
              {fit.confidenceLevel.charAt(0).toUpperCase() +
                fit.confidenceLevel.slice(1)}{' '}
              Confidence
            </div>
            <div className="fit-info-text">
              <strong>Overall Assessment:</strong> You are a {fit.overallFit}% fit
              for this position. Review the details below to understand strengths
              and gaps.
            </div>
          </div>
        </div>

        {/* Strong Matches */}
        {fit.strongMatches.length > 0 && (
          <div className="fit-section">
            <h4 className="fit-section-title"><span aria-hidden="true">✓ </span>Strong Matches</h4>
            <div className="fit-matches-list">
              {fit.strongMatches.map((match, idx) => (
                <div key={idx} className="fit-match-item strong">
                  {match}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weak Matches */}
        {fit.weakMatches.length > 0 && (
          <div className="fit-section">
            <h4 className="fit-section-title"><span aria-hidden="true">⚠ </span>Weak Matches</h4>
            <div className="fit-matches-list">
              {fit.weakMatches.map((match, idx) => (
                <div key={idx} className="fit-match-item weak">
                  {match}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejection Risks */}
        {fit.rejectionRisks.length > 0 && (
          <div className="fit-section">
            <h4 className="fit-section-title"><span aria-hidden="true">⚠️ </span>Rejection Risks</h4>
            {fit.rejectionRisks.map((risk, idx) => (
              <div key={idx} className="fit-risk-warning">
                • {risk}
              </div>
            ))}
          </div>
        )}

        {/* Interview Talking Points */}
        {fit.interviewTalkingPoints.length > 0 && (
          <div className="fit-section">
            <h4 className="fit-section-title"><span aria-hidden="true">💡 </span>Interview Talking Points</h4>
            <div className="fit-talking-points">
              {fit.interviewTalkingPoints.map((point, idx) => (
                <div key={idx} className="fit-talking-point">
                  {point}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Positioning Angle */}
        {fit.recommendedPositioningAngle && (
          <div className="fit-section">
            <h4 className="fit-section-title"><span aria-hidden="true">🎯 </span>Recommended Positioning</h4>
            <div className="fit-positioning">
              {fit.recommendedPositioningAngle}
            </div>
          </div>
        )}

        {/* Success Likelihood */}
        {fit.likelihood && (
          <div className="fit-section">
            <h4 className="fit-section-title"><span aria-hidden="true">📊 </span>Success Likelihood</h4>
            <div className="fit-likelihood">
              <div className="fit-likelihood-item">
                <div className="fit-likelihood-label">Phone Screen</div>
                <div className="fit-likelihood-value">
                  {Math.round(fit.likelihood.phoneScreen * 100)}%
                </div>
                <div className="fit-likelihood-percent">Probability</div>
              </div>
              <div className="fit-likelihood-item">
                <div className="fit-likelihood-label">Tech Interview</div>
                <div className="fit-likelihood-value">
                  {Math.round(fit.likelihood.technicalInterview * 100)}%
                </div>
                <div className="fit-likelihood-percent">Probability</div>
              </div>
              <div className="fit-likelihood-item">
                <div className="fit-likelihood-label">Offer</div>
                <div className="fit-likelihood-value">
                  {Math.round(fit.likelihood.offer * 100)}%
                </div>
                <div className="fit-likelihood-percent">Probability</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
