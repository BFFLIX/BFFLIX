
// src/pages/AiAssistantPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import bfflixLogo from "../assets/bfflix-logo.svg";
import { apiPost } from "../lib/api";

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
  const navigate = useNavigate();

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

  const [input, setInput] = useState("");
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

      // If backend gives us a pure conversation message, just show that
      const first = data.results?.[0] as AgentRecommendationResult | undefined;

      if (first && first.type === "conversation") {
        const assistantMessage: ChatMessage = {
          id: `assistant-${now}`,
          role: "assistant",
          createdAt: now,
          content: first.message,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else if (data.results && data.results.length > 0) {
        // ✅ More conversational formatter for recs
        const recs = data.results.filter(
          (r): r is Extract<AgentRecommendationResult, { type: "movie" | "tv" }> =>
            r.type === "movie" || r.type === "tv"
        );

        const recLines = recs.map((r, idx) => {
          const header =
            idx === 0
              ? `First up: ${r.title}${
                  r.year ? ` (${r.year})` : ""
                } ${r.type === "movie" ? "– Movie" : "– TV"}`
              : `${idx + 1}. ${r.title}${
                  r.year ? ` (${r.year})` : ""
                } ${r.type === "movie" ? "– Movie" : "– TV"}`;

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
            recLines.length > 0
              ? `Here are a few things I think you'd vibe with:\n\n${recLines.join(
                  "\n\n"
                )}`
              : "Here are some picks I found based on what you said.",
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const assistantMessage: ChatMessage = {
          id: `assistant-${now}`,
          role: "assistant",
          createdAt: now,
          content:
            "I had trouble finding good suggestions for that. Try asking in a different way or mention a few shows or movies you like.",
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
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
    <div className="app-shell">
      <div className="app-main-layout">
        {/* LEFT SIDEBAR (same structure as Home / Circles) */}
        <aside className="app-sidebar">
          <div className="app-sidebar-brand">
            <img
              src={bfflixLogo}
              alt="BFFLIX"
              className="app-sidebar-logo-img"
            />
          </div>

          <nav className="app-sidebar-nav">
            <button
              className="app-nav-item"
              type="button"
              onClick={() => navigate("/home")}
            >
              <span className="app-nav-icon">🏠</span>
              <span>Home</span>
            </button>
            <button
              className="app-nav-item"
              type="button"
              onClick={() => navigate("/circles")}
            >
              <span className="app-nav-icon">👥</span>
              <span>Circles</span>
            </button>
            <button
              className="app-nav-item"
              type="button"
              onClick={() => navigate("/viewings")}
            >
              <span className="app-nav-icon">🎬</span>
              <span>Viewings</span>
            </button>
            <button
              className="app-nav-item app-nav-item--active"
              type="button"
              onClick={() => navigate("/assistant")}
            >
              <span className="app-nav-icon">✨</span>
              <span>AI Assistant</span>
            </button>
            <button className="app-nav-item">
              <span className="app-nav-icon">👤</span>
              <span>Profile</span>
            </button>
          </nav>

          <button className="app-logout-button">Log out</button>
        </aside>

        {/* CENTER: AI CHAT */}
        <main className="assistant-main">
          <header className="assistant-header">
            <div className="assistant-title-row">
              <div className="assistant-avatar">
                <span>✨</span>
              </div>
              <div>
                <h1 className="assistant-title">AI Assistant</h1>
                <p className="assistant-subtitle">
                  Your personal entertainment companion
                </p>
              </div>
            </div>
          </header>

          <section className="assistant-chat">
            <div className="assistant-messages">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.role === "assistant"
                      ? "assistant-message assistant-message--assistant"
                      : "assistant-message assistant-message--user"
                  }
                >
                  <div className="assistant-message-bubble">
                    {m.content.split("\n").map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <footer className="assistant-input-bar">
              {error && <div className="assistant-error">{error}</div>}
              <div className="assistant-input-row">
                <textarea
                  className="assistant-input"
                  placeholder="Ask me anything about movies, shows, or recommendations..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                />
                <button
                  type="button"
                  className="assistant-send-button"
                  onClick={handleSend}
                  disabled={isSending || !input.trim()}
                >
                  {isSending ? "…" : "➤"}
                </button>
              </div>
              <div className="assistant-hint">
                Press Enter to send, Shift+Enter for a new line
              </div>
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AiAssistantPage;