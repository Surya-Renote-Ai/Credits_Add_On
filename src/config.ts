// Where core-api is running. Override with EXPO_PUBLIC_API_BASE in a .env file
// (no trailing slash), e.g. EXPO_PUBLIC_API_BASE=https://api.example.com
//
// The default is port 8001 because 8000 (uvicorn's default) is taken locally by
// the authforge container. On an Android emulator, localhost is the emulator
// itself; use http://10.0.2.2:8001 instead.
export const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:8001').replace(/\/+$/, '');

// Mirrors the backend's AdminCreditAddRequest limits so a bad amount is caught
// before the request; the server still validates everything.
export const MAX_CREDITS = 1_000_000;
