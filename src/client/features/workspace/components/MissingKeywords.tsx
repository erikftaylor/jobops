import { useState, useEffect } from 'react';
import { useKeywordAnalysis } from '../hooks';
import { useKeywordActions } from '../hooks/useKeywordActions';
import { AnalyticsEvents } from '@client/lib/analytics';

interface MissingKeywordsProps {
  jobId: string | undefined;
}

type FilterType = 'all' | 'critical' | 'missing';

export function MissingKeywords({ jobId }: MissingKeywordsProps) {
  const { analysis, isLoading, error } = useKeywordAnalysis(jobId);
  const { proposeKeyword, acceptKeywordSuggestion, ignoreKeywordSuggestion, isProposing } = useKeywordActions(jobId);
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedKeywords, setExpandedKeywords] = useState<Set<string>>(new Set());
  const [actioningKeyword, setActioningKeyword] = useState<string | null>(null);
  const [proposalIds, setProposalIds] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (analysis) {
      const criticalCount = analysis.missingKeywords.filter(k => k.importance === 'critical').length;
      AnalyticsEvents.keywordAnalysisComplete(analysis.matchPercentage, analysis.missingKeywords.length, criticalCount);
    }
  }, [analysis?.matchPercentage]);

  if (isLoading) {
    return (
      <div className="workspace-card">
        <h3 className="workspace-card-title">Missing Keywords</h3>
        <div className="skeleton-keywords">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-keyword-card">
              <div className="skeleton-keyword-name skeleton" style={{ width: '60%', height: '16px', marginBottom: '12px' }} />
              <div className="skeleton-keyword-meta skeleton" style={{ width: '40%', height: '12px', marginBottom: '12px' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="skeleton skeleton-btn" style={{ flex: 1, height: '32px' }} />
                <div className="skeleton skeleton-btn" style={{ flex: 1, height: '32px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="workspace-card">
        <h3 className="workspace-card-title">Missing Keywords</h3>
        <div className="workspace-error">
          <div className="workspace-error-message">
            <strong>Couldn't analyze keywords</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
              {error === 'Failed to fetch keywords'
                ? 'Check your internet connection and try again.'
                : error.includes('Claude')
                ? 'The AI service is temporarily unavailable. Please try again in a moment.'
                : 'An unexpected error occurred. Please refresh and try again.'}
            </p>
          </div>
          <div className="workspace-error-recovery">
            <button
              className="workspace-error-retry"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis || analysis.missingKeywords.length === 0) {
    return (
      <div className="workspace-card">
        <h3 className="workspace-card-title">Missing Keywords</h3>
        <div className="keywords-empty">
          <div className="keywords-empty-icon">✓</div>
          <p>Great! Your resume covers the essential keywords.</p>
        </div>
      </div>
    );
  }

  const getFilteredKeywords = () => {
    let filtered = analysis.missingKeywords;

    if (filter === 'critical') {
      filtered = filtered.filter(k => k.importance === 'critical');
    } else if (filter === 'missing') {
      filtered = filtered.filter(k => k.status === 'missing');
    }

    // Sort by importance: critical > high > medium > low
    const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return filtered.sort((a, b) =>
      importanceOrder[a.importance] - importanceOrder[b.importance]
    );
  };

  const filteredKeywords = getFilteredKeywords();
  const toggleExpanded = (keyword: string) => {
    const newExpanded = new Set(expandedKeywords);
    if (newExpanded.has(keyword)) {
      newExpanded.delete(keyword);
    } else {
      newExpanded.add(keyword);
    }
    setExpandedKeywords(newExpanded);
  };

  const handleAddKeyword = async (keyword: string, suggestedLanguage: string) => {
    if (!jobId) return;

    setActioningKeyword(keyword);
    try {
      const proposal = await proposeKeyword(keyword, suggestedLanguage, 'resume');
      setProposalIds(new Map(proposalIds).set(keyword, proposal.id));

      // Auto-accept the proposal
      await acceptKeywordSuggestion(proposal.id);
      AnalyticsEvents.keywordAccepted(keyword);
    } catch (err) {
      console.error('Error adding keyword:', err);
    } finally {
      setActioningKeyword(null);
    }
  };

  const handleIgnoreKeyword = async (keyword: string) => {
    const proposalId = proposalIds.get(keyword);
    if (!proposalId) {
      // If no proposal exists yet, just create one and ignore it
      try {
        setActioningKeyword(keyword);
        const proposal = await proposeKeyword(keyword, '', 'resume');
        await ignoreKeywordSuggestion(proposal.id);
        setProposalIds(new Map(proposalIds).set(keyword, proposal.id));
        AnalyticsEvents.keywordIgnored(keyword);
      } catch (err) {
        console.error('Error ignoring keyword:', err);
      } finally {
        setActioningKeyword(null);
      }
      return;
    }

    try {
      setActioningKeyword(keyword);
      await ignoreKeywordSuggestion(proposalId);
      AnalyticsEvents.keywordIgnored(keyword);
    } catch (err) {
      console.error('Error ignoring keyword:', err);
    } finally {
      setActioningKeyword(null);
    }
  };

  return (
    <div className="workspace-card">
      <div className="keywords-header">
        <h3 className="workspace-card-title">Missing Keywords</h3>
        <div className="keywords-stats">
          {analysis.matchedCount}/{analysis.totalKeywordsInJob} matched ({analysis.matchPercentage}%)
        </div>
      </div>

      <div className="keywords-filter-tabs">
        <button
          className={`keywords-filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({analysis.missingKeywords.length})
        </button>
        <button
          className={`keywords-filter-tab ${filter === 'critical' ? 'active' : ''}`}
          onClick={() => setFilter('critical')}
        >
          Critical ({analysis.missingKeywords.filter(k => k.importance === 'critical').length})
        </button>
        <button
          className={`keywords-filter-tab ${filter === 'missing' ? 'active' : ''}`}
          onClick={() => setFilter('missing')}
        >
          Missing ({analysis.missingKeywords.filter(k => k.status === 'missing').length})
        </button>
      </div>

      {filteredKeywords.length === 0 ? (
        <div className="keywords-empty">
          <p>No keywords in this filter.</p>
        </div>
      ) : (
        <div className="keywords-list">
          {filteredKeywords.map((keyword) => {
            const isExpanded = expandedKeywords.has(keyword.keyword);
            return (
              <div key={keyword.keyword} className="keyword-card">
                <div className="keyword-header">
                  <div className="keyword-name">{keyword.keyword}</div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className={`keyword-badge ${keyword.importance}`}>
                      {keyword.importance.charAt(0).toUpperCase() + keyword.importance.slice(1)}
                    </span>
                    <span className="keyword-status">
                      {keyword.status === 'missing' ? 'Missing' : 'Weak'}
                    </span>
                  </div>
                </div>

                <div className="keyword-detail">
                  Found in job {keyword.frequency.inJob}x vs resume {keyword.frequency.inResume}x
                </div>

                {isExpanded && (
                  <>
                    <div className="keyword-placement">
                      <strong>Suggested placement:</strong> {keyword.suggestedPlacement}
                    </div>
                    <div className="keyword-language">
                      "{keyword.suggestedLanguage}"
                    </div>
                  </>
                )}

                <div className="keyword-actions">
                  {!isExpanded && (
                    <button
                      className="keyword-action-btn"
                      onClick={() => toggleExpanded(keyword.keyword)}
                      disabled={isProposing || actioningKeyword === keyword.keyword}
                    >
                      See Suggestion
                    </button>
                  )}
                  <button
                    className="keyword-action-btn primary"
                    onClick={() => handleAddKeyword(keyword.keyword, keyword.suggestedLanguage)}
                    disabled={isProposing || actioningKeyword === keyword.keyword}
                  >
                    {actioningKeyword === keyword.keyword ? 'Adding...' : 'Add This Keyword'}
                  </button>
                  <button
                    className="keyword-action-btn"
                    onClick={() => handleIgnoreKeyword(keyword.keyword)}
                    disabled={isProposing || actioningKeyword === keyword.keyword}
                  >
                    {actioningKeyword === keyword.keyword ? 'Dismissing...' : 'Not Relevant'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
