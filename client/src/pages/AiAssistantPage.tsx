// src/pages/AiAssistantPage.tsx
import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { apiPost } from "../lib/api";
import LeftSidebar from "../components/LeftSidebar";
import TopBar from "../components/TopBar";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

// Shape of what /agent/recommendations returns (simplified)
type AgentRecommendationResult =
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

type AgentResponse = {
  query: string;
  results: AgentRecommendationResult[];
};

const AiAssistantPage: React.FC = () => {
  const location = useLocation();
  const locationState = location.state as { initialPrompt?: string } | null;
  const initialPrompt = locationState?.initialPrompt ?? "";

  // Simple conversation id so backend can thread follow-ups
  const [conversationId] = useState(() => `web-${Date.now()}`);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      createdAt: new Date().toISOString(),
      content:
        "Hey there! 👋 I'm your BFFlix AI assistant. I can help you discover movies and shows, get recommendations, look at your past viewings, and chat about anything entertainment-related. What are you in the mood for?",
    },
  ]);

  const [input, setInput] = useState(initialPrompt);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setError(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    // Optimistically add user message
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      // Build short history for backend (last ~10 turns)
      const historyPayload = [...messages, userMessage]
        .slice(-10)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const data = await apiPost<AgentResponse>("/agent/recommendations", {
        query: trimmed,
        limit: 6,
        preferFeed: true,
        conversationId,
        history: historyPayload,
      });

      const now = new Date().toISOString();

      // NEW: Always prioritize ANY conversation-style message from backend
      const convoResult = data.results?.find(
        (r: any) => r.type === "conversation"
      ) as { type: "conversation"; message: string } | undefined;

      if (convoResult) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${now}`,
          role: "assistant",
          createdAt: now,
          content: convoResult.message,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        return;
      }

      // If no conversation message, fallback to recommendation handling
      const recs = data.results?.filter(
        (r: any) => r.type === "movie" || r.type === "tv"
      ) || [];

      if (recs.length > 0) {
        const recLines = recs.map((r: any, idx: number) => {
          const header =
            idx === 0
              ? `First up: ${r.title}${r.year ? ` (${r.year})` : ""} ${r.type === "movie" ? "– Movie" : "– TV"}`
              : `${idx + 1}. ${r.title}${r.year ? ` (${r.year})` : ""} ${r.type === "movie" ? "– Movie" : "– TV"}`;

          const reason = r.reason ? r.reason.trim() : "";
          const where =
            r.playableOn && r.playableOn.length
              ? `You can watch it on ${r.playableOn.join(", ")}.`
              : "";

          return [header, reason, where].filter(Boolean).join("\n\n");
        });

        const assistantMessage: ChatMessage = {
          id: `assistant-${now}`,
          role: "assistant",
          createdAt: now,
          content:
            `Here are a few things I think you'd vibe with:\n\n${recLines.join("\n\n")}`,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        return;
      }

      // Final fallback if nothing useful returned
      const assistantMessage: ChatMessage = {
        id: `assistant-${now}`,
        role: "assistant",
        createdAt: now,
        content:
          "I had trouble finding good suggestions for that. Try asking in a different way or mention a few shows or movies you like.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("AI Assistant error", err);
      setError("Something went wrong talking to the AI. Please try again.");
      const assistantMessage: ChatMessage = {
        id: `assistant-error-${Date.now()}`,
        role: "assistant",
        createdAt: new Date().toISOString(),
        content:
          "Sorry, I ran into an error processing that request. Can you try again in a moment?",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (
    e
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-app-gradient text-slate-50">
      {/* Global top bar across the entire app */}
      <TopBar />

      <div className="flex">
        {/* Global left sidebar */}
        <LeftSidebar />

        {/* Main AI assistant content */}
        <main className="flex-1 pt-12 pb-10 px-4 lg:px-10 flex">
          <section className="w-full flex flex-col gap-4">
            {/* Header row */}
            <header className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-500 flex items-center justify-center text-2xl shadow-lg">
                <span>✨</span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">AI Assistant</h1>
                <p className="text-sm text-slate-300">
                  Your personal entertainment companion
                </p>
              </div>
            </header>

            {/* Chat surface */}
            <div className="flex-1 min-h-[420px] rounded-3xl bg-black/40 border border-white/5 shadow-[0_24px_60px_rgba(0,0,0,0.8)] backdrop-blur-md flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.role === "assistant"
                        ? "flex justify-start"
                        : "flex justify-end"
                    }
                  >
                    <div
                      className={
                        m.role === "assistant"
                          ? "max-w-[80%] rounded-2xl bg-slate-900/80 border border-fuchsia-500/30 px-4 py-3 text-sm leading-relaxed shadow-lg"
                          : "max-w-[80%] rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-4 py-3 text-sm leading-relaxed shadow-lg"
                      }
                    >
                      {m.content.split("\n").map((line, idx) => (
                        <p key={idx} className="whitespace-pre-wrap">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input bar */}
              <div className="border-t border-white/5 px-4 py-3 sm:px-5 sm:py-4 bg-black/40 rounded-b-3xl">
                {error && (
                  <div className="mb-2 rounded-xl bg-red-500/10 border border-red-500/40 px-3 py-2 text-xs text-red-200">
                    {error}
                  </div>
                )}
                <div className="flex items-end gap-3">
                  <textarea
                    className="flex-1 resize-none rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-500/70 shadow-inner"
                    placeholder="Ask me anything about movies, shows, or recommendations..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={3}
                  />
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-500 text-lg shadow-[0_10px_30px_rgba(236,72,153,0.6)] disabled:opacity-60 disabled:shadow-none"
                    onClick={handleSend}
                    disabled={isSending || !input.trim()}
                    aria-label="Send message"
                  >
                    {isSending ? "…" : "➤"}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-slate-400 text-right">
                  Press Enter to send, Shift+Enter for a new line
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AiAssistantPage;