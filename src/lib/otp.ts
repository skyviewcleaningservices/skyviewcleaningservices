import crypto from 'crypto';

export const OTP_EXPIRY_MINUTES = 10;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;

export function generateOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

// SHA-256 is sufficient here (not bcrypt) — the code is short-lived, single-use,
// and attempt-limited, not a long-term credential.
export function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}
