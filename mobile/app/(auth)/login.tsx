
// mobile/app/(auth)/login.tsx
import { useState } from "react";
import { View, Text, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useAuth } from "../../src/auth/AuthContext";
import { AuthInput } from "../../src/components/auth/AuthInput";
import { AuthButton } from "../../src/components/auth/AuthButton";
import { ErrorMessage } from "../../src/components/auth/ErrorMessage";
import { authStyles } from "../../src/styles/authStyles";
import { validateEmail } from "../../src/lib/validation";
import { extractErrorMessage } from "../../src/lib/errorMessages";
import { ApiError } from "../../src/lib/api";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");

    // Client-side validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.error!);
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);

      // Navigate to home
      const homeHref = { pathname: "/(tabs)" } as unknown as Href;
      router.replace(homeHref);
    } catch (e: any) {
      // Handle email_not_verified error specially
      if (e instanceof ApiError && e.payload?.error === "email_not_verified") {
        Alert.alert(
          "Email Not Verified",
          "Please verify your email before logging in. Check your inbox for the verification code.",
          [
            {
              text: "Resend Code",
              onPress: () => {
                const verifyHref = {
                  pathname: "/(auth)/verify-email",
                  params: { email: email.trim() },
                } as unknown as Href;
                router.push(verifyHref);
              },
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
        return;
      }

      // Handle other errors
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  function handleForgotPassword() {
    router.push("/(auth)/request-reset" as Href);
  }

  function handleSignUp() {
    router.push("/(auth)/signup" as Href);
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
          <Text style={authStyles.title}>Welcome Back</Text>
          <Text style={authStyles.subtitle}>Sign in to continue to BFFlix</Text>

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

          <AuthInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            textContentType="password"
            autoComplete="password"
          />

          <AuthButton
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            disabled={!email || !password}
          />

          <AuthButton
            title="Forgot Password?"
            onPress={handleForgotPassword}
            variant="text"
          />

          <View style={authStyles.divider}>
            <View style={authStyles.dividerLine} />
            <Text style={authStyles.dividerText}>or</Text>
            <View style={authStyles.dividerLine} />
          </View>

          <AuthButton
            title="Create New Account"
            onPress={handleSignUp}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}