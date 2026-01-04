// mobile/src/lib/formatAgentResponse.ts

import type { AgentRecommendationResult } from "../types/agent";

/**
 * Format movie/TV recommendations as readable text for display in chat
 */
export function formatRecommendationsAsText(
  results: AgentRecommendationResult[]
): string {
  // Filter to only movie/TV recommendations
  const recs = results.filter(
    (r): r is Extract<AgentRecommendationResult, { type: "movie" | "tv" }> =>
      r.type === "movie" || r.type === "tv"
  );

  if (recs.length === 0) return "";

  const lines = recs.map((r, idx) => {
    const header =
      idx === 0
        ? `First up: ${r.title}${r.year ? ` (${r.year})` : ""} ${
            r.type === "movie" ? "– Movie" : "– TV"
          }`
        : `${idx + 1}. ${r.title}${r.year ? ` (${r.year})` : ""} ${
            r.type === "movie" ? "– Movie" : "– TV"
          }`;

    const reason = r.reason?.trim() || "";
    const where =
      r.playableOn && r.playableOn.length
        ? `You can watch it on ${r.playableOn.join(", ")}.`
        : "";

    return [header, reason, where].filter(Boolean).join("\n\n");
  });

  return `Here are a few things I think you'd vibe with:\n\n${lines.join(
    "\n\n"
  )}`;
}
