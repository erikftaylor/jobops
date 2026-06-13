import { useState, useCallback } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  messageType: string;
  created_at: string;
}

export function useMessages(jobId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    if (!jobId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/jobs/${jobId}/messages`);
      if (!response.ok) throw new Error("Failed to load messages");
      const data = await response.json();
      setMessages(data.messages);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!jobId) throw new Error("No job selected");
      setError(null);
      try {
        const response = await fetch(`/api/jobs/${jobId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, messageType: "chat" }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to send message");
        }
        // Reload messages after sending
        await loadMessages();
      } catch (err) {
        const message = (err as Error).message;
        setError(message);
        throw err;
      }
    },
    [jobId, loadMessages]
  );

  return {
    messages,
    isLoading,
    error,
    loadMessages,
    sendMessage,
  };
}
