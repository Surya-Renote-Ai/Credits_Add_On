import { MAX_CREDITS } from './config';

// Reads the JWT payload WITHOUT verifying it. That is fine here: it only decides
// what the UI shows. Every admin endpoint checks the superadmin role itself.
export function decodeJwt(token: string): Record<string, any> | null {
  try {
    const part = token.split('.')[1];
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const text = decodeURIComponent(
      Array.from(atob(padded), (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
    );
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function isSuperadmin(token: string): boolean {
  const roles = decodeJwt(token)?.realm_access?.roles;
  return Array.isArray(roles) && roles.includes('superadmin');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailError(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Enter an email address.';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address.';
  return null;
}

// Same rules as the backend: a positive number, at most two decimal places,
// no more than MAX_CREDITS. Digits and one dot only, so "-5", "1e3", "abc"
// and "Infinity" are all refused.
export function creditsError(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Enter the number of credits to add.';
  if (v.startsWith('-')) return 'Credits cannot be negative.';
  if (!/^\d+(\.\d+)?$/.test(v)) return 'Credits must be a number, e.g. 100 or 25.50.';
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return 'Use at most two decimal places.';
  const n = Number(v);
  if (n <= 0) return 'Credits must be greater than 0.';
  if (n > MAX_CREDITS) return `You can add at most ${MAX_CREDITS.toLocaleString()} credits at a time.`;
  return null;
}
