// mobile/app/(app)/(drawer)/agent.tsx

import React, { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform } from "react-native";
import { AppBar } from "../../../src/components/feed/AppBar";
import { SuggestionChips } from "../../../src/components/agent/SuggestionChips";
import { MessagesList } from "../../../src/components/agent/MessagesList";
import { ChatInput } from "../../../src/components/agent/ChatInput";
import { agentStyles } from "../../../src/styles/agentStyles";
import { sendAgentMessage } from "../../../src/lib/agent";
import { formatRecommendationsAsText } from "../../../src/lib/formatAgentResponse";
import type { ChatMessage } from "../../../src/types/agent";

export default function AgentScreen() {
  const [conversationId] = useState(() => `mobile-${Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hey there! 👋 I'm your BFFlix assistant. I can help you discover movies and shows, get personalized recommendations, and chat about anything entertainment-related. What are you in the mood for?",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setError(null);

    // Create user message
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
      // Build history payload (last 10 messages)
      const historyPayload = [...messages, userMessage]
        .slice(-10)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // Call API
      const data = await sendAgentMessage(
        trimmed,
        conversationId,
        historyPayload
      );

      const now = new Date().toISOString();

      // Check if response has a conversation message
      const convoResult = data.results?.find((r) => r.type === "conversation");

      if (convoResult && "message" in convoResult) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${now}`,
          role: "assistant",
          createdAt: now,
          content: convoResult.message,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        return;
      }

      // Otherwise, format recommendations as text
      const recs = data.results?.filter(
        (r) => r.type === "movie" || r.type === "tv"
      );

      if (recs && recs.length > 0) {
        const formattedText = formatRecommendationsAsText(data.results);
        const assistantMessage: ChatMessage = {
          id: `assistant-${now}`,
          role: "assistant",
          createdAt: now,
          content: formattedText,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        return;
      }

      // Fallback if no useful response
      const assistantMessage: ChatMessage = {
        id: `assistant-${now}`,
        role: "assistant",
        createdAt: now,
        content:
          "I had trouble finding good suggestions for that. Try asking in a different way or mention a few shows or movies you like.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("AI Assistant error:", err);
      setError("Something went wrong. Please try again.");

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

  const handleSelectSuggestion = (text: string) => {
    setInput(text);
  };

  return (
    <KeyboardAvoidingView
      style={agentStyles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <AppBar />

      {/* Header */}
      <View style={agentStyles.header}>
        <View style={agentStyles.headerRow}>
          <View style={agentStyles.iconContainer}>
            <Text style={agentStyles.iconText}>✨</Text>
          </View>
          <View style={agentStyles.headerTextContainer}>
            <Text style={agentStyles.headerTitle}>AI Assistant</Text>
            <Text style={agentStyles.headerSubtitle}>
              Your entertainment guide
            </Text>
          </View>
        </View>
      </View>

      {/* Suggestion Chips */}
      <SuggestionChips
        onSelectSuggestion={handleSelectSuggestion}
        disabled={isSending}
      />

      {/* Error Message */}
      {error && (
        <View style={agentStyles.errorContainer}>
          <Text style={agentStyles.errorText}>{error}</Text>
        </View>
      )}

      {/* Messages */}
      <MessagesList messages={messages} isSending={isSending} />

      {/* Input */}
      <ChatInput
        value={input}
        onChangeText={setInput}
        onSend={handleSend}
        isSending={isSending}
      />
    </KeyboardAvoidingView>
  );
}
