// mobile/src/lib/agent.ts

import { apiJson } from "./api";
import type { AgentResponse, Suggestion } from "../types/agent";

/**
 * Fetch suggestion chips for quick conversation starters
 */
export async function fetchSuggestions(): Promise<Suggestion[]> {
  return apiJson<Suggestion[]>("/agent/suggestions");
}

/**
 * Send a message to the AI agent and get recommendations/response
 */
export async function sendAgentMessage(
  query: string,
  conversationId: string,
  history: Array<{ role: "user" | "assistant"; content: string }>
): Promise<AgentResponse> {
  return apiJson<AgentResponse>("/agent/recommendations", {
    method: "POST",
    body: JSON.stringify({
      query,
      limit: 6,
      preferFeed: true,
      conversationId,
      history,
    }),
  });
}
