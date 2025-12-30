// mobile/src/components/auth/ErrorMessage.tsx

import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { authStyles, colors } from "../../styles/authStyles";

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <View style={authStyles.errorContainer}>
      <Text style={authStyles.errorMessage}>{message}</Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.dismissButton}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dismissButton: {
    fontSize: 18,
    color: colors.error,
    marginLeft: 8,
    fontWeight: "600",
  },
});
