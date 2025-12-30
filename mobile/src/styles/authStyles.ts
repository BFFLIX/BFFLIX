// mobile/src/styles/authStyles.ts

import { StyleSheet } from "react-native";

export const colors = {
  primary: "#007AFF",
  error: "#FF3B30",
  success: "#34C759",
  warning: "#FF9500",
  text: "#000000",
  textSecondary: "#8E8E93",
  border: "#C6C6C8",
  borderFocus: "#007AFF",
  background: "#FFFFFF",
  backgroundSecondary: "#F2F2F7",
  disabled: "#E5E5EA",
};

export const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.background,
    justifyContent: "center",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  inputFocused: {
    borderColor: colors.borderFocus,
    borderWidth: 2,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputDisabled: {
    backgroundColor: colors.backgroundSecondary,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    marginTop: 4,
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonDisabled: {
    backgroundColor: colors.disabled,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextPrimary: {
    color: colors.background,
  },
  buttonTextSecondary: {
    color: colors.primary,
  },
  buttonTextDisabled: {
    color: colors.textSecondary,
  },
  linkText: {
    color: colors.primary,
    fontSize: 15,
    textAlign: "center",
    marginTop: 16,
  },
  textButton: {
    padding: 8,
    alignItems: "center",
  },
  errorContainer: {
    backgroundColor: "#FFEBEE",
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  errorMessage: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
  },
  successContainer: {
    backgroundColor: "#E8F5E9",
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 14,
    color: colors.success,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: colors.textSecondary,
    fontSize: 14,
  },
});
