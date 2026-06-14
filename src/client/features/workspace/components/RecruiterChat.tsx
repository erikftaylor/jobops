import { useState } from 'react';
import { useRecruiterChat } from '../hooks/useRecruiterChat';
import { RECRUITER_QUESTIONS } from '@shared/types';

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

    // Don't re-fetch if already have the answer
    if (answers[questionId]) {
      return;
    }

    // Fetch the answer
    const result = await askQuestion(questionId);
    if (result) {
      setAnswers(prev => ({
        ...prev,
        [questionId]: result,
      }));
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
              Select a question to see insights
            </div>
          ) : isCurrentlyLoading ? (
            <div className="chat-response-empty">
              Loading response...
            </div>
          ) : error ? (
            <div className="chat-response-error">
              <p>Error: {error}</p>
            </div>
          ) : currentAnswer ? (
            <div className="chat-response-content">
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '10px' }}>{currentAnswer.answer}</h4>
              </div>

              {currentAnswer.risks && currentAnswer.risks.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h5>Risks:</h5>
                  <ul>
                    {currentAnswer.risks.map((risk: string, idx: number) => (
                      <li key={idx}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {currentAnswer.suggestedChanges && currentAnswer.suggestedChanges.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h5>Suggested Changes:</h5>
                  <ul>
                    {currentAnswer.suggestedChanges.map((change: any, idx: number) => (
                      <li key={idx}>
                        <strong>{change.target}</strong> ({change.operation}): {change.value}
                        <p style={{ fontSize: '0.9em', marginTop: '5px' }}>
                          {change.reasoning}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {currentAnswer.followUpQuestions && currentAnswer.followUpQuestions.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h5>Follow-up Questions:</h5>
                  <ul>
                    {currentAnswer.followUpQuestions.map((q: string, idx: number) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                <p style={{ fontSize: '0.9em', color: '#666' }}>
                  Confidence: {(currentAnswer.confidence * 100).toFixed(0)}%
                </p>
              </div>
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
