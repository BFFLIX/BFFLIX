// mobile/app/(auth)/request-reset.tsx

import { useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { AuthInput } from "../../src/components/auth/AuthInput";
import { AuthButton } from "../../src/components/auth/AuthButton";
import { ErrorMessage } from "../../src/components/auth/ErrorMessage";
import { authStyles } from "../../src/styles/authStyles";
import { validateEmail } from "../../src/lib/validation";
import { extractErrorMessage } from "../../src/lib/errorMessages";
import { apiJson } from "../../src/lib/api";

interface RequestResetResponse {
  ok: boolean;
}

export default function RequestResetScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleRequestReset() {
    setError("");

    // Client-side validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.error!);
      return;
    }

    try {
      setLoading(true);

      await apiJson<RequestResetResponse>("/auth/request-reset", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ email: email.trim() }),
      });

      // Always show success (no user enumeration)
      setSubmitted(true);
    } catch (e: any) {
      // Even on error, show success to prevent enumeration
      // But if it's a network error, show that
      const errorMsg = extractErrorMessage(e);
      if (
        errorMsg.includes("network") ||
        errorMsg.includes("connection") ||
        errorMsg.includes("timeout")
      ) {
        setError(errorMsg);
      } else {
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleBackToLogin() {
    router.replace("/(auth)/login" as Href);
  }

  if (submitted) {
    return (
      <View style={authStyles.container}>
        <Text style={authStyles.title}>Check Your Email</Text>
        <Text style={authStyles.subtitle}>
          If an account exists with {email}, you will receive a password reset
          link shortly.
        </Text>

        <View style={authStyles.successContainer}>
          <Text style={authStyles.successMessage}>
            Check your inbox and spam folder for the reset link.
          </Text>
        </View>

        <AuthButton
          title="Back to Sign In"
          onPress={handleBackToLogin}
          variant="primary"
        />
      </View>
    );
  }

  return (
    <View style={authStyles.container}>
      <Text style={authStyles.title}>Reset Password</Text>
      <Text style={authStyles.subtitle}>
        Enter your email and we'll send you a link to reset your password.
      </Text>

      <ErrorMessage message={error} onDismiss={() => setError("")} />

      <AuthInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="your@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        textContentType="emailAddress"
        autoComplete="email"
      />

      <AuthButton
        title="Send Reset Link"
        onPress={handleRequestReset}
        loading={loading}
        disabled={!email}
      />

      <AuthButton
        title="Back to Sign In"
        onPress={handleBackToLogin}
        variant="text"
      />
    </View>
  );
}
