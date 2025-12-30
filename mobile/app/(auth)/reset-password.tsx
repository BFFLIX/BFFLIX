// mobile/app/(auth)/reset-password.tsx

import { useState } from "react";
import {
  View,
  Text,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import type { Href } from "expo-router";
import { AuthInput } from "../../src/components/auth/AuthInput";
import { AuthButton } from "../../src/components/auth/AuthButton";
import { ErrorMessage } from "../../src/components/auth/ErrorMessage";
import { PasswordStrengthIndicator } from "../../src/components/auth/PasswordStrengthIndicator";
import { authStyles } from "../../src/styles/authStyles";
import {
  validatePassword,
  validatePasswordMatch,
} from "../../src/lib/validation";
import { extractErrorMessage } from "../../src/lib/errorMessages";
import { apiJson, ApiError } from "../../src/lib/api";

interface ResetResponse {
  ok: boolean;
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = params.token;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleResetPassword() {
    setError("");

    if (!token) {
      setError("Reset token is missing. Please request a new reset link.");
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.errors.join(", "));
      return;
    }

    // Validate passwords match
    const matchValidation = validatePasswordMatch(password, confirmPassword);
    if (!matchValidation.valid) {
      setError(matchValidation.error!);
      return;
    }

    try {
      setLoading(true);

      await apiJson<ResetResponse>("/auth/reset", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({
          token,
          password,
        }),
      });

      // Success! Navigate to login
      Alert.alert(
        "Password Reset Successful",
        "Your password has been reset successfully. You can now log in with your new password.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(auth)/login" as Href),
          },
        ]
      );
    } catch (e: any) {
      // Handle invalid/expired token specially
      if (
        e instanceof ApiError &&
        e.payload?.error === "invalid_or_expired_token"
      ) {
        Alert.alert(
          "Link Expired",
          "This reset link is invalid or has expired. Please request a new one.",
          [
            {
              text: "Request New Link",
              onPress: () => router.replace("/(auth)/request-reset" as Href),
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
        return;
      }

      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  function handleBackToLogin() {
    router.replace("/(auth)/login" as Href);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={authStyles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={authStyles.title}>Create New Password</Text>
          <Text style={authStyles.subtitle}>
            Enter a new password for your account.
          </Text>

          <ErrorMessage message={error} onDismiss={() => setError("")} />

          <AuthInput
            label="New Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter new password"
            secureTextEntry
            textContentType="newPassword"
            autoComplete="password-new"
          />

          <PasswordStrengthIndicator password={password} />

          <AuthInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            secureTextEntry
            textContentType="newPassword"
            autoComplete="password-new"
          />

          <AuthButton
            title="Reset Password"
            onPress={handleResetPassword}
            loading={loading}
            disabled={!password || !confirmPassword}
          />

          <AuthButton
            title="Back to Sign In"
            onPress={handleBackToLogin}
            variant="text"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
