# Integrations Overview

This document details how different components and external services integrate with each other in the LogiSales system.

## 1. Supabase Integration
- The frontend connects directly to Supabase via `lib/supabase.ts` using the environment variables `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Authenticates users using Supabase Auth.
- Performs direct CRUD operations on the following database tables:
  - `users`
  - `sales_persons`
  - `sales_attendance`
  - `sales_followups`
  - `enquiries`

## 2. Express Backend API (Underutilized)
- Code located in the `backend/` directory provides a separate REST API framework built with Express.
- Features route modules (`routes/attendance.js`, `routes/enquiries.js`, `routes/followups.js`, `routes/leads.js`) interacting with Supabase via Node.
- Currently, the frontend bypasses this Express layer, resulting in direct frontend-to-database communication.

## 3. Geolocation & Map Rendering
- **Device GPS**: Queries current coordinates via `expo-location` on check-in/check-out.
- **Map Visuals**: Uses custom React Native components (`components/LocationIQMap.tsx` and `components/WebMap.tsx`) and Leaflet to show maps for web/mobile browsers.
