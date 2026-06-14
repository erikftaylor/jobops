import { useState, useEffect } from 'react';
import { useRecruiterChat } from '../hooks/useRecruiterChat';
import { RECRUITER_QUESTIONS } from '@shared/types';
import { AnalyticsEvents } from '@client/lib/analytics';

interface RecruiterChatProps {
  jobId?: string | undefined;
}

export function RecruiterChat({ jobId }: RecruiterChatProps) {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const { isLoading, error, askQuestion } = useRecruiterChat({ jobId });

  const handleQuestionClick = async (questionId: string) => {
    // Toggle if already selected
    if (selectedQuestionId === questionId && answers[questionId]) {
      setSelectedQuestionId(selectedQuestionId === questionId ? null : questionId);
      return;
    }

    setSelectedQuestionId(questionId);
    AnalyticsEvents.recruiterQuestionClicked(questionId, RECRUITER_QUESTIONS.find(q => q.id === questionId)?.question);

    // Don't re-fetch if already have the answer
    if (answers[questionId]) {
      return;
    }

    // Fetch the answer
    try {
      const result = await askQuestion(questionId);
      if (result) {
        setAnswers(prev => ({
          ...prev,
          [questionId]: result,
        }));
        AnalyticsEvents.recruiterQuestionAnswered(questionId, result.confidence);
      }
    } catch (err) {
      AnalyticsEvents.recruiterQuestionError(questionId, err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const currentAnswer = selectedQuestionId ? answers[selectedQuestionId] : null;
  const isCurrentlyLoading = isLoading && selectedQuestionId && !answers[selectedQuestionId];

  return (
    <div className="workspace-card">
      <h3 className="workspace-card-title">AI Recruiter Chat</h3>
      <p className="workspace-card-subtitle">
        Ask AI recruiter questions about your fit
      </p>

      <div className="recruiter-chat-container">
        <div className="chat-prompts">
          {RECRUITER_QUESTIONS.map((question) => (
            <button
              key={question.id}
              className={`chat-prompt-btn ${
                selectedQuestionId === question.id ? 'active' : ''
              }`}
              onClick={() => handleQuestionClick(question.id)}
              disabled={isCurrentlyLoading || false}
              title={question.description}
            >
              {question.question}
            </button>
          ))}
        </div>

        <div className="chat-response">
          {!selectedQuestionId ? (
            <div className="chat-response-empty">
              <p style={{ margin: '20px 0' }}>👈 Select a question to see AI insights</p>
              <p style={{ fontSize: '12px', color: '#999', marginTop: '12px' }}>Questions update as you modify your resume</p>
            </div>
          ) : isCurrentlyLoading ? (
            <div className="chat-response-loading">
              <div className="skeleton" style={{ height: '20px', marginBottom: '12px', width: '80%' }} />
              <div className="skeleton" style={{ height: '16px', marginBottom: '8px', width: '100%' }} />
              <div className="skeleton" style={{ height: '16px', marginBottom: '8px', width: '95%' }} />
              <div className="skeleton" style={{ height: '16px', marginBottom: '20px', width: '70%' }} />
              <div className="skeleton" style={{ height: '16px', marginBottom: '8px', width: '100%' }} />
              <div className="skeleton" style={{ height: '16px', width: '85%' }} />
            </div>
          ) : error ? (
            <div className="chat-response-error">
              <strong>Couldn't get AI insights</strong>
              <p style={{ fontSize: '12px', marginTop: '8px' }}>
                {error.includes('Claude')
                  ? 'The AI service is temporarily unavailable. Please try again in a moment.'
                  : error.includes('fetch')
                  ? 'Check your internet connection and try again.'
                  : 'An unexpected error occurred. Please refresh and try again.'}
              </p>
              <button
                className="workspace-error-retry"
                style={{ marginTop: '12px' }}
                onClick={() => handleQuestionClick(selectedQuestionId!)}
              >
                Retry
              </button>
            </div>
          ) : currentAnswer ? (
            <div className="chat-response-content">
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#1a1a1a' }}>
                  {currentAnswer.answer}
                </p>
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    background: currentAnswer.confidence >= 0.85 ? '#d1fae5' : '#fef3c7',
                    color: currentAnswer.confidence >= 0.85 ? '#065f46' : '#92400e',
                    borderRadius: '4px'
                  }}>
                    {currentAnswer.confidence >= 0.9 ? '✓ High' : currentAnswer.confidence >= 0.7 ? '◐ Medium' : '⚠️ Lower'} Confidence ({Math.round(currentAnswer.confidence * 100)}%)
                  </span>
                </div>
              </div>

              {currentAnswer.risks && currentAnswer.risks.length > 0 && (
                <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f0f0f0' }}>
                  <h5 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#d32f2f' }}>⚠️ Concerns</h5>
                  <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', lineHeight: '1.5' }}>
                    {currentAnswer.risks.map((risk: string, idx: number) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {currentAnswer.suggestedChanges && currentAnswer.suggestedChanges.length > 0 && (
                <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f0f0f0' }}>
                  <h5 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#1976d2' }}>💡 Suggested Changes</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {currentAnswer.suggestedChanges.map((change: any, idx: number) => (
                      <div key={idx} style={{ padding: '10px', background: '#f5f5f5', borderRadius: '6px', fontSize: '13px' }}>
                        <p style={{ margin: '0 0 6px 0', fontWeight: '600' }}>
                          {change.target.charAt(0).toUpperCase() + change.target.slice(1)} → {change.operation}
                        </p>
                        <p style={{ margin: '0 0 4px 0', color: '#555' }}>"{change.value}"</p>
                        <p style={{ margin: '0', color: '#999', fontSize: '12px' }}>{change.reasoning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentAnswer.followUpQuestions && currentAnswer.followUpQuestions.length > 0 && (
                <div>
                  <h5 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#1a1a1a' }}>❓ Follow-up Questions</h5>
                  <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', lineHeight: '1.5' }}>
                    {currentAnswer.followUpQuestions.map((q: string, idx: number) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="chat-response-empty">
              No response available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
