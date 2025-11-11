
// server/src/lib/mailer.ts
import nodemailer from "nodemailer";

type SendOpts = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  replyTo?: string;
};

let transporter: nodemailer.Transporter | null = null;

function fromAddress() {
  const name = process.env.FROM_NAME || "BFFlix";
  const email = process.env.FROM_EMAIL || "no-reply@bfflix.com";
  return `${name} <${email}>`;
}

async function getTransporter() {
  if (transporter) return transporter;

  // Strict: require SMTP in all environments
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP transport not configured. Missing SMTP_HOST/SMTP_USER/SMTP_PASS.");
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    pool: true,               // enable connection pooling
    maxConnections: 5,        // tweak as needed
    maxMessages: 100,         // tweak as needed
  });

  return transporter;
}

function toText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(h\d|p|div|li|br)>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Low-level sender (SMTP only). Automatically injects SES config-set header if present. */
export async function sendEmail({ to, subject, html, text, headers, replyTo }: SendOpts) {
  const t = await getTransporter();

  // Auto-add SES configuration set header so CloudWatch alarms work.
  const confSet = process.env.SES_CONFIGURATION_SET; // e.g. "bfflix-prod"
  const finalHeaders: Record<string, string> = {
    ...(headers || {}),
    ...(confSet ? { "X-SES-CONFIGURATION-SET": confSet } : {}),
  };

  const info = await t.sendMail({
    from: fromAddress(),
    to,
    subject,
    html,
    text: text ?? (html ? toText(html) : undefined),
    headers: finalHeaders,
    ...(replyTo ? { replyTo } : {}),
  });

  return { messageId: info.messageId };
}

/* -------------------------------------------------------------------------- */
/*                               Email Templates                              */
/* -------------------------------------------------------------------------- */

const appBase = process.env.APP_BASE_URL || "http://localhost:5173";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function welcomeHtml(name?: string) {
  const who = name ? `, ${escapeHtml(name)}` : "";
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.45;color:#111;background:#fff;padding:0 16px">
    <div style="max-width:560px;margin:32px auto;border:1px solid #eee;border-radius:10px;overflow:hidden">
      <div style="padding:20px 24px;background:#0b0f19;color:#fff">
        <h1 style="margin:0;font-size:20px">Welcome to BFFlix${who}!</h1>
      </div>
      <div style="padding:24px">
        <p style="margin:0 0 12px">We’re excited to have you. Share what you’re watching, discover titles through your circles, and get smart recommendations.</p>
        <p style="margin:0 0 16px">Get started:</p>
        <p style="margin:0 0 20px">
          <a href="${appBase}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px">Open BFFlix</a>
        </p>
        <p style="margin:0;color:#666">If you didn’t create this account, you can ignore this email.</p>
      </div>
    </div>
    <p style="text-align:center;color:#888;font-size:12px;margin:16px 0">© ${new Date().getFullYear()} BFFlix</p>
  </div>
  `.trim();
}

function resetHtml(resetUrl: string, name?: string) {
  const who = name ? `, ${escapeHtml(name)}` : "";
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.45;color:#111;background:#fff;padding:0 16px">
    <div style="max-width:560px;margin:32px auto;border:1px solid #eee;border-radius:10px;overflow:hidden">
      <div style="padding:20px 24px;background:#0b0f19;color:#fff">
        <h1 style="margin:0;font-size:20px">Reset your BFFlix password${who}</h1>
      </div>
      <div style="padding:24px">
        <p style="margin:0 0 12px">We received a request to reset your password.</p>
        <p style="margin:0 0 16px">This link expires in 30 minutes.</p>
        <p style="margin:0 0 20px">
          <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px">Reset Password</a>
        </p>
        <p style="margin:0;color:#666">If you didn’t request this, you can ignore this email.</p>
      </div>
    </div>
    <p style="text-align:center;color:#888;font-size:12px;margin:16px 0">© ${new Date().getFullYear()} BFFlix</p>
  </div>
  `.trim();
}

/* -------------------------------------------------------------------------- */
/*                           High-level convenience API                       */
/* -------------------------------------------------------------------------- */

export async function sendWelcomeEmail(to: string, name?: string) {
  const html = welcomeHtml(name);
  return sendEmail({
    to,
    subject: "Welcome to BFFlix 🎬",
    html,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, name?: string) {
  const html = resetHtml(resetUrl, name);
  return sendEmail({
    to,
    subject: "Reset your BFFlix password",
    html,
  });
}
