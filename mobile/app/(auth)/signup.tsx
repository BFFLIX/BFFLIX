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
import { BrandLogo } from "../../src/components/common/BrandLogo";
import { authStyles } from "../../src/styles/authStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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

    // Validate first name
    const firstNameValidation = validateName(firstName);
    if (!firstNameValidation.valid) {
      setFieldErrors({ firstName: firstNameValidation.error! });
      return;
    }

    // Validate last name
    const lastNameValidation = validateName(lastName);
    if (!lastNameValidation.valid) {
      setFieldErrors({ lastName: lastNameValidation.error! });
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setFieldErrors({ password: passwordValidation.errors.join(", ") });
      return;
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      setFieldErrors({ username: usernameValidation.error! });
      return;
    }

    try {
      setLoading(true);

      // Call signup API (combine first + last name for backend)
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      await apiJson<SignupResponse>("/auth/signup", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: fullName,
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
      style={{ flex: 1, backgroundColor: "#05010f" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          authStyles.scrollContainer,
          { paddingTop: insets.top + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: "#05010f" }}
      >
        <View>
          <View style={authStyles.logoContainer}>
            <BrandLogo height={72} />
          </View>
          <Text style={authStyles.title}>Create Account</Text>
          <Text style={authStyles.subtitle}>
            Sign up to start sharing with friends
          </Text>

          <ErrorMessage message={error} onDismiss={() => setError("")} />

          <AuthInput
            label="First Name"
            value={firstName}
            onChangeText={(text) => {
              setFirstName(text);
              setFieldErrors({ ...fieldErrors, firstName: "" });
            }}
            placeholder="John"
            autoCapitalize="words"
            textContentType="givenName"
            autoComplete="name-given"
            error={fieldErrors.firstName}
          />

          <AuthInput
            label="Last Name"
            value={lastName}
            onChangeText={(text) => {
              setLastName(text);
              setFieldErrors({ ...fieldErrors, lastName: "" });
            }}
            placeholder="Doe"
            autoCapitalize="words"
            textContentType="familyName"
            autoComplete="name-family"
            error={fieldErrors.lastName}
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
              setFieldErrors({ ...fieldErrors, password: "", confirmPassword: "" });
            }}
            placeholder="Create a strong password"
            secureTextEntry
            textContentType="newPassword"
            autoComplete="password-new"
            error={fieldErrors.password}
          />

          <PasswordStrengthIndicator password={password} />

          <AuthInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setFieldErrors({ ...fieldErrors, confirmPassword: "" });
            }}
            placeholder="Re-enter your password"
            secureTextEntry
            textContentType="newPassword"
            autoComplete="password-new"
            error={fieldErrors.confirmPassword}
          />

          <AuthButton
            title="Create Account"
            onPress={handleSignup}
            loading={loading}
            disabled={!email || !password || !confirmPassword || !firstName || !lastName || password !== confirmPassword}
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
