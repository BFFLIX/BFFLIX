// mobile/src/styles/authStyles.ts

import { StyleSheet } from "react-native";
import { feedColors } from "./feedStyles";

// Use feedColors as the source of truth for consistency
export const colors = {
  primary: feedColors.primary,
  error: feedColors.error,
  success: feedColors.success,
  warning: feedColors.warning,
  text: feedColors.text,
  textSecondary: feedColors.textSecondary,
  textTertiary: feedColors.textTertiary,
  border: feedColors.border,
  borderFocus: feedColors.primary,
  background: feedColors.background,
  backgroundSecondary: feedColors.backgroundSecondary,
  disabled: "rgba(255, 255, 255, 0.1)",
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
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 40,
    textAlign: "center",
    lineHeight: 22,
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
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.backgroundSecondary,
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
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  buttonDisabled: {
    backgroundColor: colors.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  buttonTextPrimary: {
    color: "#ffffff",
  },
  buttonTextSecondary: {
    color: colors.text,
  },
  buttonTextDisabled: {
    color: colors.textSecondary,
  },
  linkText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 16,
  },
  textButton: {
    padding: 12,
    alignItems: "center",
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
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
    backgroundColor: "rgba(52, 199, 89, 0.1)",
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
