# Directory Structure

This document details the layout of directories and key files across the workspace.

```text
logistics_project/
├── .planning/               # GSD milestones, phases, and plans
│   ├── codebase/            # Codebase mapping documentation (this folder)
│   └── ROADMAP.md           # High-level project implementation phases
├── app/                     # Expo Router file-based screens
│   ├── (auth)/              # Login and Register pages
│   ├── (tabs)/              # Core module screens (dashboard, attendance, etc.)
│   ├── enquiry/             # Enquiry list/details dynamic routes
│   ├── _layout.tsx          # Root router layout
│   └── profile.tsx          # User profile view
├── assets/                  # Fonts, images, and static assets
├── backend/                 # Express backend API (Supabase integration server)
│   ├── db/                  # DB connection pool (Supabase Client for Node)
│   ├── middleware/          # Request validation / auth middleware
│   └── routes/              # REST endpoints (attendance, enquiries, leads)
├── components/              # Shared UI components (Badge, MetricCard, Maps, Modals)
├── hooks/                   # Custom React Hooks
├── lib/                     # Client configs, schema files, mappers, and utilities
└── tsconfig.json            # TypeScript configuration
```
