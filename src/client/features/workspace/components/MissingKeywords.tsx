import { useState } from 'react';
import { useKeywordAnalysis } from '../hooks';
import { useKeywordActions } from '../hooks/useKeywordActions';

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

  if (isLoading) {
    return (
      <div className="workspace-card">
        <h3 className="workspace-card-title">Missing Keywords</h3>
        <div className="workspace-loading">Analyzing keywords...</div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="workspace-card">
        <h3 className="workspace-card-title">Missing Keywords</h3>
        <div className="workspace-error">{error}</div>
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
                  <button
                    className="keyword-action-btn"
                    onClick={() => toggleExpanded(keyword.keyword)}
                    disabled={isProposing || actioningKeyword === keyword.keyword}
                  >
                    {isExpanded ? 'Hide' : 'Review'}
                  </button>
                  <button
                    className="keyword-action-btn primary"
                    onClick={() => handleAddKeyword(keyword.keyword, keyword.suggestedLanguage)}
                    disabled={isProposing || actioningKeyword === keyword.keyword}
                  >
                    {actioningKeyword === keyword.keyword ? 'Adding...' : 'Add to Resume'}
                  </button>
                  <button
                    className="keyword-action-btn"
                    onClick={() => handleIgnoreKeyword(keyword.keyword)}
                    disabled={isProposing || actioningKeyword === keyword.keyword}
                  >
                    {actioningKeyword === keyword.keyword ? 'Ignoring...' : 'Ignore'}
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
