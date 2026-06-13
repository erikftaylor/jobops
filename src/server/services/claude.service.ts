import Anthropic from "@anthropic-ai/sdk";

export class ClaudeService {
  private client: Anthropic | null = null;
  private model: string = "claude-sonnet-4-6";

  constructor(apiKey?: string, model?: string) {
    if (!apiKey) {
      console.warn(
        "⚠️  ANTHROPIC_API_KEY not provided. Analysis will not work."
      );
      return;
    }

    try {
      this.client = new Anthropic({ apiKey });
      if (model) {
        this.model = model;
      }
    } catch (err) {
      console.error("Failed to initialize Claude client:", err);
    }
  }

  setModel(model: string): void {
    this.model = model;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async analyzeJobWithJSON<T>(
    prompt: string
  ): Promise<T> {
    if (!this.client) {
      throw new Error(
        "Claude API key not configured. Set ANTHROPIC_API_KEY in .env"
      );
    }

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      // Extract text from response
      const textContent = message.content.find((block: any) => block.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text response from Claude");
      }

      // Parse JSON from response
      let parsed: T;
      try {
        // Try to extract JSON from markdown code blocks first
        const jsonMatch = textContent.text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : textContent.text;
        parsed = JSON.parse(jsonString);
      } catch (parseErr: unknown) {
        // If parsing fails, try again with a hint
        console.warn("First JSON parse attempt failed, retrying...");

        const retryMessage = await this.client.messages.create({
          model: this.model,
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: prompt,
            },
            {
              role: "assistant",
              content: textContent.text,
            },
            {
              role: "user",
              content:
                'Please return the analysis as a single valid JSON object, without markdown formatting.',
            },
          ],
        });

        const retryTextContent = retryMessage.content.find(
          (block: any) => block.type === "text"
        );
        if (!retryTextContent || retryTextContent.type !== "text") {
          throw new Error("No text response from retry");
        }

        try {
          const jsonMatch = retryTextContent.text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          const jsonString = jsonMatch ? jsonMatch[1] : retryTextContent.text;
          parsed = JSON.parse(jsonString);
        } catch (retryErr: unknown) {
          throw new Error(
            `Failed to parse Claude response as JSON: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`
          );
        }
      }

      return parsed;
    } catch (err: unknown) {
      if (err instanceof Anthropic.APIError) {
        if (err.status === 401) {
          throw new Error(
            "Invalid Claude API key. Check ANTHROPIC_API_KEY in .env"
          );
        }
        if (err.status === 429) {
          throw new Error(
            "Claude API rate limited. Please try again in a moment."
          );
        }
        throw new Error(`Claude API error: ${err.message}`);
      }
      throw err;
    }
  }
}

let claudeInstance: ClaudeService | null = null;

export function initializeClaudeService(
  apiKey?: string,
  model?: string
): ClaudeService {
  claudeInstance = new ClaudeService(apiKey, model);
  return claudeInstance;
}

export function getClaudeService(): ClaudeService {
  if (!claudeInstance) {
    claudeInstance = new ClaudeService();
  }
  return claudeInstance;
}
