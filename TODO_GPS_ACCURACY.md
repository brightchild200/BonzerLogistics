# TODO - GPS accuracy improvements (Attendance)

## Goal
Increase real GPS accuracy and prevent storing invalid/low-quality locations for Attendance check-in/check-out.

---

## 1) Fix frontend GPS capture in `app/(tabs)/attendance.tsx`
- [ ] Add a small delay before taking the first fix (e.g., 2–3 seconds after screen action / before the first GPS request).
- [x] Switch location accuracy mode to the best available:
  - Native (expo-location): `Accuracy.BestForNavigation` or `Accuracy.Highest`.
- [ ] Take multiple samples (recommended: 3 samples over ~10–15 seconds).
  - Choose the reading with the **lowest** `accuracy` (preferred) or filter out outliers before averaging.
- [x] Add an accuracy threshold gate before saving (reject if accuracy too poor).
  - Current threshold in code: `MAX_ACCEPTABLE_ACCURACY_METERS = 50`.
- [x] Never persist `(0,0)`:
  - If lat/lng are `(0,0)` or invalid, block check-in/out.
- [x] Only reverse-geocode after a valid/accepted fix.
- [ ] Update logs (`dbg/warn/err`) to include:
  - sample count
  - chosen accuracy
  - rejected accuracies (optional in dev)

---

## 2) Fix backend validation in `backend/routes/attendance.js`
- [x] Reject or flag invalid coordinates:
  - If `check_in_lat/check_in_lng` (or check_out) are `(0,0)`.
- [x] Enforce accuracy threshold on server:
  - Reject if `check_in_accuracy_meters` / `check_out_accuracy_meters` `> 50`.
- [x] Ensure check-out update also validates accuracy if provided.

---

## 3) Confirm DB fields used by frontend match the schema
- [ ] Ensure frontend column mapping matches the actual table fields used by the backend (names for lat/lng, accuracy, address/site).
- [ ] Confirm the app stores into the same fields that mapSalesAttendance expects.

---

## 4) Manual test checklist
- [ ] Test outdoors (open sky) and verify reported accuracy is small (e.g., < 20m).
- [ ] Test near window in an office/building.
- [ ] Test inside urban canyon / street with buildings.
- [ ] Test with location permission denied.
- [ ] Test rapid check-in → check-out.
- [ ] Verify that rejected/invalid fixes are not saved as `0,0`.

---

## 5) Regression checks
- [ ] Ensure UI still loads today/history correctly.
- [ ] Ensure map marker updates with valid coordinates.
- [ ] Ensure check-in duplicates still behave correctly.

---

## Acceptance criteria
- [x] No attendance record should be saved with `(0,0)` as lat/lng.
- [x] Low-quality GPS fixes should be rejected (threshold = 50m).
- [ ] Repeated samples should reduce coordinate drift vs single-shot capture (not done yet).

