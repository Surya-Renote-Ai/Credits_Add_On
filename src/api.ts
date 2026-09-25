import { API_BASE } from './config';

export type Session = {
  accessToken: string;
  refreshToken: string;
  email: string;
};

export type UserInfo = { user_id: string; email: string; full_name: string | null };

export type Pack = {
  name: string;
  credits: number;
  remaining: number;
  used: number;
  purchased_at: string | null;
  source: string;
};

export type Balance = {
  user: UserInfo;
  balance: number;
  plan: string;
  monthly_credits: number;
  next_refill_at: string | null;
  plan_renews_at: string | null;
  monthly?: { total: number; remaining: number; used: number };
  addon?: { total: number; remaining: number; used: number; packs: Pack[] };
};

export type AddResult = {
  user: UserInfo;
  credits_added: number;
  balance_before: number;
  balance_after: number;
  reason: string | null;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// core-api answers in three shapes: its own envelope {error: {message, details}},
// FastAPI's validation list {detail: [{msg, loc}]}, and a plain {detail: "..."}
// from HTTPException (e.g. the superadmin role check). All become one message.
function messageFrom(status: number, body: any): string {
  const err = body?.error;
  if (err && typeof err === 'object') {
    return err.message || err.details || err.messageKey || `Request failed (${status})`;
  }
  const detail = body?.detail;
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((d: any) => {
        const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : '';
        return field && field !== 'body' ? `${field}: ${d.msg}` : d.msg;
      })
      .join('\n');
  }
  if (typeof detail === 'string') return detail;
  if (typeof detail === 'object' && detail) return detail.message || detail.details || JSON.stringify(detail);
  return `Request failed (${status})`;
}

async function call(path: string, init: RequestInit): Promise<any> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError(0, `Cannot reach the server at ${API_BASE}. Is core-api running?`);
  }
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON body; the status alone decides.
  }
  if (!res.ok || body?.error) {
    const status = body?.error?.status || res.status;
    throw new ApiError(status, messageFrom(status, body));
  }
  return body;
}

const json = { 'Content-Type': 'application/json' };

export async function login(email: string, password: string) {
  const body = await call('/v1/login', {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ email, password }),
  });
  const data = body?.data || {};
  if (!data.accessToken) throw new ApiError(500, 'Login succeeded but no token was returned.');
  return { accessToken: data.accessToken as string, refreshToken: (data.refreshToken || '') as string };
}

export async function refresh(refreshToken: string) {
  const body = await call('/v2/refresh-token', {
    method: 'POST',
    headers: { 'refresh-token': refreshToken },
  });
  return { accessToken: body.access_token as string, refreshToken: (body.refresh_token || refreshToken) as string };
}

// Admin calls go through here: on a 401 the access token is refreshed once and
// the call retried. `onSession` hands the new tokens back to the app;
// `onExpired` signs the admin out when the refresh itself fails.
export type AuthHooks = {
  session: Session;
  onSession: (s: Session) => void;
  onExpired: () => void;
};

async function authed(path: string, payload: object, hooks: AuthHooks): Promise<any> {
  const send = (token: string) =>
    call(path, { method: 'POST', headers: { ...json, token }, body: JSON.stringify(payload) });
  try {
    return await send(hooks.session.accessToken);
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401 || !hooks.session.refreshToken) throw e;
  }
  let next: Session;
  try {
    const t = await refresh(hooks.session.refreshToken);
    next = { ...hooks.session, ...t };
  } catch {
    hooks.onExpired();
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  }
  hooks.onSession(next);
  return send(next.accessToken);
}

export async function getBalance(email: string, hooks: AuthHooks): Promise<Balance> {
  const body = await authed('/v1/admin/credits/balance', { email }, hooks);
  return body.data as Balance;
}

export async function addCredits(
  email: string,
  credits: string,
  reason: string,
  hooks: AuthHooks,
): Promise<AddResult> {
  // Sent as a string so a decimal like 0.1 reaches the server's Decimal field
  // exactly, without a float round-trip.
  const payload: Record<string, string> = { email, credits };
  if (reason) payload.reason = reason;
  const body = await authed('/v1/admin/credits/add', payload, hooks);
  return body.data as AddResult;
}
