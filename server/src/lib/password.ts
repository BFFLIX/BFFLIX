
import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";
import zxcvbnCommon from "@zxcvbn-ts/language-common";
import zxcvbnEn from "@zxcvbn-ts/language-en";

/**
 * Initialize zxcvbn with English dictionaries. Do this once at import time.
 */
zxcvbnOptions.setOptions({
  translations: zxcvbnEn.translations,
  graphs: zxcvbnCommon.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommon.dictionary,
    ...zxcvbnEn.dictionary,
  },
});

type Context = { email?: string; name?: string };

export type PasswordCheck = {
  ok: boolean;
  score: number; // 0..4
  errors?: string[];
};

const MIN_LENGTH = Number(process.env.PW_MIN_LENGTH || 8);
const MIN_SCORE = Number(process.env.PW_MIN_SCORE || 3); // 0..4; 3 is “safe-ish”

/**
 * Validate password with policy + zxcvbn strength.
 * Returns { ok: boolean, score: 0..4, errors?: string[] }
 */
export function validatePassword(pw: string, ctx: Context = {}): PasswordCheck {
  const errors: string[] = [];

  // Basic policy
  if (!pw || pw.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters.`);
  }
  if (!/[A-Z]/.test(pw)) errors.push("Must include at least one uppercase letter.");
  if (!/[a-z]/.test(pw)) errors.push("Must include at least one lowercase letter.");
  if (!/[0-9]/.test(pw)) errors.push("Must include at least one number.");
  if (!/[^\w\s]/.test(pw)) errors.push("Must include at least one symbol.");

  // Disallow using email/local part or name chunks directly
  const lowered = pw.toLowerCase();
  if (ctx.email) {
    const local = String(ctx.email ?? "").split("@")[0]?.toLowerCase() ?? "";
    if (local.length >= 3 && lowered.includes(local)) {
      errors.push("Password must not contain your email/username.");
    }
  }
  if (ctx.name) {
    const parts = String(ctx.name).toLowerCase().split(/\s+/).filter(Boolean);
    for (const p of parts) {
      if (p.length >= 3 && lowered.includes(p)) {
        errors.push("Password must not contain your name.");
        break;
      }
    }
  }

  // Strength score via zxcvbn
  const guess = zxcvbn(pw, [ctx.email ?? "", ctx.name ?? ""]);
  const score = guess.score; // 0..4
  if (score < MIN_SCORE) {
    errors.push("Password is too weak. Try a longer passphrase with varied characters.");
  }

  return {
    ok: errors.length === 0,
    score: Number.isFinite(score) ? score : 0,
    errors: errors.length > 0 ? errors : [],
  };
}