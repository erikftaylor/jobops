import { useState, useCallback, useEffect } from "react";
import { Conversation, ConversationMessage, ChangeSet } from "@shared/types";

interface UseConversationState {
  conversation: Conversation | null;
  messages: ConversationMessage[];
  pendingChanges: ChangeSet[];
  loading: boolean;
  error: string | null;
}

export function useConversation(conversationId: string | null) {
  const [state, setState] = useState<UseConversationState>({
    conversation: null,
    messages: [],
    pendingChanges: [],
    loading: false,
    error: null,
  });

  // Fetch conversation on mount or when ID changes
  useEffect(() => {
    if (!conversationId) {
      setState({
        conversation: null,
        messages: [],
        pendingChanges: [],
        loading: false,
        error: null,
      });
      return;
    }

    const fetchConversation = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await fetch(`/api/conversations/${conversationId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch conversation");
        }
        const data = await response.json();
        setState({
          conversation: {
            id: data.id,
            job_id: data.jobId,
            analysis_id: data.analysisId,
            created_at: data.createdAt,
            updated_at: data.updatedAt,
            status: data.status,
            memory: data.memory,
          },
          messages: data.messages || [],
          pendingChanges: data.pendingChanges || [],
          loading: false,
          error: null,
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: (err as Error).message,
          loading: false,
        }));
      }
    };

    fetchConversation();
  }, [conversationId]);

  // Add message to conversation
  const addMessage = useCallback(
    async (content: string) => {
      if (!conversationId) throw new Error("No conversation ID");

      // Optimistic update
      const tempMessageId = `temp-${Date.now()}`;
      const tempMessage: ConversationMessage = {
        id: tempMessageId,
        conversation_id: conversationId,
        role: "user",
        content,
        created_at: new Date().toISOString(),
        message_type: "chat",
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, tempMessage],
      }));

      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/message`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, messageType: "chat" }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to add message");
        }

        const newMessage = await response.json();

        // Update with actual message from server
        setState((prev) => ({
          ...prev,
          messages: prev.messages.map((msg) =>
            msg.id === tempMessageId
              ? {
                  id: newMessage.id,
                  conversation_id: conversationId,
                  role: newMessage.role,
                  content: newMessage.content,
                  created_at: newMessage.createdAt,
                  message_type: newMessage.messageType,
                }
              : msg
          ),
        }));
      } catch (err) {
        // Remove optimistic update on error
        setState((prev) => ({
          ...prev,
          messages: prev.messages.filter((msg) => msg.id !== tempMessageId),
          error: (err as Error).message,
        }));
        throw err;
      }
    },
    [conversationId]
  );

  // Accept a change
  const acceptChange = useCallback(
    async (changeSetId: string) => {
      if (!conversationId) throw new Error("No conversation ID");

      // Optimistic update
      setState((prev) => ({
        ...prev,
        pendingChanges: prev.pendingChanges.map((change) =>
          change.id === changeSetId
            ? { ...change, status: "accepted" }
            : change
        ),
      }));

      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/accept-change`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ changeSetId }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to accept change");
        }

        // Keep optimistic update
      } catch (err) {
        // Revert optimistic update on error
        setState((prev) => ({
          ...prev,
          pendingChanges: prev.pendingChanges.map((change) =>
            change.id === changeSetId
              ? { ...change, status: "pending" }
              : change
          ),
          error: (err as Error).message,
        }));
        throw err;
      }
    },
    [conversationId]
  );

  // Reject a change
  const rejectChange = useCallback(
    async (changeSetId: string, note?: string) => {
      if (!conversationId) throw new Error("No conversation ID");

      // Optimistic update
      setState((prev) => ({
        ...prev,
        pendingChanges: prev.pendingChanges.map((change) =>
          change.id === changeSetId
            ? { ...change, status: "rejected", decision_note: note }
            : change
        ),
      }));

      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/reject-change`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ changeSetId, note }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to reject change");
        }

        // Keep optimistic update
      } catch (err) {
        // Revert optimistic update on error
        setState((prev) => ({
          ...prev,
          pendingChanges: prev.pendingChanges.map((change) =>
            change.id === changeSetId
              ? { ...change, status: "pending", decision_note: undefined }
              : change
          ),
          error: (err as Error).message,
        }));
        throw err;
      }
    },
    [conversationId]
  );

  // Modify a change
  const modifyChange = useCallback(
    async (changeSetId: string, modifiedText: string) => {
      if (!conversationId) throw new Error("No conversation ID");

      // Optimistic update
      setState((prev) => ({
        ...prev,
        pendingChanges: prev.pendingChanges.map((change) =>
          change.id === changeSetId
            ? { ...change, proposed_text: modifiedText, status: "modified" }
            : change
        ),
      }));

      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/modify-change`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ changeSetId, modifiedText }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to modify change");
        }

        // Keep optimistic update
      } catch (err) {
        // Revert optimistic update on error
        setState((prev) => ({
          ...prev,
          pendingChanges: prev.pendingChanges.map((change) =>
            change.id === changeSetId
              ? { ...change, status: "pending" }
              : change
          ),
          error: (err as Error).message,
        }));
        throw err;
      }
    },
    [conversationId]
  );

  return {
    conversation: state.conversation,
    messages: state.messages,
    pendingChanges: state.pendingChanges,
    loading: state.loading,
    error: state.error,
    addMessage,
    acceptChange,
    rejectChange,
    modifyChange,
  };
}
