# ROADMAP

## Phase 01: Salesperson Module
Goal: Adapt the Expo UI to the existing Supabase sales schema so phase 1 runs on `users`, `sales_persons`, `sales_attendance`, `sales_followups`, `sales_followup_reminders`, and `notification_logs` without falling back to the legacy generic tables.

**Requirements:** [SP-01, SP-02, SP-03]
**Plans:** 3 plans

Plans:
- [ ] 01-01-PLAN.md — Align the shared schema contracts and tab shell to the salesperson module
- [ ] 01-02-PLAN.md — Rework the dashboard, attendance, and profile screens around `sales_persons` and `sales_attendance`
- [ ] 01-03-PLAN.md — Rework follow-ups, reminders, and notification audit views around the relational sales flow
