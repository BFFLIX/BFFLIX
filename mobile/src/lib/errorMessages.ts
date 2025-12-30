// mobile/src/lib/errorMessages.ts

/**
 * Maps backend error codes to user-friendly messages
 */
export function getAuthErrorMessage(errorCode: string): string {
  const messages: Record<string, string> = {
    // Authentication errors
    email_not_verified: "Please verify your email before logging in.",
    invalid_credentials: "Invalid email or password. Please try again.",
    account_locked:
      "Your account has been locked due to too many failed login attempts. Please try again later or reset your password.",
    account_suspended: "Your account has been suspended. Please contact support.",

    // Signup errors
    email_already_in_use:
      "This email is already registered. Try logging in instead.",
    username_already_in_use: "This username is taken. Please choose another.",
    weak_password:
      "Your password doesn't meet the security requirements. Please use at least 8 characters with an uppercase letter and a number.",

    // Email verification errors
    invalid_verification_code: "Invalid verification code. Please try again.",
    verification_code_expired:
      "Verification code has expired. Please request a new one.",
    email_already_verified: "This email is already verified. You can log in now.",

    // Password reset errors
    invalid_or_expired_token:
      "This reset link is invalid or has expired. Please request a new one.",
    password_reuse: "Please choose a different password than your current one.",

    // Generic validation
    validation_error: "Please check your input and try again.",

    // Network errors
    network_error:
      "Unable to connect to the server. Please check your internet connection.",
    request_timeout:
      "The request took too long. Please check your connection and try again.",

    // Rate limiting
    too_many_requests:
      "Too many attempts. Please wait a few minutes and try again.",

    // Unknown
    unknown: "An unexpected error occurred. Please try again.",
  };

  return messages[errorCode] || messages.unknown;
}

/**
 * Extracts error message from various error formats
 */
export function extractErrorMessage(error: any): string {
  // If it's already a string, return it
  if (typeof error === "string") {
    return error;
  }

  // Check for error code first
  if (error?.payload?.error) {
    return getAuthErrorMessage(error.payload.error);
  }

  // Check for direct error field
  if (error?.error) {
    return getAuthErrorMessage(error.error);
  }

  // Check for message field
  if (error?.message) {
    return error.message;
  }

  // Check for payload message
  if (error?.payload?.message) {
    return error.payload.message;
  }

  return getAuthErrorMessage("unknown");
}

/**
 * Extracts field-specific validation errors
 */
export function extractFieldErrors(error: any): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  // Check for validation_error with details
  if (error?.payload?.error === "validation_error" && error?.payload?.details) {
    const details = error.payload.details;

    // Convert array of errors to first error message per field
    Object.keys(details).forEach((field) => {
      const errors = details[field];
      if (Array.isArray(errors) && errors.length > 0) {
        fieldErrors[field] = errors[0];
      }
    });
  }

  return fieldErrors;
}
