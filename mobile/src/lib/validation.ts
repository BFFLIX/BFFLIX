// mobile/src/lib/validation.ts

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { valid: false, error: "Email is required" };
  }

  const trimmed = email.trim();

  // Basic email regex - matches most common email formats
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Please enter a valid email address" };
  }

  return { valid: true };
}

/**
 * Validates password according to backend requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one number
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password) {
    return { valid: false, errors: ["Password is required"] };
  }

  if (password.length < 8) {
    errors.push("At least 8 characters");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("At least one uppercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("At least one number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates name field
 */
export function validateName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { valid: false, error: "Name is required" };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: "Name must be at least 2 characters" };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: "Name must be less than 100 characters" };
  }

  return { valid: true };
}

/**
 * Validates username (optional field)
 */
export function validateUsername(username: string): ValidationResult {
  if (!username || !username.trim()) {
    // Username is optional, so empty is valid
    return { valid: true };
  }

  const trimmed = username.trim();

  if (trimmed.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }

  if (trimmed.length > 30) {
    return { valid: false, error: "Username must be less than 30 characters" };
  }

  // Username should only contain alphanumeric characters, underscores, and hyphens
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return {
      valid: false,
      error: "Username can only contain letters, numbers, underscores, and hyphens",
    };
  }

  return { valid: true };
}

/**
 * Validates that passwords match
 */
export function validatePasswordMatch(
  password: string,
  confirmPassword: string
): ValidationResult {
  if (password !== confirmPassword) {
    return { valid: false, error: "Passwords do not match" };
  }

  return { valid: true };
}

/**
 * Validates verification code (6 digits)
 */
export function validateVerificationCode(code: string): ValidationResult {
  if (!code) {
    return { valid: false, error: "Verification code is required" };
  }

  if (!/^\d{6}$/.test(code)) {
    return { valid: false, error: "Verification code must be 6 digits" };
  }

  return { valid: true };
}

/**
 * Gets password strength (0-3)
 * 0 = weak, 1 = fair, 2 = good, 3 = strong
 */
export function getPasswordStrength(password: string): number {
  let strength = 0;

  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++; // Special characters

  // Cap at 3
  return Math.min(strength, 3);
}

/**
 * Gets password strength label
 */
export function getPasswordStrengthLabel(strength: number): string {
  switch (strength) {
    case 0:
      return "Weak";
    case 1:
      return "Fair";
    case 2:
      return "Good";
    case 3:
      return "Strong";
    default:
      return "Weak";
  }
}

/**
 * Gets password strength color
 */
export function getPasswordStrengthColor(strength: number): string {
  switch (strength) {
    case 0:
      return "#FF3B30"; // red
    case 1:
      return "#FF9500"; // orange
    case 2:
      return "#FFCC00"; // yellow
    case 3:
      return "#34C759"; // green
    default:
      return "#FF3B30";
  }
}
