import { useState, useEffect, memo } from 'react';
import { AnalyticsEvents } from '@client/lib/analytics';

interface ArtifactVariant {
  type: string;
  description: string;
  artifact: any;
  score: number;
  strengths: string[];
  risks: string[];
  preview: string;
}

interface ArtifactComparisonProps {
  jobId?: string | undefined;
}

type ComparisonTab = 'original' | 'atsOptimized' | 'executiveSummary' | 'recruiterOptimized';

export const ArtifactComparison = memo(function ArtifactComparison({ jobId }: ArtifactComparisonProps) {
  const [activeTab, setActiveTab] = useState<ComparisonTab>('original');
  const [variants, setVariants] = useState<ArtifactVariant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const loadArtifacts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/workspace/${jobId}/artifacts`);
        if (!response.ok) {
          throw new Error('Failed to load artifacts');
        }
        const data = await response.json();
        setVariants(data.variants || []);
        // Set active tab to first variant if available
        if (data.variants && data.variants.length > 0) {
          setActiveTab(data.variants[0].type as ComparisonTab);
          AnalyticsEvents.artifactGenerated(data.variants[0].type, data.variants[0].score);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        AnalyticsEvents.artifactGenerationError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    loadArtifacts();
  }, [jobId]);

  const handleTabChange = (tabType: ComparisonTab) => {
    setActiveTab(tabType);
    const variant = variants.find(v => v.type === tabType);
    if (variant) {
      AnalyticsEvents.artifactSwitched(tabType);
    }
  };

  const currentVariant = variants.find(v => v.type === activeTab);

  if (isLoading) {
    return (
      <div className="workspace-card">
        <h3 className="workspace-card-title">Resume Versions</h3>
        <p className="workspace-card-subtitle">
          Compare different versions and their scores
        </p>
        <div className="skeleton-artifacts" role="status" aria-live="polite" aria-label="Resume versions are loading">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ flex: 1, height: '40px', borderRadius: '6px' }} />
            ))}
          </div>
          <div className="skeleton" style={{ height: '200px', marginBottom: '16px', borderRadius: '6px' }} />
          <div className="skeleton" style={{ height: '40px', borderRadius: '6px' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workspace-card">
        <h3 className="workspace-card-title">Resume Versions</h3>
        <p className="workspace-card-subtitle">
          Compare different versions and their scores
        </p>
        <div className="workspace-error" role="alert" aria-live="assertive">
          <div className="workspace-error-message">
            <strong>Couldn't generate resume versions</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
              {error.includes('fetch')
                ? 'Check your internet connection and try again.'
                : error.includes('timeout')
                ? 'Generation is taking longer than expected. Please try again in a moment.'
                : 'An unexpected error occurred. Please refresh and try again.'}
            </p>
          </div>
          <div className="workspace-error-recovery">
            <button className="workspace-error-retry" onClick={() => window.location.reload()} aria-label="Retry resume version generation">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-card">
      <h3 className="workspace-card-title">Resume Versions</h3>
      <p className="workspace-card-subtitle">
        Compare different versions and their scores
      </p>

      <div className="artifact-comparison-container">
        <div className="comparison-tabs" role="tablist" aria-label="Resume version comparison">
          {variants.map((variant) => (
            <button
              key={variant.type}
              role="tab"
              aria-selected={activeTab === variant.type}
              aria-controls={`comparison-panel-${variant.type}`}
              className={`comparison-tab ${activeTab === variant.type ? 'active' : ''}`}
              onClick={() => handleTabChange(variant.type as ComparisonTab)}
              aria-label={`${variant.description} version with score ${variant.score}`}
            >
              <span>{variant.description}</span>
              <span
                style={{
                  marginLeft: '8px',
                  fontSize: '12px',
                  opacity: 0.7,
                }}
                aria-hidden="true"
              >
                {variant.score}
              </span>
            </button>
          ))}
        </div>

        {currentVariant && (
          <>
            <div className="comparison-content" role="tabpanel" id={`comparison-panel-${activeTab}`}>
              <div style={{ width: '100%', textAlign: 'center', color: '#999' }}>
                <p style={{ marginBottom: '8px' }}>{currentVariant.description}</p>
                <p style={{ fontSize: '12px', color: '#ccc' }}>
                  Version tailored with {currentVariant.type} positioning
                </p>
              </div>
            </div>

            {/* Score Comparison */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${variants.length}, 1fr)`,
                gap: '12px',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #e5e7eb',
              }}
            >
              {variants.map((variant) => (
                <div
                  key={variant.type}
                  style={{
                    padding: '12px',
                    background: activeTab === variant.type ? '#dbeafe' : '#f9fafb',
                    border: activeTab === variant.type ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius: '6px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#1d4ed8',
                      marginBottom: '4px',
                    }}
                  >
                    {variant.score}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {variant.type.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                </div>
              ))}
            </div>

            {/* Version Details */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
              <h4
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  marginBottom: '12px',
                }}
              >
                Strengths
              </h4>
              <ul style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
                {currentVariant.strengths.map((strength, i) => (
                  <li key={i}><span aria-hidden="true">✓ </span>{strength}</li>
                ))}
              </ul>

              {currentVariant.risks.length > 0 && (
                <>
                  <h4
                    style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#d32f2f',
                      marginTop: '12px',
                      marginBottom: '8px',
                    }}
                  >
                    Risks to Consider
                  </h4>
                  <ul style={{ fontSize: '12px', color: '#d32f2f', lineHeight: '1.6' }}>
                    {currentVariant.risks.map((risk, i) => (
                      <li key={i}><span aria-hidden="true">⚠ </span>{risk}</li>
                    ))}
                  </ul>
                </>
              )}

              <h4
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  marginTop: '12px',
                  marginBottom: '8px',
                }}
              >
                Preview
              </h4>
              <pre
                style={{
                  fontSize: '11px',
                  color: '#666',
                  background: '#f9fafb',
                  padding: '8px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '150px',
                }}
              >
                {currentVariant.preview}
              </pre>
            </div>

            <button
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '10px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#2563eb')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#3b82f6')}
              aria-label={`Use the ${currentVariant.description} version`}
            >
              Use This Version
            </button>
          </>
        )}
      </div>
    </div>
  );
});
