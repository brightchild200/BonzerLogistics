# Technology Stack

This document details the tech stack used in the LogiSales Expo App.

## Frontend (Expo / React Native)
- **Framework**: [Expo SDK 54](https://expo.dev/) with [Expo Router v6](https://docs.expo.dev/router/introduction/) (file-based navigation).
- **Core Library**: React 19.1.0, React Native 0.81.5.
- **Language**: TypeScript (`tsconfig.json`).
- **Styling & UI**:
  - React Native Stylesheets
  - `expo-linear-gradient` for premium gradient designs
  - `expo-blur` for frosted-glass/blur effects
  - `@expo/vector-icons` and `lucide-react-native` for high-quality iconography
- **Maps & Geolocation**:
  - `expo-location` for device-level GPS/coordinate access
  - Leaflet (`leaflet`, `react-leaflet`) for web-based map renders
- **Data Persistence**: `@react-native-async-storage/async-storage` for local caching/session data.

## Backend & Database
- **Primary Database & Auth**: [Supabase](https://supabase.com/) (`@supabase/supabase-js` SDK) for user tables, auth, RLS, and transactional sales data.
- **API Server (Optional/Bypassed)**: Node.js with Express (`backend/` folder) containing routes for attendance, enquiries, follow-ups, and leads. (Note: Current frontend implementation communicates directly with Supabase).
