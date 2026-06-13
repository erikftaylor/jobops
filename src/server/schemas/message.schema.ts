import { z } from "zod";

export const MessageType = z.enum(["chat", "system", "estimate_confirmation"]);

export type MessageType = z.infer<typeof MessageType>;

export const CreateMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(10000),
  messageType: MessageType.default("chat"),
});

export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;
