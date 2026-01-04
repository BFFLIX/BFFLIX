// mobile/src/components/agent/MessagesList.tsx

import React, { useRef, useEffect } from "react";
import { ScrollView } from "react-native";
import { agentStyles } from "../../styles/agentStyles";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import type { ChatMessage } from "../../types/agent";

type MessagesListProps = {
  messages: ChatMessage[];
  isSending: boolean;
};

export function MessagesList({ messages, isSending }: MessagesListProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isSending]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={agentStyles.messagesContainer}
      contentContainerStyle={agentStyles.messagesContent}
      showsVerticalScrollIndicator={false}
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isSending && <TypingIndicator />}
    </ScrollView>
  );
}
