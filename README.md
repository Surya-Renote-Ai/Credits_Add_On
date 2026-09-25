# ReNote Credits Console

A superadmin-only app (React Native + Expo, runs on web, Android and iOS) that looks up a
user's credit balance by email and adds credits to it. It is a thin client over
core-api:

| Screen | API |
|---|---|
| Sign in | `POST /v1/login` (then the token must carry the `superadmin` realm role) |
| Get balance | `POST /v1/admin/credits/balance` `{email}` |
| Add credits | `POST /v1/admin/credits/add` `{email, credits, reason?}` |
| Session refresh | `POST /v2/refresh-token` (automatic, once, on a 401) |

The backend enforces every rule. The app repeats the credit-amount checks
(positive, at most 2 decimals, at most 1,000,000) only to show errors before sending.

## Run locally

1. Start core-api on port **8001** (8000 is taken locally by the authforge container):

   ```bash
   cd ../core-api
   uvicorn app.main:app --host 0.0.0.0 --port 8001
   ```

2. Start the console on port **5173**, which core-api's `ALLOWED_ORIGINS` already allows:

   ```bash
   npm install
   npm run web
   ```

   Open http://localhost:5173 (use `localhost`, not `127.0.0.1`, or CORS will refuse it).

## Pointing at another backend

Create a `.env` file (see `.env.example`):

```
EXPO_PUBLIC_API_BASE=http://localhost:8001
```

On an Android emulator use `http://10.0.2.2:8001`. Restart `npm run web` after changing it.

## Notes

- The session is held in memory only. Reloading or closing the app signs you out, so
  a superadmin token is never left in storage.
- Credits added here go into the user's add-on bucket. They survive the monthly reset
  and appear on the user's credits screen as "Bonus credits". Each grant writes a
  `credit_transactions` row and an `admin_audit_log` entry with the reason.
- `npm run typecheck` runs the TypeScript check.

## Deploy (Docker)

The web app is built into static files and served by nginx on port **80**.

```bash
docker build \
  --build-arg EXPO_PUBLIC_API_BASE=https://<core-api-host> \
  -t credits-addon:1.0.0 .

docker run -d -p 8080:80 credits-addon:1.0.0
```

- `EXPO_PUBLIC_API_BASE` is baked into the bundle **at build time**. Setting it as a
  runtime env var has no effect, so each environment (dev / staging / prod) needs its
  own image build. The build fails if it is not set.
- core-api's `ALLOWED_ORIGINS` must include the URL this app is served from, or the
  browser will block every request (CORS).
- Health check: `GET /healthz` returns `200 ok`.
- Serve it over HTTPS; it sends superadmin credentials.
