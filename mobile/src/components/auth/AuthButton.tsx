// mobile/src/components/auth/AuthButton.tsx

import { TouchableOpacity, Text, ActivityIndicator, View } from "react-native";
import { authStyles, colors } from "../../styles/authStyles";

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary" | "text";
  disabled?: boolean;
}

export function AuthButton({
  title,
  onPress,
  loading = false,
  variant = "primary",
  disabled = false,
}: AuthButtonProps) {
  const isDisabled = disabled || loading;

  // Text button variant - minimal styling
  if (variant === "text") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        style={authStyles.textButton}
      >
        <Text style={authStyles.linkText}>{title}</Text>
      </TouchableOpacity>
    );
  }

  // Primary or secondary button variants
  return (
    <View style={authStyles.buttonContainer}>
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        style={[
          authStyles.button,
          variant === "primary" && authStyles.buttonPrimary,
          variant === "secondary" && authStyles.buttonSecondary,
          isDisabled && authStyles.buttonDisabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === "primary" ? colors.background : colors.primary}
          />
        ) : (
          <Text
            style={[
              authStyles.buttonText,
              variant === "primary" && authStyles.buttonTextPrimary,
              variant === "secondary" && authStyles.buttonTextSecondary,
              isDisabled && authStyles.buttonTextDisabled,
            ]}
          >
            {title}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
