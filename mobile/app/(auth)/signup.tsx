// mobile/app/(auth)/signup.tsx

import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { AuthInput } from "../../src/components/auth/AuthInput";
import { AuthButton } from "../../src/components/auth/AuthButton";
import { ErrorMessage } from "../../src/components/auth/ErrorMessage";
import { PasswordStrengthIndicator } from "../../src/components/auth/PasswordStrengthIndicator";
import { authStyles } from "../../src/styles/authStyles";
import {
  validateEmail,
  validatePassword,
  validateName,
  validateUsername,
} from "../../src/lib/validation";
import { extractErrorMessage, extractFieldErrors } from "../../src/lib/errorMessages";
import { apiJson } from "../../src/lib/api";

interface SignupResponse {
  ok: boolean;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export default function SignupScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSignup() {
    setError("");
    setFieldErrors({});

    // Client-side validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setFieldErrors({ email: emailValidation.error! });
      return;
    }

    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      setFieldErrors({ name: nameValidation.error! });
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setFieldErrors({ password: passwordValidation.errors.join(", ") });
      return;
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      setFieldErrors({ username: usernameValidation.error! });
      return;
    }

    try {
      setLoading(true);

      // Call signup API
      await apiJson<SignupResponse>("/auth/signup", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
          username: username.trim() || undefined,
        }),
      });

      // On success, navigate to email verification
      const verifyHref = {
        pathname: "/(auth)/verify-email",
        params: { email: email.trim() },
      } as unknown as Href;
      router.replace(verifyHref);
    } catch (e: any) {
      // Check for field-specific errors
      const errors = extractFieldErrors(e);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
      } else {
        setError(extractErrorMessage(e));
      }
    } finally {
      setLoading(false);
    }
  }

  function handleBackToLogin() {
    router.back();
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
          <Text style={authStyles.title}>Create Account</Text>
          <Text style={authStyles.subtitle}>
            Sign up to start sharing with friends
          </Text>

          <ErrorMessage message={error} onDismiss={() => setError("")} />

          <AuthInput
            label="Name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setFieldErrors({ ...fieldErrors, name: "" });
            }}
            placeholder="Your name"
            autoCapitalize="words"
            textContentType="name"
            autoComplete="name"
            error={fieldErrors.name}
          />

          <AuthInput
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setFieldErrors({ ...fieldErrors, email: "" });
            }}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            autoComplete="email"
            error={fieldErrors.email}
          />

          <AuthInput
            label="Username (optional)"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setFieldErrors({ ...fieldErrors, username: "" });
            }}
            placeholder="username"
            autoCapitalize="none"
            textContentType="username"
            autoComplete="username"
            error={fieldErrors.username}
          />

          <AuthInput
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setFieldErrors({ ...fieldErrors, password: "" });
            }}
            placeholder="Create a strong password"
            secureTextEntry
            textContentType="newPassword"
            autoComplete="password-new"
            error={fieldErrors.password}
          />

          <PasswordStrengthIndicator password={password} />

          <AuthButton
            title="Create Account"
            onPress={handleSignup}
            loading={loading}
            disabled={!email || !password || !name}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
