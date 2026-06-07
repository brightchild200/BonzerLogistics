# Phase 01-01 Summary

Implemented the shared salesperson contract layer and retitled the tab shell so the app now reads as a salesperson module instead of a generic CRM demo.

## What changed

- Replaced the old UI contract exports in `lib/types.ts` with schema-backed salesperson row aliases and card/view-model types.
- Added `lib/salesperson-mappers.ts` for shared formatting, status badges, initials, and row-to-card mappers.
- Added `lib/salesperson-session.ts` to resolve the current auth user to the matching `users` and `sales_persons` rows.
- Updated `app/(tabs)/_layout.tsx` so the tab bar uses salesperson-oriented labels like `Team` and `Alerts`.

## Notes

- The client should use the Supabase URL and anon key only. The secret key should stay server-side and is not needed in the Expo app.
- This phase creates the schema-aware foundation for the later screen rewrites.
