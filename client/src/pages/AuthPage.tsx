
// client/src/pages/AuthPage.tsx
import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiPost } from "../lib/api";
import bfflixLogo from "../assets/bfflix-logo.svg";

type Mode = "login" | "register";

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

type PasswordStrength = {
  score: number; // 0–4
  label: string;
};

function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "" };

  let score = 0;

  // Length
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character variety
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Clamp score to 0–4
  if (score > 4) score = 4;

  let label = "Very weak";
  if (score <= 1) label = "Weak";
  else if (score === 2) label = "Okay";
  else if (score === 3) label = "Strong";
  else if (score === 4) label = "Very strong";

  return { score, label };
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Forgot-password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  // Email verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");

  // Show / hide password state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength state (for the main password field)
  const [passwordStrength, setPasswordStrength] =
    useState<PasswordStrength | null>(null);

  const isLogin = mode === "login";

  // When coming back from email verification, show a success message and force login mode
  useEffect(() => {
    const verifiedParam =
      searchParams.get("verified") ||
      searchParams.get("emailVerified") ||
      searchParams.get("verification");

    if (verifiedParam) {
      setMode("login");
      setError(null);
      setInfoMessage("Your email has been verified. You can now sign in.");
    }
  }, [searchParams]);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setInfoMessage(null);

    if (nextMode === "login") {
      // When going back to login, we can ignore register-only fields
      setAcceptedTerms(false);
      setAcceptedPrivacy(false);
      setConfirmPassword("");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    if (!isLogin) {
      // Register validations
      if (!firstName.trim() || !lastName.trim()) {
        setError("Please enter both first and last name.");
        return;
      }
      if (!acceptedTerms || !acceptedPrivacy) {
        setError(
          "Please accept both the Terms and Conditions and the Privacy Policy to create an account."
        );
        return;
      }

      if (!confirmPassword) {
        setError("Please confirm your password.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match. Please try again.");
        return;
      }
    }

    setIsLoading(true);

    if (isLogin) {
      // LOGIN FLOW
      try {
        const payload: Record<string, any> = { email, password };
        const data = await apiPost<AuthResponse>("/auth/login", payload);

        // Persist token in localStorage as a backup
        try {
          window.localStorage.setItem("bfflix_token", data.token);
        } catch {
          // ignore storage failures
        }

        navigate("/home");
      } catch (err: any) {
        const raw = err?.message || "";

        // Handle unverified email error from backend login
        if (
          raw === "email_not_verified" ||
          raw === "unverified_email" ||
          raw === "email_not_confirmed"
        ) {
          setPendingVerificationEmail(email);
          setShowVerifyModal(true);
          setInfoMessage(
            "We emailed you a 6-digit verification code. Enter it below to verify your account."
          );
          setError(null);
        } else {
          const msg =
            raw === "missing_token"
              ? "Login worked, but your browser blocked the session cookie. Please enable cookies for BFFlix or try another browser."
              : raw || "Something went wrong. Please try again.";
          setError(msg);
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      // SIGNUP FLOW
      try {
        const fullName = `${firstName} ${lastName}`.trim();
        const payload: Record<string, any> = {
          email,
          password,
          name: fullName,
        };

        // Backend creates the user and sends verification email + 6-digit code,
        // but does NOT log the user in yet.
        await apiPost("/auth/signup", payload);

        // Reset register-only fields and switch back to login mode
        setMode("login");
        setAcceptedTerms(false);
        setAcceptedPrivacy(false);
        setConfirmPassword("");

        setInfoMessage(
          "Account created. Please check your email for a 6-digit verification code before signing in."
        );
      } catch (err: any) {
        const raw = err?.message || "";
        const msg =
          raw ||
          "Something went wrong while creating your account. Please try again.";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    }
  }

  async function handleVerifyCodeSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const trimmedCode = verifyCode.trim();
    const emailToVerify = pendingVerificationEmail || email.trim();

    if (!emailToVerify) {
      setError("We could not determine which email to verify. Please log in again.");
      return;
    }

    if (!trimmedCode || trimmedCode.length < 6) {
      setError("Please enter the 6-digit verification code from your email.");
      return;
    }

    try {
      setIsVerifying(true);

      const data = await apiPost<AuthResponse>("/auth/verify-email", {
        email: emailToVerify,
        code: trimmedCode,
      });

      // If verification returns a token, log the user in immediately
      if (data?.token) {
        try {
          window.localStorage.setItem("bfflix_token", data.token);
        } catch {
          // ignore storage failures
        }
        setShowVerifyModal(false);
        setVerifyCode("");
        setPendingVerificationEmail("");
        setInfoMessage(null);
        navigate("/home");
      } else {
        // Otherwise, just show a message and send them back to login
        setShowVerifyModal(false);
        setVerifyCode("");
        setPendingVerificationEmail("");
        setMode("login");
        setInfoMessage("Your email has been verified. Please sign in again.");
      }
    } catch (err: any) {
      const msg =
        err?.message === "invalid_code"
          ? "That verification code is not valid. Please check your email and try again."
          : err?.message === "code_expired"
          ? "That verification code has expired. Request a new one from your email."
          : err?.message || "We could not verify your email. Please try again.";
      setError(msg);
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const trimmed = forgotEmail.trim();
    if (!trimmed) {
      setError("Please enter the email associated with your account.");
      return;
    }

    try {
      setIsForgotSubmitting(true);
      await apiPost("/auth/password/forgot", { email: trimmed });

      // Pre-fill the main form email so the user sees it next time
      setEmail(trimmed);
      setShowForgotModal(false);
      setForgotEmail("");

      setInfoMessage(
        "If an account exists for that email, you will receive a password reset link in your inbox shortly."
      );
    } catch (err: any) {
      const msg =
        err?.message ||
        "Something went wrong while sending the reset link. Please try again.";
      setError(msg);
    } finally {
      setIsForgotSubmitting(false);
    }
  }

  // Update password + strength together
  function handlePasswordChange(value: string) {
    setPassword(value);
    if (!value) {
      setPasswordStrength(null);
    } else {
      setPasswordStrength(evaluatePasswordStrength(value));
    }
  }

  const strengthPercent =
    passwordStrength && passwordStrength.score > 0
      ? (passwordStrength.score / 4) * 100
      : 0;

  const strengthColor =
    !passwordStrength || !passwordStrength.label
      ? "bg-zinc-700"
      : passwordStrength.score <= 1
      ? "bg-red-500"
      : passwordStrength.score === 2
      ? "bg-yellow-500"
      : passwordStrength.score === 3
      ? "bg-emerald-500"
      : "bg-emerald-400";

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-zinc-900 text-zinc-100 flex items-center justify-center px-4">
      <div className="w-full max-w-5xl rounded-3xl bg-black/60 border border-zinc-800 shadow-[0_24px_80px_rgba(0,0,0,0.9)] backdrop-blur-xl flex flex-col md:flex-row overflow-hidden">
        {/* Left: Auth form */}
        <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-between">
          <div>
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <img
                src={bfflixLogo}
                alt="BFFlix logo"
                className="h-20 w-auto drop-shadow-[0_0_22px_rgba(248,113,113,0.7)]"
              />
              <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-zinc-400">
                Share what you watch
              </div>
            </div>

            {/* Tabs */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex rounded-full bg-zinc-900/80 p-1 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className={`px-4 py-1.5 text-sm rounded-full transition ${
                    isLogin
                      ? "bg-red-600 text-white shadow-md shadow-red-900/60"
                      : "text-zinc-400 hover:text-zinc-100"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className={`px-4 py-1.5 text-sm rounded-full transition ${
                    !isLogin
                      ? "bg-red-600 text-white shadow-md shadow-red-900/60"
                      : "text-zinc-400 hover:text-zinc-100"
                  }`}
                >
                  Create account
                </button>
              </div>
            </div>

            {/* Heading + subheading */}
            <div className="space-y-1 mb-8 text-center">
              <h1 className="text-2xl md:text-3xl font-semibold text-white">
                {isLogin ? "Welcome back" : "Create your BFFlix account"}
              </h1>
              <p className="text-sm text-zinc-400">
                {isLogin
                  ? "Sign in to share your watchlist, post in circles, and get smart AI suggestions."
                  : "Sign up to start logging viewings, join circles, and get personalized recommendations."}
              </p>
            </div>

            {/* Error + info messages */}
            {error && (
              <div className="mb-3 rounded-xl border border-red-800 bg-red-950/60 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}
            {infoMessage && (
              <div className="mb-3 rounded-xl border border-emerald-700 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200">
                {infoMessage}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-zinc-300">
                      First name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className="w-full rounded-xl bg-zinc-950/80 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-zinc-300">
                      Last name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      className="w-full rounded-xl bg-zinc-950/80 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl bg-zinc-950/80 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition"
                  required
                />
              </div>

              {/* Password + show/hide + strength */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (isLogin) {
                        setPassword(value);
                        // Do NOT update passwordStrength in login mode
                        setPasswordStrength(null);
                      } else {
                        handlePasswordChange(value);
                      }
                    }}
                    placeholder={
                      isLogin ? "Your password" : "Create a strong password"
                    }
                    className="w-full rounded-xl bg-zinc-950/80 border border-zinc-800 px-3 py-2.5 pr-16 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-xs text-zinc-400 hover:text-zinc-100"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {/* Strength meter (only show when password is non-empty and in register mode) */}
                {!isLogin && passwordStrength && passwordStrength.label && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full ${strengthColor} transition-all duration-200`}
                        style={{ width: `${strengthPercent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Password strength:{" "}
                      <span className="font-medium text-zinc-200">
                        {passwordStrength.label}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password (register only) */}
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-300">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      className="w-full rounded-xl bg-zinc-950/80 border border-zinc-800 px-3 py-2.5 pr-16 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((prev) => !prev)
                      }
                      className="absolute inset-y-0 right-3 flex items-center text-xs text-zinc-400 hover:text-zinc-100"
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              )}

              {isLogin && (
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setInfoMessage(null);
                      setForgotEmail(email || "");
                      setShowForgotModal(true);
                    }}
                    className="text-zinc-300 hover:text-white underline underline-offset-2"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}

              {!isLogin && (
                <div className="mt-2 space-y-2 text-[11px] text-zinc-400">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-950 text-red-600 focus:ring-red-600"
                    />
                    <span>
                      I agree to the{" "}
                      <button
                        type="button"
                        onClick={() => setShowTerms(true)}
                        className="text-zinc-300 underline underline-offset-2 hover:text-white"
                      >
                        Terms and Conditions
                      </button>
                      .
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedPrivacy}
                      onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-950 text-red-600 focus:ring-red-600"
                    />
                    <span>
                      I have read and agree to the{" "}
                      <button
                        type="button"
                        onClick={() => setShowPrivacy(true)}
                        className="text-zinc-300 underline underline-offset-2 hover:text-white"
                      >
                        Privacy Policy
                      </button>
                      .
                    </span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full rounded-xl bg-red-600 hover:bg-red-500 text-sm font-medium text-white py-2.5 flex items-center justify-center gap-2 shadow-md shadow-red-900/60 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading
                  ? isLogin
                    ? "Signing you in..."
                    : "Creating your account..."
                  : isLogin
                  ? "Sign in to BFFlix"
                  : "Create account"}
              </button>

              <p className="mt-3 text-[11px] text-zinc-500 leading-relaxed">
                You can review BFFlix{" "}
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="text-zinc-300 underline underline-offset-2 hover:text-white"
                >
                  Terms and Conditions
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  onClick={() => setShowPrivacy(true)}
                  className="text-zinc-300 underline underline-offset-2 hover:text-white"
                >
                  Privacy Policy
                </button>{" "}
                at any time.
              </p>
            </form>
          </div>

          {/* Little footer */}
          <div className="mt-8 text-[11px] text-zinc-500">
            BFFlix is a personal project for sharing what you watch with your
            friends. Feedback is always welcome.
          </div>
        </div>

        {/* Right: Hero / Preview */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-red-900/70 via-zinc-900 to-black relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.28),transparent_60%),_radial-gradient(circle_at_bottom,_rgba(239,68,68,0.18),transparent_65%)]" />

          <div className="relative z-10 p-8 flex flex-col justify-between h-full">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Turn your watch history into a story
              </h2>
              <p className="text-sm text-zinc-200/90 max-w-md">
                Log movies and shows, post to your circles, and let the AI
                assistant suggest what to watch next based on what you already
                love.
              </p>
            </div>

            {/* Fake preview cards */}
            <div className="space-y-3">
              <div className="rounded-2xl bg-black/60 border border-red-800/60 px-4 py-3 shadow-lg shadow-red-950/60">
                <p className="text-xs uppercase tracking-[0.18em] text-red-400 mb-1">
                  Recent viewing
                </p>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">The Matrix</p>
                    <p className="text-xs text-zinc-400">
                      Rated 5 stars - loved the pacing
                    </p>
                  </div>
                  <div className="flex gap-0.5 text-yellow-400 text-xs">
                    ★★★★★
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-black/50 border border-zinc-800/80 px-4 py-3 shadow-lg shadow-black/70">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400 mb-1">
                  AI suggestion
                </p>
                <p className="text-sm text-zinc-100 mb-1.5">
                  You loved smart sci fi with strong character arcs. Tonight you
                  might enjoy {""}
                  <span className="font-semibold text-white">
                    Blade Runner 2049
                  </span>
                  .
                </p>
                <p className="text-[11px] text-zinc-500">
                  Generated using your recent viewings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Terms modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="relative max-w-lg w-full rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6">
            <button
              type="button"
              onClick={() => setShowTerms(false)}
              className="absolute right-3 top-3 rounded-full p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 transition"
              aria-label="Close terms"
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold text-white mb-1">
              TERMS &amp; CONDITIONS
            </h3>
            <p className="text-[11px] text-zinc-500 mb-4">
              Last updated: November 19th 2025
            </p>
            <div className="space-y-3 text-sm text-zinc-300 max-h-[60vh] overflow-y-auto pr-2">
              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">1. Introduction</h4>
                <p className="text-zinc-300">
                  Welcome to BFFlix (&quot;we&quot;, &quot;us&quot;, or
                  &quot;our&quot;). These Terms &amp; Conditions (&quot;Terms&quot;)
                  govern your access to and use of our website, mobile application,
                  and related services (collectively, the &quot;Service&quot;). By
                  accessing or using the Service, you agree to these Terms. If you
                  do not agree, you must not access or use the Service.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">2. Definitions</h4>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li>
                    <strong>&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;</strong> refers to any
                    person who uses the Service.
                  </li>
                  <li>
                    <strong>&quot;Content&quot;</strong> means any material (comments,
                    ratings, reviews, images, posts) you upload, share, or publish
                    through the Service.
                  </li>
                  <li>
                    <strong>&quot;Circle&quot;</strong> means a private group within the
                    Service that allows Users to share posts, ratings, and comments
                    with invited members.
                  </li>
                  <li>
                    <strong>&quot;Services&quot; (streaming platforms)</strong> refers
                    to third-party streaming platforms such as Netflix, Hulu, Max,
                    Prime Video, Disney+, and Peacock that a User selects in their
                    profile.
                  </li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">3. License to Use</h4>
                <p className="text-zinc-300">
                  We grant you a limited, non-exclusive, non-transferable, revocable
                  license to access and use the Service for personal, non-commercial
                  purposes, in accordance with these Terms.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">
                  4. Accounts and Security
                </h4>
                <p className="text-zinc-300">
                  To use certain features, you must create an account and provide
                  accurate information. You are responsible for maintaining the
                  confidentiality of your login credentials and for all activity under
                  your account. If you suspect unauthorized access, notify us
                  immediately at bfflix@outlook.com.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">5. Acceptable Use</h4>
                <p className="text-zinc-300 mb-1">
                  You agree not to:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li>Violate any laws or regulations.</li>
                  <li>
                    Infringe the rights (including intellectual property and privacy
                    rights) of others.
                  </li>
                  <li>
                    Upload or share harmful, obscene, threatening, or misleading
                    content.
                  </li>
                  <li>
                    Use the Service for commercial purposes, spam, or unauthorized
                    advertising.
                  </li>
                  <li>
                    Interfere with or attempt to gain unauthorized access to the
                    Service, other accounts, or networks.
                  </li>
                  <li>
                    Deploy bots, scrapers, or automated systems without our written
                    permission.
                  </li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">6. User Content</h4>
                <p className="text-zinc-300 mb-1">
                  You retain ownership of any Content you submit. By posting Content,
                  you grant BFFlix a worldwide, royalty-free, non-exclusive license to
                  host, display, reproduce, distribute, and modify such Content solely
                  for operating and improving the Service.
                </p>
                <p className="text-zinc-300 mb-1">
                  You acknowledge that your posts within Circles may be visible to
                  other members of that Circle, and that you can choose to share posts
                  with multiple Circles at once.
                </p>
                <p className="text-zinc-300">
                  We reserve the right to remove or restrict access to any Content or
                  account that violates these Terms.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">7. Circles</h4>
                <p className="text-zinc-300 mb-1">
                  Circles are private spaces where Users can:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300 mb-1">
                  <li>Post ratings, comments, and recommendations.</li>
                  <li>Invite or remove members.</li>
                  <li>Cross-post to multiple Circles at once.</li>
                </ul>
                <p className="text-zinc-300 mb-1">
                  We implement deduplication logic so that the same post shared across
                  multiple Circles does not appear multiple times in your feed.
                </p>
                <p className="text-zinc-300 mb-1">
                  You agree not to share access to Circles or redistribute any private
                  content from a Circle without the consent of its members.
                </p>
                <p className="text-zinc-300">
                  We reserve the right to suspend or remove Circles that violate these
                  Terms or contain prohibited content.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">
                  8. Streaming Availability
                </h4>
                <p className="text-zinc-300">
                  The Service may show what content is currently available on your
                  selected streaming platforms in the United States. We are not
                  affiliated with any streaming providers, and we do not guarantee the
                  accuracy, availability, or ongoing access to any titles listed. You
                  are responsible for confirming your own streaming subscriptions and
                  related costs.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">
                  9. Payments and Subscriptions (if applicable)
                </h4>
                <p className="text-zinc-300">
                  If we introduce paid or premium features, you agree to pay all
                  applicable fees and taxes. We may suspend or terminate your access
                  to paid features if payment fails or violates our billing terms. All
                  fees are non-refundable unless required by law.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">
                  10. Intellectual Property
                </h4>
                <p className="text-zinc-300">
                  Except for User-generated Content, all Service materials — including
                  trademarks, software, databases, design, and branding — are the
                  property of BFFlix or our licensors. You may not copy, modify,
                  distribute, reverse-engineer, or create derivative works without our
                  written consent.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">11. Disclaimers</h4>
                <p className="text-zinc-300">
                  THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
                  AVAILABLE.&quot; WE MAKE NO WARRANTIES OR REPRESENTATIONS OF ANY
                  KIND, EXPRESS OR IMPLIED, INCLUDING, WITHOUT LIMITATION, WARRANTIES
                  OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, OR
                  NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
                  UNINTERRUPTED, SECURE, OR ERROR-FREE.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">
                  12. Limitation of Liability
                </h4>
                <p className="text-zinc-300">
                  TO THE FULLEST EXTENT PERMITTED BY LAW, BFFLIX AND ITS AFFILIATES
                  SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, PUNITIVE,
                  OR CONSEQUENTIAL DAMAGES (INCLUDING LOSS OF DATA OR PROFITS) ARISING
                  FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM
                  RELATED TO THE SERVICE SHALL NOT EXCEED USD $100 OR THE AMOUNT YOU
                  PAID TO USE THE SERVICE, WHICHEVER IS GREATER.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">
                  13. Indemnification
                </h4>
                <p className="text-zinc-300">
                  You agree to defend, indemnify, and hold harmless BFFlix, its
                  officers, directors, employees, agents, and affiliates from any
                  claims, damages, losses, or expenses (including legal fees) arising
                  out of your use of the Service or violation of these Terms.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">14. Termination</h4>
                <p className="text-zinc-300">
                  We may suspend or terminate your account or access to any part of
                  the Service at any time for violating these Terms or applicable
                  laws. You may delete your account at any time. Upon termination,
                  your right to use the Service ends, and we may delete your data
                  consistent with our retention policy.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">15. Modifications</h4>
                <p className="text-zinc-300">
                  We may update these Terms periodically. When we do, we&apos;ll post
                  the new Terms with a revised &quot;Last Updated&quot; date. Your
                  continued use of the Service after changes means you accept the new
                  Terms.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">16. Governing Law</h4>
                <p className="text-zinc-300">
                  These Terms are governed by the laws of the State of Florida, United
                  States, without regard to its conflict of law principles. You agree
                  that any dispute will be handled exclusively in the courts of
                  Florida, and you waive any right to a jury trial.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">17. Miscellaneous</h4>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li>If any provision is found invalid, the remainder remains enforceable.</li>
                  <li>Failure to enforce a provision is not a waiver.</li>
                  <li>
                    These Terms constitute the entire agreement between you and
                    BFFlix.
                  </li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">18. Contact</h4>
                <p className="text-zinc-300 mb-1">
                  For questions about these Terms, please contact:
                </p>
                <p className="text-zinc-300">
                  BFFlix
                  <br />
                  bfflix@outlook.com
                  <br />
                  4000 Central Florida Blvd
                  <br />
                  Orlando FL, 32836
                </p>
              </section>

              <section>
                <p className="text-xs text-zinc-400 pt-2">
                  BY USING BFFLIX, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND
                  AGREE TO THESE TERMS.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Privacy modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="relative max-w-lg w-full rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6">
            <button
              type="button"
              onClick={() => setShowPrivacy(false)}
              className="absolute right-3 top-3 rounded-full p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 transition"
              aria-label="Close privacy policy"
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold text-white mb-1">
              BFFlix Privacy Policy
            </h3>
            <p className="text-[11px] text-zinc-500 mb-4">
              Last updated: November 19th, 2025
            </p>
            <div className="space-y-3 text-sm text-zinc-300 max-h-[60vh] overflow-y-auto pr-2">
              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">1. Introduction</h4>
                <p className="text-zinc-300">
                  Welcome to BFFlix ("we", "us", or "our"). We value your privacy and are committed to protecting your personal information.
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the BFFlix web or mobile application (collectively, the "Service"). By using BFFlix, you agree to the terms of this Privacy Policy.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">2. Information We Collect</h4>
                <p className="text-zinc-300 mb-1">We collect information that helps us provide, improve, and personalize the Service.</p>

                <p className="text-zinc-300 font-medium mb-1">A. Information You Provide Directly</p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300 mb-1">
                  <li><strong>Account Information:</strong> Name, email address, password (hashed and encrypted), and selected streaming services.</li>
                  <li><strong>Profile Details:</strong> Display name, profile picture (if uploaded), and service preferences.</li>
                  <li><strong>Content:</strong> Posts, ratings, comments, or discussions you share within your Circles.</li>
                  <li><strong>Communications:</strong> Feedback, support requests, or emails sent to us.</li>
                </ul>

                <p className="text-zinc-300 font-medium mb-1">B. Information We Collect Automatically</p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300 mb-1">
                  <li><strong>Usage Data:</strong> Pages or screens you visit, actions taken, and timestamps.</li>
                  <li><strong>Device Data:</strong> Device type, operating system, browser, IP address, and app version.</li>
                  <li><strong>Cookies and Analytics:</strong> Analytics tools such as Google Analytics or Vercel Analytics help understand activity and preserve login state.</li>
                </ul>

                <p className="text-zinc-300 font-medium mb-1">C. Information From Third Parties</p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li><strong>Streaming Availability APIs:</strong> Public availability data from TMDb or JustWatch.</li>
                  <li><strong>AI Agent Providers:</strong> Anonymized context sent to OpenAI or Google Gemini to generate recommendations.</li>
                  <li><strong>Authentication Providers:</strong> If signing in with Google/Apple, we receive only verified email and profile info.</li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">3. How We Use Your Information</h4>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li>Provide, maintain, and improve the BFFlix Service.</li>
                  <li>Personalize recommendations and Circle activity feeds.</li>
                  <li>Enable AI-driven movie and show suggestions.</li>
                  <li>Manage authentication, password resets, and account security.</li>
                  <li>Monitor and detect fraudulent or abusive behavior.</li>
                  <li>Communicate updates and security notices.</li>
                  <li>Comply with legal requirements.</li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">4. AI Features and Data Handling</h4>
                <p className="text-zinc-300 mb-1">Our AI features analyze your viewing history and metadata to provide personalized suggestions.</p>
                <p className="text-zinc-300 mb-1">We never send personally identifiable information to AI APIs—only anonymized context.</p>
                <p className="text-zinc-300">AI output complies with provider terms, and no chat data is stored unless explicitly saved.</p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">5. Sharing of Information</h4>
                <p className="text-zinc-300 mb-1">We do not sell your data. We share information only as needed:</p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li><strong>Hosting/Storage:</strong> MongoDB Atlas, Vercel, Render, Railway</li>
                  <li><strong>Analytics:</strong> Google Analytics, Vercel Analytics</li>
                  <li><strong>AI Processing:</strong> OpenAI or Google Gemini (anonymized)</li>
                  <li><strong>Email Services:</strong> SMTP or AWS SES</li>
                  <li><strong>Legal:</strong> Law enforcement when required by law</li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">6. Circles and Shared Content</h4>
                <p className="text-zinc-300 mb-1">Content posted in a Circle is only visible to that Circle's members.</p>
                <p className="text-zinc-300">Cross-posted content appears once in deduped feeds.</p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">7. Data Retention</h4>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li>Personal data deleted within 30 days after account deletion.</li>
                  <li>Circle posts may remain as anonymized entries (“Deleted User”).</li>
                  <li>Logs/backups retained up to 90 days.</li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">8. Security</h4>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li>HTTPS encryption</li>
                  <li>Bcrypt password hashing</li>
                  <li>Protected environment variables</li>
                  <li>Role-based access controls</li>
                </ul>
                <p className="text-zinc-300 mt-1">No system is 100% secure; you acknowledge inherent internet risks.</p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">9. Your Rights</h4>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li>Request access/copies of your data</li>
                  <li>Correct or delete information</li>
                  <li>Request account deletion (right to be forgotten)</li>
                  <li>Withdraw AI feature consent</li>
                  <li>Request details on third-party sharing</li>
                </ul>
                <p className="text-zinc-300 mt-1">Email bfflix@outlook.com with subject "Privacy Request".</p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">10. Children’s Privacy</h4>
                <p className="text-zinc-300">Users must be 13 or older. Contact us if a minor account needs removal.</p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">11. International Data Transfers</h4>
                <p className="text-zinc-300">Data may be processed in the United States. Using BFFlix implies consent.</p>
              </section>

              <section>
                <h4 className="font-semibold text-zinc-100 mb-1">12. Changes to This Policy</h4>
                <p className="text-zinc-300">We update this policy periodically. Continued use means acceptance of changes.</p>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Email verification modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="relative max-w-md w-full rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6">
            <button
              type="button"
              onClick={() => {
                if (!isVerifying) {
                  setShowVerifyModal(false);
                  setVerifyCode("");
                }
              }}
              className="absolute right-3 top-3 rounded-full p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 transition"
              aria-label="Close email verification"
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold text-white mb-2">
              Verify your email
            </h3>
            <p className="text-sm text-zinc-300 mb-4">
              We sent a 6-digit verification code to{" "}
              <span className="font-medium text-zinc-100">
                {pendingVerificationEmail || email}
              </span>
              . Enter it below to activate your account.
            </p>
            <form onSubmit={handleVerifyCodeSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  6-digit code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="123456"
                  className="w-full rounded-xl bg-zinc-950/80 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition tracking-[0.4em] text-center"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isVerifying}
                className="w-full rounded-xl bg-red-600 hover:bg-red-500 text-sm font-medium text-white py-2.5 flex items-center justify-center gap-2 shadow-md shadow-red-900/60 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isVerifying ? "Verifying..." : "Verify email"}
              </button>
              <p className="text-[11px] text-zinc-500">
                If you did not receive the email, check your spam folder. If it is
                not there, request a new verification email from the login screen.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Forgot password modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="relative max-w-md w-full rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6">
            <button
              type="button"
              onClick={() => {
                if (!isForgotSubmitting) {
                  setShowForgotModal(false);
                  setForgotEmail("");
                }
              }}
              className="absolute right-3 top-3 rounded-full p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 transition"
              aria-label="Close forgot password"
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold text-white mb-2">
              Reset your password
            </h3>
            <p className="text-sm text-zinc-300 mb-4">
              Enter the email linked to your BFFlix account and we’ll send you a
              secure link to create a new password.
            </p>
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Email address
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl bg-zinc-950/80 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isForgotSubmitting}
                className="w-full rounded-xl bg-red-600 hover:bg-red-500 text-sm font-medium text-white py-2.5 flex items-center justify-center gap-2 shadow-md shadow-red-900/60 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isForgotSubmitting
                  ? "Sending reset link..."
                  : "Send reset link"}
              </button>
              <p className="text-[11px] text-zinc-500">
                If you do not see the email within a few minutes, check your
                spam folder.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}