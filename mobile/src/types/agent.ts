// mobile/src/types/agent.ts

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type AgentRecommendationResult =
  | {
      type: "conversation";
      message: string;
    }
  | {
      tmdbId: string;
      type: "movie" | "tv";
      title: string;
      year: string | null;
      overview: string | null;
      poster?: string | null;
      providers?: string[];
      playableOnMyServices?: boolean;
      playableOn?: string[];
      reason?: string | null;
      matchScore?: number | null;
    };

export type AgentResponse = {
  query: string;
  cached?: boolean;
  basedOn?: number;
  platforms?: string[];
  results: AgentRecommendationResult[];
};

export type Suggestion = {
  id: string;
  text: string;
};
