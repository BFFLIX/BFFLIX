// mobile/src/components/auth/AgreementCheckbox.tsx

import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../styles/authStyles";

interface AgreementCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function AgreementCheckbox({ checked, onToggle, children }: AgreementCheckboxProps) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={styles.container}
      activeOpacity={0.7}
    >
      <View style={styles.checkboxWrapper}>
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && (
            <Ionicons name="checkmark" size={16} color="#ffffff" />
          )}
        </View>
      </View>
      <View style={styles.textContainer}>
        {children}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkboxWrapper: {
    // No padding - let alignItems: "center" handle vertical alignment
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: colors.backgroundSecondary,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  textContainer: {
    flex: 1,
    // No padding - let alignItems: "center" handle vertical alignment
  },
});
