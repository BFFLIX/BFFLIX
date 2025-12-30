// mobile/app/(auth)/verify-email.tsx

import { useState, useEffect } from "react";
import { View, Text, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import type { Href } from "expo-router";
import { AuthButton } from "../../src/components/auth/AuthButton";
import { ErrorMessage } from "../../src/components/auth/ErrorMessage";
import { VerificationCodeInput } from "../../src/components/auth/VerificationCodeInput";
import { authStyles } from "../../src/styles/authStyles";
import { extractErrorMessage } from "../../src/lib/errorMessages";
import { apiJson } from "../../src/lib/api";

interface VerifyResponse {
  ok: boolean;
}

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email;

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  // Auto-submit when code is complete
  async function handleVerify() {
    if (code.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    if (!email) {
      setError("Email is missing");
      return;
    }

    setError("");

    try {
      setLoading(true);

      await apiJson<VerifyResponse>("/auth/verify-email", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({
          code,
          email,
        }),
      });

      // Success! Navigate to login with success message
      Alert.alert(
        "Email Verified!",
        "Your email has been verified successfully. You can now log in.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(auth)/login" as Href),
          },
        ]
      );
    } catch (e: any) {
      setError(extractErrorMessage(e));
      setCode(""); // Clear code on error
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (!email) {
      setError("Email is missing");
      return;
    }

    setError("");

    try {
      setResending(true);

      await apiJson("/auth/resend-verification", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ email }),
      });

      Alert.alert("Code Sent", "A new verification code has been sent to your email.");
    } catch (e: any) {
      setError(extractErrorMessage(e));
    } finally {
      setResending(false);
    }
  }

  function handleBackToLogin() {
    router.replace("/(auth)/login" as Href);
  }

  return (
    <View style={authStyles.container}>
      <Text style={authStyles.title}>Verify Your Email</Text>
      <Text style={authStyles.subtitle}>
        We sent a 6-digit code to{"\n"}
        <Text style={{ fontWeight: "600" }}>{email}</Text>
      </Text>

      <ErrorMessage message={error} onDismiss={() => setError("")} />

      <VerificationCodeInput
        value={code}
        onChange={setCode}
        length={6}
        autoSubmit
        onComplete={handleVerify}
      />

      <AuthButton
        title="Verify Email"
        onPress={handleVerify}
        loading={loading}
        disabled={code.length !== 6}
      />

      <AuthButton
        title="Resend Code"
        onPress={handleResendCode}
        variant="text"
        loading={resending}
      />

      <View style={authStyles.divider}>
        <View style={authStyles.dividerLine} />
        <Text style={authStyles.dividerText}>or</Text>
        <View style={authStyles.dividerLine} />
      </View>

      <AuthButton
        title="Back to Sign In"
        onPress={handleBackToLogin}
        variant="secondary"
      />
    </View>
  );
}
