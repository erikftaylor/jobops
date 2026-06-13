import { useEffect, useRef, useState } from "react";
import { Job } from "@shared/types";
import "../styles/chat-panel.css";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  messageType: string;
  created_at: string;
}

interface ChatPanelProps {
  selectedJob?: Job;
  messages: Message[];
  isLoading?: boolean;
  onSendMessage: (content: string) => Promise<void>;
  onLoadMessages?: () => Promise<void>;
}

export default function ChatPanel({
  selectedJob,
  messages,
  isLoading,
  onSendMessage,
  onLoadMessages,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages when job is selected
  useEffect(() => {
    if (selectedJob) {
      onLoadMessages?.();
    }
  }, [selectedJob?.id, onLoadMessages]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(inputValue);
      setInputValue("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  if (!selectedJob) {
    return (
      <div className="chat-panel-empty">
        <p>Select a job from the Sources panel to start analyzing.</p>
      </div>
    );
  }

  return (
    <div className="chat-panel-container">
      <div className="chat-header">
        <h3>{selectedJob.title}</h3>
        <p className="chat-subtitle">{selectedJob.company}</p>
      </div>

      <div className="messages-container" role="region" aria-label="Chat messages" aria-live="polite">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>No messages yet. Start by asking about this opportunity.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`message message-${msg.role}`}
              role={msg.role === "assistant" ? "status" : "article"}
            >
              <div className="message-author">{msg.role === "user" ? "You" : "Assistant"}</div>
              <div className="message-content">{msg.content}</div>
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

      <form className="message-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask about this job..."
          disabled={isSending || isLoading}
          aria-label="Message input"
        />
        <button type="submit" disabled={isSending || isLoading || !inputValue.trim()}>
          {isSending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
