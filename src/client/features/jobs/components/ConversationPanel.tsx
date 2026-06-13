import { useEffect, useRef, useState } from "react";
import { useConversation } from "../hooks/useConversation";
import ConfirmationCard from "./ConfirmationCard";
import "../styles/conversation-panel.css";

interface ConversationPanelProps {
  jobId?: string;
  conversationId: string | null;
  onStartConversation?: (conversationId: string) => void;
}

export default function ConversationPanel({
  conversationId,
}: ConversationPanelProps) {
  const {
    conversation,
    messages,
    pendingChanges,
    loading,
    error,
    addMessage,
    acceptChange,
    rejectChange,
    modifyChange,
  } = useConversation(conversationId);

  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
      }
    };

    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending || !conversationId) return;

    setIsSending(true);
    try {
      await addMessage(inputValue);
      setInputValue("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isSending && conversationId) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleAcceptChange = async (changeSetId: string) => {
    try {
      await acceptChange(changeSetId);
    } catch (err) {
      console.error("Failed to accept change:", err);
    }
  };

  const handleRejectChange = async (changeSetId: string) => {
    try {
      await rejectChange(changeSetId);
    } catch (err) {
      console.error("Failed to reject change:", err);
    }
  };

  const handleModifyChange = async (changeSetId: string, modifiedText: string) => {
    try {
      await modifyChange(changeSetId, modifiedText);
    } catch (err) {
      console.error("Failed to modify change:", err);
    }
  };

  // Show loading state
  if (loading && !conversation) {
    return (
      <div className="conversation-panel">
        <div className="conversation-loading">
          <div className="conversation-loading-spinner" />
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !conversation) {
    return (
      <div className="conversation-panel">
        <div className="conversation-input-section">
          <div className="conversation-error">{error}</div>
        </div>
      </div>
    );
  }

  // Show empty state if no conversation
  if (!conversationId || !conversation) {
    return (
      <div className="conversation-panel">
        <div className="conversation-panel-header">
          <h3>Conversation</h3>
        </div>
        <div className="conversation-panel-content">
          <div className="conversation-panel-empty">
            <div className="conversation-panel-empty-content">
              <div className="conversation-panel-empty-icon">💬</div>
              <p className="conversation-panel-empty-title">No conversation yet</p>
              <p className="conversation-panel-empty-text">
                Start analyzing a job to begin a conversation
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pendingCount = pendingChanges.filter((c) => c.status === "pending").length;

  return (
    <div className="conversation-panel">
      {/* Header */}
      <div className="conversation-panel-header">
        <h3>Conversation</h3>
        <div className={`pending-badge ${pendingCount === 0 ? "zero" : ""}`}>
          {pendingCount} pending
        </div>
      </div>

      {/* Main Content */}
      <div className="conversation-panel-content">
        {/* Messages */}
        <div className="conversation-messages" ref={messagesContainerRef} role="region" aria-label="Chat messages">
          {messages.length === 0 ? (
            <div className="conversation-panel-empty">
              <div className="conversation-panel-empty-content">
                <div className="conversation-panel-empty-icon">💭</div>
                <p className="conversation-panel-empty-title">Start the conversation</p>
                <p className="conversation-panel-empty-text">
                  Ask questions about this job opportunity
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`conversation-message ${msg.role}`}>
                <div className="message-bubble">{msg.content}</div>
                <div className="message-time">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Pending Changes */}
        {pendingChanges.length > 0 && (
          <div className="conversation-pending-changes">
            <h4 className="pending-changes-title">Suggested Changes ({pendingCount} pending)</h4>
            {pendingCount === 0 ? (
              <div className="pending-changes-empty">No pending changes</div>
            ) : (
              pendingChanges
                .filter((change) => change.status === "pending")
                .map((change) => (
                  <ConfirmationCard
                    key={change.id}
                    changeset={change}
                    onAccept={handleAcceptChange}
                    onReject={handleRejectChange}
                    onModify={handleModifyChange}
                    isLoading={isSending}
                  />
                ))
            )}
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className="conversation-input-section">
        {error && <div className="conversation-error">{error}</div>}
        <form className="conversation-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about this job..."
            disabled={isSending || loading || !conversationId}
            aria-label="Message input"
          />
          <button
            type="submit"
            className="conversation-send-btn"
            disabled={
              isSending || loading || !inputValue.trim() || !conversationId
            }
            aria-label="Send message"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
