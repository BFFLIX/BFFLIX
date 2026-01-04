// mobile/src/styles/agentStyles.ts

import { StyleSheet } from "react-native";
import { feedColors } from "./feedStyles";

export const agentStyles = StyleSheet.create({
  // ============================================================
  // CONTAINER STYLES
  // ============================================================

  container: {
    flex: 1,
    backgroundColor: feedColors.background,
  },

  contentContainer: {
    paddingBottom: 20,
  },

  // ============================================================
  // HEADER STYLES
  // ============================================================

  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: feedColors.border,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(236, 72, 153, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  iconText: {
    fontSize: 24,
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: feedColors.text,
  },

  headerSubtitle: {
    fontSize: 14,
    color: feedColors.textSecondary,
    marginTop: 2,
  },

  // ============================================================
  // SUGGESTION CHIPS
  // ============================================================

  suggestionsContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: feedColors.border,
  },

  suggestionsScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },

  suggestionChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: feedColors.primary,
    backgroundColor: "transparent",
  },

  suggestionChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: feedColors.primary,
  },

  // ============================================================
  // MESSAGES CONTAINER
  // ============================================================

  messagesContainer: {
    flex: 1,
  },

  messagesContent: {
    padding: 16,
    gap: 12,
  },

  // ============================================================
  // MESSAGE BUBBLES
  // ============================================================

  messageRow: {
    flexDirection: "row",
    marginBottom: 8,
  },

  messageRowUser: {
    justifyContent: "flex-end",
  },

  messageRowAssistant: {
    justifyContent: "flex-start",
  },

  messageBubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  messageBubbleUser: {
    backgroundColor: feedColors.primary,
    borderBottomRightRadius: 4,
  },

  messageBubbleAssistant: {
    backgroundColor: "rgba(236, 72, 153, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(236, 72, 153, 0.3)",
    borderBottomLeftRadius: 4,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 21,
    color: feedColors.text,
  },

  messageTextUser: {
    color: "#fff",
  },

  // ============================================================
  // TYPING INDICATOR
  // ============================================================

  typingIndicatorContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 8,
  },

  typingIndicatorBubble: {
    backgroundColor: "rgba(236, 72, 153, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(236, 72, 153, 0.3)",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },

  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: feedColors.primary,
  },

  // ============================================================
  // CHAT INPUT
  // ============================================================

  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: feedColors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: feedColors.cardBackground,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },

  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: feedColors.border,
    backgroundColor: feedColors.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: feedColors.text,
    textAlignVertical: "center",
  },

  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: feedColors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: feedColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  sendButtonDisabled: {
    backgroundColor: feedColors.borderLight,
    shadowOpacity: 0,
    elevation: 0,
  },

  sendButtonText: {
    fontSize: 20,
    color: "#fff",
  },

  inputHint: {
    fontSize: 11,
    color: feedColors.textTertiary,
    marginTop: 6,
    textAlign: "right",
  },

  // ============================================================
  // LOADING & ERROR STATES
  // ============================================================

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },

  errorContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
  },

  errorText: {
    fontSize: 13,
    color: "#ef4444",
    lineHeight: 18,
  },
});
