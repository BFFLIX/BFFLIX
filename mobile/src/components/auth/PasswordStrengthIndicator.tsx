// mobile/src/components/auth/PasswordStrengthIndicator.tsx

import { View, Text, StyleSheet } from "react-native";
import {
  getPasswordStrength,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
  validatePassword,
} from "../../lib/validation";
import { colors } from "../../styles/authStyles";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const strength = getPasswordStrength(password);
  const label = getPasswordStrengthLabel(strength);
  const color = getPasswordStrengthColor(strength);

  // Get validation results to show requirements
  const validation = validatePassword(password);

  return (
    <View style={styles.container}>
      {/* Strength bars */}
      <View style={styles.barsContainer}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.bar,
              index <= strength && { backgroundColor: color },
            ]}
          />
        ))}
      </View>

      {/* Strength label */}
      <Text style={[styles.strengthLabel, { color }]}>{label}</Text>

      {/* Requirements checklist */}
      <View style={styles.requirementsContainer}>
        <Text style={styles.requirementsTitle}>Password must have:</Text>
        <RequirementItem
          text="At least 8 characters"
          met={password.length >= 8}
        />
        <RequirementItem
          text="At least one uppercase letter"
          met={/[A-Z]/.test(password)}
        />
        <RequirementItem text="At least one number" met={/[0-9]/.test(password)} />
      </View>
    </View>
  );
}

interface RequirementItemProps {
  text: string;
  met: boolean;
}

function RequirementItem({ text, met }: RequirementItemProps) {
  return (
    <View style={styles.requirementRow}>
      <Text style={[styles.checkmark, met && styles.checkmarkMet]}>
        {met ? "✓" : "○"}
      </Text>
      <Text style={[styles.requirementText, met && styles.requirementTextMet]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 12,
  },
  barsContainer: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 6,
  },
  bar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  requirementsContainer: {
    marginTop: 4,
  },
  requirementsTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  checkmark: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 6,
    width: 16,
  },
  checkmarkMet: {
    color: colors.success,
  },
  requirementText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  requirementTextMet: {
    color: colors.text,
  },
});
