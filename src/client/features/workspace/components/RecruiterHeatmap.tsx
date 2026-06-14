import { useHeatmap } from '../hooks';

interface RecruiterHeatmapProps {
  jobId: string | undefined;
}

export function RecruiterHeatmap({ jobId }: RecruiterHeatmapProps) {
  const { heatmap, isLoading, error } = useHeatmap(jobId);

  if (isLoading) {
    return (
      <div className="workspace-card">
        <h3 className="workspace-card-title">Recruiter Heatmap</h3>
        <div className="workspace-loading">Analyzing visibility...</div>
      </div>
    );
  }

  if (error && !heatmap) {
    return (
      <div className="workspace-card">
        <h3 className="workspace-card-title">Recruiter Heatmap</h3>
        <div className="workspace-error">{error}</div>
      </div>
    );
  }

  if (!heatmap) {
    return (
      <div className="workspace-card">
        <h3 className="workspace-card-title">Recruiter Heatmap</h3>
        <div className="workspace-loading">No heatmap data available</div>
      </div>
    );
  }

  const getRiskColor = (score: number) => {
    if (score >= 75) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  };

  return (
    <div className="workspace-card">
      <h3 className="workspace-card-title">Recruiter Heatmap</h3>
      <p className="workspace-card-subtitle">
        How visible is each section during a typical 6-second resume review?
      </p>

      <div className="heatmap-container">
        <div className="heatmap-overall">
          <div className="heatmap-overall-score">
            {heatmap.overallVisibility}%
          </div>
          <div className="heatmap-overall-text">
            <strong>Overall Visibility</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
              How likely a recruiter will see key content
            </p>
          </div>
        </div>

        <div className="heatmap-sections">
          {heatmap.sections.map((section) => {
            const riskColor = getRiskColor(section.visibilityScore);
            return (
              <div key={section.sectionName} className="heatmap-section">
                <div className="heatmap-section-header">
                  <div className="heatmap-section-name">
                    {section.sectionName}
                    {!section.isVisible && ' (Hidden)'}
                  </div>
                  <div className="heatmap-badges">
                    <span className={`heatmap-badge ${riskColor}`}>
                      {section.visibilityScore}% visible
                    </span>
                    <span className={`heatmap-badge ${section.recruiterConfidence}`}>
                      {section.recruiterConfidence.charAt(0).toUpperCase() +
                        section.recruiterConfidence.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="heatmap-visibility-bar">
                  <div
                    className={`heatmap-visibility-fill ${riskColor}`}
                    style={{ width: `${section.visibilityScore}%` }}
                  />
                </div>

                <div className="heatmap-observations">
                  {section.keyObservations.map((obs, idx) => (
                    <span key={idx}>
                      {idx > 0 && ' • '}
                      {obs}
                    </span>
                  ))}
                </div>

                <div className="heatmap-improvement">
                  {section.recommendedImprovement}
                </div>
              </div>
            );
          })}
        </div>

        {heatmap.sixSecondSkim && (
          <div className="skim-section">
            <div className="skim-section-title">
              ⚡ What a recruiter sees in 6 seconds
            </div>
            <div className="skim-items">
              {heatmap.sixSecondSkim.map((item, idx) => (
                <div key={idx} className="skim-item">{item}</div>
              ))}
            </div>
          </div>
        )}

        {heatmap.skippedSections && heatmap.skippedSections.length > 0 && (
          <div style={{
            padding: '12px',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
            color: '#991b1b',
            fontSize: '12px'
          }}>
            <strong>Likely skipped:</strong> {heatmap.skippedSections.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}
