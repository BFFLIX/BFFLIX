// mobile/src/components/agent/ChatInput.tsx

import React from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { agentStyles } from "../../styles/agentStyles";
import { feedColors } from "../../styles/feedStyles";

type ChatInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isSending: boolean;
};

export function ChatInput({
  value,
  onChangeText,
  onSend,
  isSending,
}: ChatInputProps) {
  const canSend = value.trim().length > 0 && !isSending;

  return (
    <View style={agentStyles.inputContainer}>
      <View style={agentStyles.inputRow}>
        <TextInput
          style={agentStyles.textInput}
          placeholder="Ask me anything about movies, shows, or recommendations..."
          placeholderTextColor={feedColors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          multiline
          editable={!isSending}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={() => {
            if (canSend) {
              onSend();
            }
          }}
        />
        <Pressable
          style={[
            agentStyles.sendButton,
            !canSend && agentStyles.sendButtonDisabled,
          ]}
          onPress={onSend}
          disabled={!canSend}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={agentStyles.sendButtonText}>➤</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
