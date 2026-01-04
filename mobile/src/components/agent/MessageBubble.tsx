// mobile/src/components/agent/MessageBubble.tsx

import React from "react";
import { View, Text } from "react-native";
import { agentStyles } from "../../styles/agentStyles";
import type { ChatMessage } from "../../types/agent";

type MessageBubbleProps = {
  message: ChatMessage;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <View
      style={[
        agentStyles.messageRow,
        isUser
          ? agentStyles.messageRowUser
          : agentStyles.messageRowAssistant,
      ]}
    >
      <View
        style={[
          agentStyles.messageBubble,
          isUser
            ? agentStyles.messageBubbleUser
            : agentStyles.messageBubbleAssistant,
        ]}
      >
        <Text
          style={[
            agentStyles.messageText,
            isUser && agentStyles.messageTextUser,
          ]}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}
