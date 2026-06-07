# Debug Session: add-new-user-auth

**Status:** investigating  
**Started:** 2026-06-06  
**Issue:** Cannot add a new user and login to test the website

## Symptoms (from user)
- **Expected:** Register a new user, then login and access the app
- **Actual:** Unknown — user reports issue with adding new user
- **Errors:** Unknown
- **Reproduction:** Register → attempt login

## Hypotheses

| ID | Hypothesis | Status |
|----|-----------|--------|
| A | Supabase env vars (`EXPO_PUBLIC_SUPABASE_URL` / `ANON_KEY`) missing at runtime | pending |
| B | Email confirmation required — signUp succeeds but no session created | pending |
| C | Auth guard race — register navigates before session is set, root layout redirects to login | pending |
| D | Supabase signUp returns an API/database error (trigger, RLS, duplicate email) | pending |
| E | Login fails after registration (unconfirmed email, wrong credentials) | pending |

## Instrumentation
- `register.tsx` — signUp request/response, env check
- `login.tsx` — signIn request/response
- `app/_layout.tsx` — session state, auth redirect decisions

## Analysis (code-path evidence — logs unavailable on first run)

**Likely root cause:** Register navigated to `/(tabs)` whenever `signUp` returned no error, even when **no session** was created (Supabase email confirmation). Root auth guard then immediately redirected back to login.

**Fix applied:**
- Only navigate to tabs when a session exists
- Auto sign-in after signup when session missing (covers dev mode with confirmation disabled)
- Clear message + redirect to login when email confirmation is required
- Ensure `profiles` row is created after successful auth

## Verification needed
Run post-fix reproduction with `npm run dev` (not static `dist/`).
