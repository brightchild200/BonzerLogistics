# Architectural Concerns & Risks

This document highlights technical debt, structural concerns, and risks present in the codebase.

## 1. Frontend-Bypass of Express API
- **Issue**: The Express API layer located under `backend/` is fully bypassed by the React Native screens which connect directly to Supabase.
- **Risk**: Enforcing complex server-side rules (like check-in GPS validation, time thresholds, or duplicate checks) has to be done client-side or via Supabase triggers/RLS. Client-side checks are easily bypassed.
- **Remediation**: Transition the critical endpoints (e.g., check-in, check-out, status confirmations) to use the Express backend or Supabase Edge Functions.

## 2. Identity Synchronization
- **Issue**: The app links Supabase Auth accounts with a custom `users` and `sales_persons` table.
- **Risk**: Role mismatches or failure to link a salesperson record correctly leads to app errors (e.g., "no salesperson linked to this account").
- **Remediation**: Enforce a rigid check at signup/login to auto-populate salesperson details and associate them correctly with the Supabase authenticated user.

## 3. Web vs Native GPS Parity
- **Issue**: Web mapping is handled via Leaflet (`react-leaflet`), whereas native GPS checks use `expo-location`.
- **Risk**: Accuracy values and location details might vary significantly between browser geolocating and native GPS hardware.
