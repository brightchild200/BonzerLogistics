# TODO - Attendance backend alignment

backend folder is just example and not the actual one 

- [x] Update backend `backend/routes/attendance.js` to use `sales_attendance` schema (sales_person_id, attendance_date, check_in_at/check_out_at, check_in_lat/check_in_lng, check_out_lat/check_out_lng, etc.).
- [ ] Update frontend to call backend `/api/attendance/*` instead of direct Supabase calls (optional, but recommended to make backend authoritative).

- [ ] Decide how to map `req.user.id` -> `sales_person_id` (use `req.user.id` for now unless a different mapping exists).
- [ ] Fix/implement missing auth middleware `backend/middleware/auth.js` and auth route `backend/routes/auth.js` so protected endpoints work.

- [ ] Add/adjust request payloads for check-in/check-out based on existing frontend payload.
- [ ] Run backend tests (start server) and sanity-check with a manual curl/postman call.
- [ ] Optionally update frontend to call backend `/api/attendance/*` instead of direct Supabase calls (if you want backend as single source of truth).

