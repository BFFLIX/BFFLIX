// mobile/src/components/auth/VerificationCodeInput.tsx

import { useRef, useEffect } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { colors } from "../../styles/authStyles";

interface VerificationCodeInputProps {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  autoSubmit?: boolean;
  onComplete?: () => void;
}

export function VerificationCodeInput({
  value,
  onChange,
  length = 6,
  autoSubmit = false,
  onComplete,
}: VerificationCodeInputProps) {
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Auto-submit when all digits are entered
  useEffect(() => {
    if (autoSubmit && value.length === length && onComplete) {
      onComplete();
    }
  }, [value, length, autoSubmit, onComplete]);

  const handleChangeText = (text: string, index: number) => {
    // Only allow digits
    const digit = text.replace(/[^0-9]/g, "");

    if (digit.length === 0) {
      // Handle backspace
      const newValue = value.substring(0, index) + value.substring(index + 1);
      onChange(newValue);
      // Focus previous input
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    // Only take the last digit if user pastes multiple
    const newDigit = digit[digit.length - 1];

    // Update value at this index
    const newValue =
      value.substring(0, index) + newDigit + value.substring(index + 1);
    onChange(newValue);

    // Auto-focus next input
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace on empty field
    if (e.nativeEvent.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputRefs.current[index] = ref;
          }}
          value={value[index] || ""}
          onChangeText={(text) => handleChangeText(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
          style={[
            styles.input,
            value[index] && styles.inputFilled,
          ]}
          autoFocus={index === 0}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  input: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    color: colors.text,
    backgroundColor: colors.background,
  },
  inputFilled: {
    borderColor: colors.primary,
  },
});
