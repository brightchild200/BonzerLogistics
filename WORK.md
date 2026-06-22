# ERP Authorization & Sales Hierarchy Refactor

## Current Situation

The ERP originally used:

```text
users.role
```

which allowed only one role per user.

We have now migrated to a multi-role architecture.

---

## Database Changes Completed

### 1. Added Supabase Auth Mapping

The `users` table contains:

```sql
auth_user_id UUID
```

which stores the corresponding Supabase Auth user UUID.

Relationship:

```text
auth.users
    ↓
users.auth_user_id
```

All authentication is now based on:

```sql
auth.uid()
```

mapped through:

```sql
users.auth_user_id
```

---

### 2. Created Roles Table

```sql
roles
```

Stores all system roles.

Examples:

```text
admin
sales_manager
sales_person
pricing
cs
operations
accounts
```

---

### 3. Created User Roles Table

```sql
user_roles
```

Relationship:

```text
users
   ↔
user_roles
   ↔
roles
```

This allows:

```text
One User → Multiple Roles
```

Examples:

```text
Yogini
    sales_person
    sales_manager

Riya
    admin
    pricing
    cs
```

---

### 4. Added Sales Hierarchy

Added:

```sql
sales_persons.manager_id
```

Self-referencing foreign key:

```text
sales_persons
      ↓
sales_persons
```

Example:

```text
YOGINI PARAB
    ↓
RiyaSP
```

Meaning:

```text
RiyaSP reports to Yogini
```

This hierarchy is independent of roles.

Role answers:

"What permissions does the user have?"

Manager hierarchy answers:

"Who reports to whom?"

Both systems must coexist.

---

## Project Refactor Required

### Remove Role-Based Logic

Replace all usages of:

```ts
user.role
```

Examples:

```ts
user.role === 'admin'
user.role === 'sales_person'
```

These should no longer be used.

---

### Session Structure

When a user logs in:

Fetch:

```text
users
user_roles
roles
sales_persons
```

Build session object:

```ts
{
  userId: number,
  authUserId: string,
  roles: string[],
  salespersonId: number | null
}
```

Example:

```ts
{
  userId: 14,
  roles: ['sales_person', 'sales_manager'],
  salespersonId: 1
}
```

---

### Create Permission Helper

Create:

```text
lib/permissions.ts
```

Example:

```ts
export const hasRole = (
  roles: string[],
  role: string
) => roles.includes(role);
```

Usage:

```ts
hasRole(session.roles, 'admin')
hasRole(session.roles, 'pricing')
hasRole(session.roles, 'sales_manager')
```

---

### Navigation Refactor

Replace:

```ts
if (user.role === 'admin')
```

with:

```ts
if (hasRole(session.roles, 'admin'))
```

Users may have multiple roles.

Menus should be built dynamically from assigned roles.

Example:

```text
pricing
cs
```

shows both Pricing and CS functionality.

---

### Sales Manager Features

Managers are determined using:

```sql
sales_persons.manager_id
```

not role assignment alone.

Example:

```sql
SELECT *
FROM sales_persons
WHERE manager_id = :managerSalespersonId
```

This returns all team members reporting to the manager.

Future modules should use this hierarchy for:

* Team attendance
* Team customer visits
* Team enquiries
* Team quotations
* Team revenue dashboards

---

### Customer Visit Module

Future table:

```sql
sales_customer_visits
```

Manager views should filter visits through:

```sql
sales_persons.manager_id
```

allowing managers to see activities of their team.

---

### Enquiry Assignment Workflow

Planned field:

```sql
enquiries.assigned_to_user_id
```

Workflow:

```text
Sales Person
      ↓
Creates Enquiry
      ↓
Assigns Pricing / CS User
      ↓
Quotation Preparation
```

The enquiry owner and quotation creator are separate concepts.

---

### Quotation Module

Future tables:

```text
quotations
quotation_items
```

Store:

```text
prepared_by_user_id
approved_by_user_id
```

A quotation may be prepared by:

* Pricing
* CS
* Admin

depending on assignment.

---

## Important Rule

Do not delete the old:

```sql
users.role
```

column immediately.

Keep it temporarily during migration.

Only remove it after all screens, APIs, RLS policies, and navigation logic are fully migrated to:

```text
roles
user_roles
```
