# TODO: ERP Authorization & Sales Hierarchy Refactor

## Progress Note
- Updated enquiry access and navigation checks to rely on `session.roles`.
- Expanded registration to cover the full role set instead of only admin and sales person.
- Left the remaining hierarchy, assignment, and quotation work in the checklist for later.

## 1. Database Schema & Verification
- [x] Verify `roles` and `user_roles` tables are fully populated in Supabase/PostgreSQL.
  - Required Roles: `admin`, `sales_manager`, `sales_person`, `pricing`, `customer_service`, `operations`, `accounts`.
- [x] Verify `sales_persons.manager_id` self-referencing relationship is set up for hierarchy reporting.
- [x] Add planned column `enquiries.assigned_to_user_id` (FK to `users.id`) in the database.
- [x] Set up future tables `quotations` and `quotation_items` containing:
  - `prepared_by_user_id` (FK to `users.id`)
  - `approved_by_user_id` (FK to `users.id`)
- [x] Ensure legacy `users.role` is kept intact temporarily for backwards compatibility/fallback.

---

## 2. Session & Auth Refactor
- [x] Implement query/hook to fetch logged-in user details along with their roles (via `user_roles` & `roles`) and their `salespersonId` (from `sales_persons` where `user_id` matches).
- [ ] Expose new session object structure:
  ```typescript
  {
    userId: number,
    authUserId: string,
    roles: string[],
    salespersonId: number | null
  }
  ```
- [x] Update auth context / state provider to store the new session format.

---

## 3. Permission Helpers & Navigation Refactor
- [x] Create permission helper file `lib/permissions.ts`:
  - Implement `hasRole(roles: string[], role: string): boolean`.
- [x] Refactor navigation menus to build dynamically based on `session.roles` instead of single `user.role`.
- [x] Replace all occurrences of `user.role === '...'` with helper calls:
  - e.g., `hasRole(session.roles, 'admin')` or `hasRole(session.roles, 'sales_manager')`.

---

## 4. Sales Manager Hierarchy Features
- [ ] Refactor Attendance module:
  - Allow users with `sales_manager` role to fetch and view attendance of all team members who have `manager_id` matching the manager's `salespersonId`.
- [ ] Refactor Customer Visits module (`sales_customer_visits`):
  - Filter and show visits in the manager dashboard where the visit's `sales_person_id` reports to the manager (via `sales_persons.manager_id`).
- [x] Refactor Enquiries & Quotations list/views:
  - Ensure managers can view all team enquiries/quotations.
- [ ] Refactor Revenue Dashboard to aggregate sales metrics based on the manager's hierarchy tree.

---

## 5. Enquiry Assignment & Quotation Workflow
- [ ] Implement enquiry assignment UI:
  - Allow salespersons to assign an enquiry to a user in the `pricing` or `customer_service` role.
- [ ] Implement Quotation Preparation and Approval flows:
  - Track `prepared_by_user_id` and `approved_by_user_id` on quotation creation/edit/approval.

---

## 6. Deprecation & Cleanup
- [x] Audit codebase for any remaining references to the legacy `users.role` field.
- [ ] Remove legacy `users.role` column from the DB schema and client models after confirming zero usage.
