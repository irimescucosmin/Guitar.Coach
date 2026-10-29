import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * The one place that talks to Claude. Haiku: fast and cheap, enough for short
 * answers about practice. Off entirely without a key, and the screens say so.
 */
export const COACH_MODEL = "claude-haiku-5-5";

export const coachEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

export interface Reply {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/** One answer, no history: each question stands on its own, with the facts in the system prompt. */
export async function ask(system: string, user: string, maxTokens = 400): Promise<Reply> {
  const message = await anthropic().messages.create({
    model: COACH_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
  return { text, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens };
}
