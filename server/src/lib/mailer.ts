
// server/src/lib/mailer.ts
import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

/* --------------------------------- Types ---------------------------------- */
type SendOpts = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  replyTo?: string;
  /** Optional: tag sends for analytics (SendGrid categories) */
  category?: string;
  /** Optional: SendGrid ASM group id for unsubscribe management */
  asmGroupId?: number;
  /** Optional: key/value metadata that appears in SendGrid events */
  customArgs?: Record<string, string>;
};

let smtpTransporter: nodemailer.Transporter | null = null;

/* ------------------------------ From address ------------------------------ */
function fromAddress() {
  const name = process.env.FROM_NAME || "BFFlix";
  const email = process.env.FROM_EMAIL || "no-reply@bfflix.com";
  return { name, email, formatted: `${name} <${email}>` };
}

/* -------------------------- Transport selection --------------------------- */
function useSendGridAPI(): boolean {
  return !!process.env.SENDGRID_API_KEY;
}

/* ---------------------------- SendGrid (API) ------------------------------ */
function initSendGridIfNeeded() {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return;
  sgMail.setApiKey(apiKey);
  if (process.env.SENDGRID_HOST) {
    // Rarely used; only if you proxy API through custom domain
    // @ts-ignore - undocumented host override used by some enterprise setups
    sgMail.setClient({ host: process.env.SENDGRID_HOST });
  }
}

async function sendViaSendGridAPI(opts: SendOpts) {
  initSendGridIfNeeded();
  const from = fromAddress();

  const categories = [
    // project-wide default category
    ...(process.env.SENDGRID_CATEGORY ? [process.env.SENDGRID_CATEGORY] : []),
    // per-message override
    ...(opts.category ? [opts.category] : []),
  ];

  const asm =
    opts.asmGroupId != null
      ? { groupId: opts.asmGroupId }
      : process.env.SENDGRID_GROUP_ID
      ? { groupId: Number(process.env.SENDGRID_GROUP_ID) }
      : undefined;

  const msg: any = {
    to: opts.to,
    from: { email: from.email, name: from.name },
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? (opts.html ? toText(opts.html) : undefined),
    replyTo: opts.replyTo,
    categories: categories.length ? categories : undefined,
    asm,
    // Pass-through metadata for event webhooks (optional)
    customArgs: opts.customArgs,
    // You generally don't need headers with the Web API; keeping in case you rely on them
    headers: opts.headers,
  };

  const [resp] = await sgMail.send(msg, false); // single-send
  const messageId = resp?.headers?.["x-message-id"] || resp?.headers?.["x-message-id".toLowerCase()];
  return { messageId: Array.isArray(messageId) ? messageId[0] : messageId };
}

/* ------------------------------ SMTP (fallback) --------------------------- */
async function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;

  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP transport not configured. Missing SMTP_HOST/SMTP_USER/SMTP_PASS.");
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  if (port === 587) {
    smtpTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: 587,
      secure: false, // STARTTLS
      requireTLS: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  } else {
    smtpTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  return smtpTransporter;
}

async function sendViaSMTP(opts: SendOpts) {
  const t = await getSmtpTransporter();
  const from = fromAddress();

  const info = await t.sendMail({
    from: from.formatted,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? (opts.html ? toText(opts.html) : undefined),
    headers: opts.headers,
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
  });

  return { messageId: info.messageId };
}

/* ------------------------------ Public API -------------------------------- */
/** Low-level sender. Chooses SendGrid Web API when available, else SMTP. */
export async function sendEmail(opts: SendOpts) {
  if (useSendGridAPI()) {
    try {
      return await sendViaSendGridAPI(opts);
    } catch (e) {
      // Fallback to SMTP if API path fails and SMTP is configured
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return await sendViaSMTP(opts);
      }
      throw e;
    }
  }
  return sendViaSMTP(opts);
}

/* ------------------------------ HTML → text ------------------------------- */
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

/* ------------------------------- Templates -------------------------------- */
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

/* ------------------------------ High-level API ---------------------------- */
export async function sendWelcomeEmail(to: string, name?: string) {
  const html = welcomeHtml(name);
  const asm = process.env.SENDGRID_GROUP_ID ? Number(process.env.SENDGRID_GROUP_ID) : undefined;

  return sendEmail({
    to,
    subject: "Welcome to BFFlix 🎬",
    html,
    category: "welcome",
    ...(asm != null ? { asmGroupId: asm } : {}),
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, name?: string) {
  const html = resetHtml(resetUrl, name);
  const asm = process.env.SENDGRID_GROUP_ID ? Number(process.env.SENDGRID_GROUP_ID) : undefined;

  return sendEmail({
    to,
    subject: "Reset your BFFlix password",
    html,
    category: "password_reset",
    ...(asm != null ? { asmGroupId: asm } : {}),
  });
}
