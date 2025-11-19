
// client/src/pages/AuthPage.tsx
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
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

export default function AuthPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
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

  const isLogin = mode === "login";

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

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload: Record<string, any> = { email, password };

      if (!isLogin) {
        payload.name = name;
      }

      const data = await apiPost<AuthResponse>(endpoint, payload);

      // Persist token in localStorage as a backup for when cookies are blocked
      try {
        window.localStorage.setItem("bfflix_token", data.token);
      } catch {
        // ignore storage failures
      }

      navigate("/home");
    } catch (err: any) {
      const msg =
        err?.message === "missing_token"
          ? "Login worked, but your browser blocked the session cookie. Please enable cookies for BFFlix or try another browser."
          : err?.message || "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
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
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-300">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Choose a display name"
                    className="w-full rounded-xl bg-zinc-950/80 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition"
                  />
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

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLogin ? "Your password" : "Create a strong password"}
                  className="w-full rounded-xl bg-zinc-950/80 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition"
                  required
                />
              </div>

              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-300">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full rounded-xl bg-zinc-950/80 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 transition"
                    required
                  />
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
                    <p className="text-sm font-medium text-white">
                      The Matrix
                    </p>
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
                  might enjoy{" "}
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
            <h3 className="text-lg font-semibold text-white mb-2">
              Terms and Conditions
            </h3>
            <p className="text-sm text-zinc-300 mb-2">
              BFFlix is a personal side project and is provided as is. Do not
              share account details with others. By using BFFlix you agree that
              your content may be stored for the purpose of powering features
              like your viewing history and AI suggestions.
            </p>
            <p className="text-sm text-zinc-400">
              These terms may change as the project evolves. If you continue to
              use the site after changes are posted, you accept the updated
              terms.
            </p>
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
            <h3 className="text-lg font-semibold text-white mb-2">
              Privacy Policy
            </h3>
            <p className="text-sm text-zinc-300 mb-2">
              BFFlix stores your account email, basic profile info, and the
              viewing data you choose to log. This data is used to render your
              feed, circles, and AI suggestions.
            </p>
            <p className="text-sm text-zinc-400 mb-2">
              Your data is not sold to third parties. Logs may be used in
              aggregate to improve the project and diagnose issues.
            </p>
            <p className="text-sm text-zinc-400">
              If you want your account and data removed in the future, a simple
              manual delete process can be added to the app.
            </p>
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
              Enter the email linked to your BFFlix account and we’ll send you a secure link to create a new password.
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
                {isForgotSubmitting ? "Sending reset link..." : "Send reset link"}
              </button>
              <p className="text-[11px] text-zinc-500">
                If you do not see the email within a few minutes, check your spam folder.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}