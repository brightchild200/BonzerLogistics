# Code Conventions

This document outlines the coding standards, style preferences, and patterns to follow.

## TypeScript & Code Quality
- Strictly use TypeScript (`.ts`, `.tsx`) for all React Native code.
- Prefer explicit interface/type definitions (`lib/types.ts`) over inline object types or `any`.
- Run typecheck validation via `npm run typecheck` before pushing changes.

## Styling & Layout
- Prefer React Native's core elements (`View`, `Text`, `TouchableOpacity`, `ScrollView`) styled with standard styles objects.
- Ensure components adapt cleanly to various screen sizes (responsive layout).
- Use modern UI visual elements such as glassmorphism, linear gradients, and status-colored badges.

## State & Data Access
- Always perform database queries asynchronously using React hooks (`useEffect`, `useState`).
- Use the central supabase client from `lib/supabase.ts` for database interactions.
- Provide user-friendly loading indicators (`ActivityIndicator`) and clear error feedback when network operations fail.
