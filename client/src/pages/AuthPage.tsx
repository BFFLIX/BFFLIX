
// src/pages/AuthPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/bfflix-logo.svg";

type Mode = "login" | "signup";

// Point this at your Express server base URL
// For dev: http://localhost:4000 (or whatever your server runs on)
// For prod: set VITE_API_BASE_URL=https://bfflix.onrender.com
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:8080" : "https://bfflix.onrender.com");

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");

  // --- login form state ---
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // --- signup form state ---
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  // --- ui state ---
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetLoading, setIsResetLoading] = useState(false);

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);


  // Helper to pull a nice message from your error shapes
  const extractErrorMessage = async (res: Response) => {
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      return "Something went wrong. Please try again.";
    }

    if (data?.error === "validation_error" && data.details) {
      const fields = Object.values(data.details) as unknown as string[][];
      const firstField = fields[0];
      if (firstField && firstField[0]) return firstField[0];
    }

    if (data?.error === "weak_password") {
      return (
        data.details?.[0] ||
        "Password is too weak. Please choose a stronger one."
      );
    }

    if (data?.error === "email_already_in_use") {
      return "An account with this email already exists.";
    }

    if (data?.error === "invalid_credentials") {
      return "Invalid email or password.";
    }

    if (data?.error === "account_locked") {
      return (
        data.message ||
        "Too many failed attempts. Your account is temporarily locked."
      );
    }

    if (data?.error === "account_suspended") {
      return "This account has been suspended. Contact support.";
    }

    if (typeof data?.message === "string") return data.message;
    if (typeof data?.error === "string") return data.error;

    return "Something went wrong. Please try again.";
  };

  // --- handlers ---

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setResetMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        credentials: "include", // if you later set httpOnly cookies
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      if (!res.ok) {
        const msg = await extractErrorMessage(res);
        throw new Error(msg);
      }

      const data = await res.json();
      // Backend returns { token, user: { id, email, name } }
      // You can store this token in a global auth store later:
      // localStorage.setItem("bfflix_token", data.token);
      console.log("Login success:", data);

      // Redirect to home/dashboard
      navigate("/home");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setResetMsg(null);

    if (signupPassword !== signupConfirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    const fullName = `${firstName} ${lastName}`.trim();
    if (!fullName) {
      setErrorMsg("Please enter your name.");
      return;
    }

    if (!acceptTerms || !acceptPrivacy) {
      setErrorMsg(
        "Please agree to both the Terms & Conditions and the Privacy Policy."
      );
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          name: fullName, // matches signupSchema on backend
        }),
      });

      if (!res.ok) {
        const msg = await extractErrorMessage(res);
        throw new Error(msg);
      }

      const data = await res.json();
      console.log("Signup success:", data);

      // After a successful signup, switch to login tab
      setMode("login");
      setErrorMsg(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Sign up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestReset = async (email: string) => {
    setErrorMsg(null);
    setResetMsg(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMsg("Enter your email to reset your password.");
      return;
    }

    setIsResetLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      // Your backend always returns { ok: true } even if user not found
      if (!res.ok) {
        const msg = await extractErrorMessage(res);
        throw new Error(msg);
      }

      setResetMsg(
        "If an account exists with that email, a reset link has been sent."
      );
      setIsResetModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message || "Could not send reset link. Please try again later."
      );
    } finally {
      setIsResetLoading(false);
    }
  };


  // --- render ---

  return (
    <div className="auth-shell">
      {/* subtle animated orbs (CSS already handles these classes) */}
      <div className="auth-orb auth-orb--left" />
      <div className="auth-orb auth-orb--right" />
      <div className="auth-orb auth-orb--bottom" />

      <div className="auth-content">
        {/* Logo */}
        <div className="auth-logo">
          <img src={Logo} alt="BFFLIX" />
        </div>

        {/* Card */}
        <div className="auth-card">
          {/* Tabs */}
          <div className="auth-tabs">
            <button
              type="button"
              className={
                "auth-tab" + (mode === "login" ? " auth-tab--active" : "")
              }
              onClick={() => {
                setMode("login");
                setErrorMsg(null);
                setResetMsg(null);
              }}
            >
              Login
            </button>
            <button
              type="button"
              className={
                "auth-tab" + (mode === "signup" ? " auth-tab--active" : "")
              }
              onClick={() => {
                setMode("signup");
                setErrorMsg(null);
                setResetMsg(null);
              }}
            >
              Sign Up
            </button>
          </div>

          {/* error / info messages */}
          {errorMsg && (
            <div
              style={{
                marginBottom: "0.75rem",
                fontSize: "0.8rem",
                color: "#ff6b81",
              }}
            >
              {errorMsg}
            </div>
          )}

          {resetMsg && (
            <div
              style={{
                marginBottom: "0.75rem",
                fontSize: "0.8rem",
                color: "#8be9a5",
              }}
            >
              {resetMsg}
            </div>
          )}

          {mode === "login" ? (
            <form className="auth-form" onSubmit={handleLoginSubmit}>
              <div className="auth-field">
                <label className="auth-label" htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="Enter your email"
                  className="auth-input"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  placeholder="Enter your password"
                  className="auth-input"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>

              <div className="auth-forgot-row">
                <button
                  type="button"
                  className="auth-forgot-link"
                  onClick={() => {
                    setIsResetModalOpen(true);
                    setResetEmail(loginEmail);
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="auth-primary-button"
                disabled={isLoading}
              >
                {isLoading && mode === "login" ? "Logging in..." : "Login"}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSignupSubmit}>
              <div className="auth-row">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="signup-first-name">
                    First Name
                  </label>
                  <input
                    id="signup-first-name"
                    type="text"
                    required
                    placeholder="First name"
                    className="auth-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="signup-last-name">
                    Last Name
                  </label>
                  <input
                    id="signup-last-name"
                    type="text"
                    required
                    placeholder="Last name"
                    className="auth-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="signup-email">
                  Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  placeholder="Enter your email"
                  className="auth-input"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                />
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="signup-password">
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  required
                  placeholder="Create a password"
                  className="auth-input"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                />
              </div>


              <div className="auth-field">
                <label
                  className="auth-label"
                  htmlFor="signup-confirm-password"
                >
                  Confirm Password
                </label>
                <input
                  id="signup-confirm-password"
                  type="password"
                  required
                  placeholder="Confirm your password"
                  className="auth-input"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                />
              </div>

              <div className="auth-terms-row">
                <input
                  id="terms"
                  type="checkbox"
                  className="auth-terms-checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                />
                <label htmlFor="terms">
                  I agree to the{" "}
                  <button
                    type="button"
                    className="auth-terms-link"
                    onClick={() => setIsTermsModalOpen(true)}
                  >
                    Terms &amp; Conditions
                  </button>
                </label>
              </div>

              <div className="auth-terms-row">
                <input
                  id="privacy"
                  type="checkbox"
                  className="auth-terms-checkbox"
                  checked={acceptPrivacy}
                  onChange={(e) => setAcceptPrivacy(e.target.checked)}
                />
                <label htmlFor="privacy">
                  I agree to the{" "}
                  <button
                    type="button"
                    className="auth-terms-link"
                    onClick={() => setIsPrivacyModalOpen(true)}
                  >
                    Privacy Policy
                  </button>
                </label>
              </div>

              <button
                type="submit"
                className="auth-primary-button"
                disabled={isLoading}
              >
                {isLoading && mode === "signup" ? "Signing up..." : "Sign Up"}
              </button>
            </form>
          )}
        </div>
      </div>

      {isResetModalOpen && (
        <div className="auth-modal-backdrop">
          <div className="auth-modal">
            <h3 className="auth-modal-title">Reset your password</h3>
            <p className="auth-modal-text">
              Enter the email associated with your account and we will send you a
              reset link.
            </p>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reset-email">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                className="auth-input"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
            <div className="auth-modal-actions">
              <button
                type="button"
                className="auth-secondary-button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="auth-primary-button"
                onClick={() => handleRequestReset(resetEmail)}
                disabled={isResetLoading}
              >
                {isResetLoading ? "Sending..." : "Send reset link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isTermsModalOpen && (
        <div className="auth-modal-backdrop">
          <div className="auth-modal auth-modal--scroll">
            <h3 className="auth-modal-title">Terms &amp; Conditions</h3>
            <div className="auth-modal-body">
              <h4>TERMS &amp; CONDITIONS</h4>
              <p>
                <strong>Last updated:</strong> Friday November 13th, 2025 at 3:49 PM
              </p>

              <h5>1. Introduction</h5>
              <p>
                Welcome to BFFLIX (&quot;we&quot;, &quot;us&quot;, or
                &quot;our&quot;). These Terms &amp; Conditions
                (&quot;Terms&quot;) govern your access to and use of our
                website, mobile application, and related services (collectively,
                the &quot;Service&quot;). By accessing or using the Service, you
                agree to these Terms. If you do not agree, you must not access
                or use the Service.
              </p>

              <h5>2. Definitions</h5>
              <ul>
                <li>
                  &quot;User,&quot; &quot;you,&quot; or &quot;your&quot; refers
                  to any person who uses the Service.
                </li>
                <li>
                  &quot;Content&quot; means any material (comments, ratings,
                  reviews, images, posts) you upload, share, or publish through
                  the Service.
                </li>
                <li>
                  &quot;Circle&quot; means a private group within the Service
                  that allows Users to share posts, ratings, and comments with
                  invited members.
                </li>
                <li>
                  &quot;Services&quot; (streaming platforms) refers to
                  third-party streaming platforms such as Netflix, Hulu, Max,
                  Prime Video, Disney+, and Peacock that a User selects in their
                  profile.
                </li>
              </ul>

              <h5>3. License to Use</h5>
              <p>
                We grant you a limited, non-exclusive, non-transferable,
                revocable license to access and use the Service for personal,
                non-commercial purposes, in accordance with these Terms.
              </p>

              <h5>4. Accounts and Security</h5>
              <p>
                To use certain features, you must create an account and provide
                accurate information. You are responsible for maintaining the
                confidentiality of your login credentials and for all activity
                under your account. If you suspect unauthorized access, notify
                us immediately at bfflix@outlook.com.
              </p>

              <h5>5. Acceptable Use</h5>
              <p>You agree not to:</p>
              <ul>
                <li>Violate any laws or regulations.</li>
                <li>
                  Infringe the rights (including intellectual property and
                  privacy rights) of others.
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
                  Deploy bots, scrapers, or automated systems without our
                  written permission.
                </li>
              </ul>

              <h5>6. User Content</h5>
              <p>
                You retain ownership of any Content you submit. By posting
                Content, you grant BFFlix a worldwide, royalty-free,
                non-exclusive license to host, display, reproduce, distribute,
                and modify such Content solely for operating and improving the
                Service. You acknowledge that your posts within Circles may be
                visible to other members of that Circle, and that you can choose
                to share posts with multiple Circles at once. We reserve the
                right to remove or restrict access to any Content or account
                that violates these Terms.
              </p>

              <h5>7. Circles</h5>
              <p>
                Circles are private spaces where Users can post ratings,
                comments, and recommendations, invite or remove members, and
                cross-post to multiple Circles at once. We implement
                deduplication logic so that the same post shared across multiple
                Circles does not appear multiple times in your feed. You agree
                not to share access to Circles or redistribute any private
                content from a Circle without the consent of its members. We
                reserve the right to suspend or remove Circles that violate
                these Terms or contain prohibited content.
              </p>

              <h5>8. Streaming Availability</h5>
              <p>
                The Service may show what content is currently available on your
                selected streaming platforms in the United States. We are not
                affiliated with any streaming providers, and we do not guarantee
                the accuracy, availability, or ongoing access to any titles
                listed. You are responsible for confirming your own streaming
                subscriptions and related costs.
              </p>

              <h5>9. Payments and Subscriptions (if applicable)</h5>
              <p>
                If we introduce paid or premium features, you agree to pay all
                applicable fees and taxes. We may suspend or terminate your
                access to paid features if payment fails or violates our billing
                terms. All fees are non-refundable unless required by law.
              </p>

              <h5>10. Intellectual Property</h5>
              <p>
                Except for User-generated Content, all Service materials,
                including trademarks, software, databases, design, and branding,
                are the property of BFFlix or our licensors. You may not copy,
                modify, distribute, reverse-engineer, or create derivative works
                without our written consent.
              </p>

              <h5>11. Disclaimers</h5>
              <p>
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
                AVAILABLE.&quot; WE MAKE NO WARRANTIES OR REPRESENTATIONS OF ANY
                KIND, EXPRESS OR IMPLIED, INCLUDING, WITHOUT LIMITATION,
                WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
                ACCURACY, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE
                SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
              </p>

              <h5>12. Limitation of Liability</h5>
              <p>
                TO THE FULLEST EXTENT PERMITTED BY LAW, BFFLIX AND ITS
                AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                SPECIAL, PUNITIVE, OR CONSEQUENTIAL DAMAGES (INCLUDING LOSS OF
                DATA OR PROFITS) ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL
                LIABILITY FOR ANY CLAIM RELATED TO THE SERVICE SHALL NOT EXCEED
                USD $100 OR THE AMOUNT YOU PAID TO USE THE SERVICE, WHICHEVER IS
                GREATER.
              </p>

              <h5>13. Indemnification</h5>
              <p>
                You agree to defend, indemnify, and hold harmless BFFlix, its
                officers, directors, employees, agents, and affiliates from any
                claims, damages, losses, or expenses (including legal fees)
                arising out of your use of the Service or violation of these
                Terms.
              </p>

              <h5>14. Termination</h5>
              <p>
                We may suspend or terminate your account or access to any part
                of the Service at any time for violating these Terms or
                applicable laws. You may delete your account at any time. Upon
                termination, your right to use the Service ends, and we may
                delete your data consistent with our retention policy.
              </p>

              <h5>15. Modifications</h5>
              <p>
                We may update these Terms periodically. When we do, we will post
                the new Terms with a revised &quot;Last Updated&quot; date. Your
                continued use of the Service after changes means you accept the
                new Terms.
              </p>

              <h5>16. Governing Law</h5>
              <p>
                These Terms are governed by the laws of [State/Country], without
                regard to its conflict of law principles. You agree that any
                dispute will be handled exclusively in the courts of
                [State/Country], and you waive any right to a jury trial.
              </p>

              <h5>17. Miscellaneous</h5>
              <ul>
                <li>
                  If any provision is found invalid, the remainder remains
                  enforceable.
                </li>
                <li>Failure to enforce a provision is not a waiver.</li>
                <li>
                  These Terms constitute the entire agreement between you and
                  BFFlix.
                </li>
              </ul>

              <h5>18. Contact</h5>
              <p>
                For questions about these Terms, please contact:
                <br />
                BFFLIX
                <br />
                bfflix@outlook.com
              </p>

              <p>
                BY USING BFFLIX, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD,
                AND AGREE TO THESE TERMS.
              </p>
            </div>
            <div className="auth-modal-actions">
              <button
                type="button"
                className="auth-secondary-button"
                onClick={() => setIsTermsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isPrivacyModalOpen && (
        <div className="auth-modal-backdrop">
          <div className="auth-modal auth-modal--scroll">
            <h3 className="auth-modal-title">Privacy Policy</h3>
            <div className="auth-modal-body">
              <h4>BFFLIX Privacy Policy</h4>
              <p>
                <strong>Last updated:</strong> November 10th, 2025 at 4:53 PM
              </p>

              <h5>1. Introduction</h5>
              <p>
                Welcome to BFFLIX (&quot;we&quot;, &quot;us&quot;, or
                &quot;our&quot;). We value your privacy and are committed to
                protecting your personal information. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your
                information when you use the BFFlix web or mobile application
                (collectively, the &quot;Service&quot;). By using BFFlix, you
                agree to the terms of this Privacy Policy.
              </p>

              <h5>2. Information We Collect</h5>
              <p>
                We collect information that helps us provide, improve, and
                personalize the Service.
              </p>

              <h6>2.A. Information You Provide Directly</h6>
              <ul>
                <li>
                  <strong>Account Information:</strong> Name, email address,
                  password (hashed and encrypted), and selected streaming
                  services (Netflix, Hulu, Max, Prime Video, Disney+, Peacock).
                </li>
                <li>
                  <strong>Profile Details:</strong> Display name, profile
                  picture (if uploaded), and service preferences.
                </li>
                <li>
                  <strong>Content:</strong> Posts, ratings, comments, or
                  discussions you share within your Circles.
                </li>
                <li>
                  <strong>Communications:</strong> Feedback, support requests,
                  or emails sent to us.
                </li>
              </ul>

              <h6>2.B. Information We Collect Automatically</h6>
              <ul>
                <li>
                  <strong>Usage Data:</strong> Pages or screens you visit,
                  actions taken, and timestamps.
                </li>
                <li>
                  <strong>Device Data:</strong> Device type, operating system,
                  browser, IP address, and app version.
                </li>
                <li>
                  <strong>Cookies and Analytics:</strong> We use analytics tools
                  (such as Google Analytics or Vercel Analytics) to understand
                  how users interact with our platform. Cookies help remember
                  preferences and login states.
                </li>
              </ul>

              <h6>2.C. Information From Third Parties</h6>
              <ul>
                <li>
                  <strong>Streaming Availability APIs:</strong> We pull public
                  availability data from services like TMDb or JustWatch to show
                  what is playable on your selected platforms.
                </li>
                <li>
                  <strong>AI Agent Providers:</strong> If you use our AI
                  recommendations, we securely transmit anonymized context to AI
                  services (for example, OpenAI or Google Gemini) to generate
                  viewing suggestions.
                </li>
                <li>
                  <strong>Authentication Providers (if applicable):</strong> If
                  you sign in via Google, Apple, or other third-party services,
                  we receive only your verified email and basic profile
                  information (no passwords).
                </li>
              </ul>

              <h5>3. How We Use Your Information</h5>
              <p>We use your information to:</p>
              <ul>
                <li>Provide, maintain, and improve the BFFlix Service.</li>
                <li>Personalize recommendations and Circle activity feeds.</li>
                <li>Enable AI-driven movie and show suggestions.</li>
                <li>
                  Manage authentication, password resets, and account security.
                </li>
                <li>
                  Monitor and detect fraudulent, abusive, or suspicious
                  behavior.
                </li>
                <li>
                  Communicate updates, service announcements, or security
                  notices.
                </li>
                <li>
                  Comply with legal requirements and enforce our Terms &amp;
                  Conditions.
                </li>
              </ul>

              <h5>4. AI Features and Data Handling</h5>
              <p>
                Our AI features (powered by OpenAI or Google Gemini) analyze:
              </p>
              <ul>
                <li>Your previously watched titles and ratings (from your viewing log).</li>
                <li>Publicly available metadata (title, genre, rating, etc.).</li>
              </ul>
              <p>
                We never send personally identifiable information (such as your
                email, name, or private messages) to AI APIs. Only minimal,
                anonymized context—such as preferred genres or services—is
                shared to generate personalized suggestions.
              </p>
              <p>
                All AI-generated output is processed in compliance with the
                respective provider terms, and we retain no conversational data
                beyond the immediate session unless you explicitly save it.
              </p>

              <h5>5. Sharing of Information</h5>
              <p>We do not sell your personal data. We may share information only under these limited circumstances:</p>
              <ul>
                <li>
                  <strong>Hosting and Storage:</strong> MongoDB Atlas
                  (database), Vercel / Render / Railway (API hosting).
                </li>
                <li>
                  <strong>Analytics:</strong> Google Analytics, Vercel
                  Analytics.
                </li>
                <li>
                  <strong>AI Recommendations:</strong> OpenAI API or Google
                  Gemini (anonymized content only).
                </li>
                <li>
                  <strong>Email Services:</strong> SMTP or AWS SES (for
                  password resets and notifications).
                </li>
                <li>
                  <strong>Legal Requirements:</strong> Law enforcement or
                  government entities if required by law.
                </li>
              </ul>
              <p>
                All third-party partners are contractually bound to handle your
                data securely and only for authorized purposes.
              </p>

              <h5>6. Circles and Shared Content</h5>
              <p>
                When you post content inside a Circle, that content is visible
                only to members of that Circle (or Circles, if cross-posted). If
                you choose to post to multiple Circles, the same post may appear
                once in shared feeds (deduplicated automatically).
              </p>
              <p>
                You control what you share. We are not responsible for how other
                users choose to share or use content once it is visible to them.
              </p>

              <h5>7. Data Retention</h5>
              <p>
                We retain account information for as long as your account is
                active. If you delete your account:
              </p>
              <ul>
                <li>
                  All personally identifiable data (name, email, and password
                  hash) will be deleted within 30 days.
                </li>
                <li>
                  Circle posts and comments may remain visible to other users as
                  anonymized content (&quot;Deleted User&quot;).
                </li>
                <li>
                  Logs and backups are retained securely for up to 90 days
                  before permanent deletion.
                </li>
              </ul>

              <h5>8. Security</h5>
              <p>
                We use industry-standard safeguards to protect your information,
                including:
              </p>
              <ul>
                <li>HTTPS encryption for all traffic.</li>
                <li>Hashed passwords using bcrypt.</li>
                <li>
                  Limited-access environment variables for sensitive keys.
                </li>
                <li>
                  Role-based access controls for developers and admins.
                </li>
              </ul>
              <p>
                However, no system is 100% secure. By using the Service, you
                acknowledge that transmission over the internet carries inherent
                risks.
              </p>

              <h5>9. Your Rights</h5>
              <p>
                Depending on your region, you may have rights to:
              </p>
              <ul>
                <li>Access or request a copy of your data.</li>
                <li>Correct or delete inaccurate information.</li>
                <li>
                  Request deletion of your account (&quot;Right to be
                  forgotten&quot;).
                </li>
                <li>Withdraw consent to AI recommendation features.</li>
                <li>
                  Request information on how we share data with third parties.
                </li>
              </ul>
              <p>
                To exercise these rights, contact us at{" "}
                <a href="mailto:bfflix@outlook.com">bfflix@outlook.com</a> with
                the subject line &quot;Privacy Request.&quot;
              </p>

              <h5>10. Children&apos;s Privacy</h5>
              <p>
                BFFlix is intended for users aged 13 and older. We do not
                knowingly collect information from children under 13. If you
                believe your child has created an account, please contact us
                immediately to delete their data.
              </p>

              <h5>11. International Data Transfers</h5>
              <p>
                Your information may be transferred and processed outside your
                country, including in the United States, where our servers and
                third-party providers operate. By using the Service, you consent
                to this transfer.
              </p>

              <h5>12. Changes to This Policy</h5>
              <p>
                We may update this Privacy Policy periodically. When we do, we
                will update the &quot;Last Updated&quot; date and post the new
                version on the Service. Your continued use of BFFlix after
                updates indicates your acceptance of the revised policy.
              </p>

              <h5>13. Contact Us</h5>
              <p>
                If you have any questions, concerns, or data requests, contact
                us at:
                <br />
                <strong>BFFLIX Privacy Team</strong>
                <br />
                <a href="mailto:bfflix@outlook.com">bfflix@outlook.com</a>
              </p>
            </div>
            <div className="auth-modal-actions">
              <button
                type="button"
                className="auth-secondary-button"
                onClick={() => setIsPrivacyModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
