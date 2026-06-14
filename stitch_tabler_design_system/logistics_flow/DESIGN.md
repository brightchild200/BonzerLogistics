---
name: Logistics Flow
colors:
  surface: '#f7f9fc'
  surface-dim: '#d8dadd'
  surface-bright: '#f7f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f7'
  surface-container: '#eceef1'
  surface-container-high: '#e6e8eb'
  surface-container-highest: '#e0e3e6'
  on-surface: '#191c1e'
  on-surface-variant: '#424752'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f4'
  outline: '#727783'
  outline-variant: '#c2c6d4'
  surface-tint: '#005db5'
  primary: '#0052a1'
  on-primary: '#ffffff'
  primary-container: '#206bc4'
  on-primary-container: '#e7edff'
  inverse-primary: '#a8c8ff'
  secondary: '#00629d'
  on-secondary: '#ffffff'
  secondary-container: '#61b4fd'
  on-secondary-container: '#004470'
  tertiary: '#495369'
  on-tertiary: '#ffffff'
  tertiary-container: '#616b82'
  on-tertiary-container: '#e8edff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#a8c8ff'
  on-primary-fixed: '#001b3d'
  on-primary-fixed-variant: '#00468b'
  secondary-fixed: '#cfe5ff'
  secondary-fixed-dim: '#99cbff'
  on-secondary-fixed: '#001d34'
  on-secondary-fixed-variant: '#004a78'
  tertiary-fixed: '#d8e2fd'
  tertiary-fixed-dim: '#bcc6e1'
  on-tertiary-fixed: '#111b2f'
  on-tertiary-fixed-variant: '#3d475c'
  background: '#f7f9fc'
  on-background: '#191c1e'
  surface-variant: '#e0e3e6'
  slate-text: '#475569'
  border-subtle: '#E2E8F0'
  status-new: '#206BC4'
  status-contacted: '#6366F1'
  status-followup: '#F59E0B'
  status-won: '#10B981'
  status-lost: '#EF4444'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  mono-data:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar-width: 260px
  gutter: 1.5rem
  container-padding: 2rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style

This design system is built for high-utility logistics management, prioritizing clarity, efficiency, and professional trust. The aesthetic is **Corporate / Modern**, drawing heavily from the structured, data-driven layouts of the Tabler admin template and enterprise CRM platforms like HubSpot.

The visual narrative centers on "Precision at Scale." It utilizes a clean, airy interface with a strong emphasis on information hierarchy to ensure that field sales executives can navigate complex lead data and GPS-tracking requirements with zero friction. The style favors utility over decoration, using subtle borders and a refined palette to keep the focus on actionable metrics and status tracking. 

Key attributes:
- **Functional Density:** Optimized for data-heavy CRM tables and activity timelines.
- **Reliable Utility:** A "Blue and Slate" foundation that evokes stability and technological competence.
- **Systematic Structure:** High reliance on grid-based alignment and consistent component scaling to accommodate future logistics modules.

## Colors

The palette is anchored by **Tabler Blue** (`#206BC4`), serving as the primary driver for actions and brand identity. A secondary, lighter blue provides flexibility for accents and hover states, while **Deep Slate** (`#1D273B`) provides high-contrast grounding for sidebars and primary headings.

The neutral background (`#F6F8FB`) is specifically chosen to reduce eye strain during long-form data entry while allowing white cards to "pop" via elevation. 

**Functional Status Colors:**
- **New:** Primary blue for fresh opportunities.
- **Contacted:** Indigo for active engagement.
- **Follow-Up:** Amber to signal required attention/scheduling.
- **Won:** Emerald for successful conversions.
- **Lost:** Rose for closed-unconverted leads.

## Typography

This system uses **Inter** exclusively to leverage its exceptional legibility in data-heavy environments. The typeface is optimized for screen performance, particularly for the small font sizes required in dense tables and GPS coordinate displays.

**Hierarchy Guidance:**
- **Headlines:** Use Bold (700) for page titles and Semi-Bold (600) for card titles.
- **Labels:** Small, uppercase labels with tracked-out letter spacing should be used for section headers in the sidebar and "Future Modules" markers.
- **GPS Data:** Coordinate data (Latitude/Longitude) should use the `mono-data` style to ensure numeric clarity and alignment.
- **Mobile Adjustments:** Page titles should scale down to `headline-md` on mobile devices to preserve horizontal space.

## Layout & Spacing

The layout utilizes a **Fixed Sidebar / Fluid Content** model for desktop and a **Mobile-First Bottom-Nav** model for the field app.

**Desktop Layout:**
- **Sidebar:** A 260px fixed sidebar on the left. The "Future Modules" section is separated by a horizontal divider and uses a 60% opacity for its icons and labels to indicate inactive states.
- **Grid:** A 12-column grid with a 1.5rem gutter. Dashboard widgets should typically span 3 or 4 columns, while the Lead List table spans the full 12.

**Mobile Layout:**
- Transition to a single-column stack.
- Implement a persistent bottom navigation bar (Home, Leads, Visits, Attendance, Profile).
- Use `container-padding: 1rem` on mobile to maximize screen real estate.

**Rhythm:**
A base unit of 4px is used for all spacing. Standard gaps between form elements are 1rem (`stack-md`), while gaps between major dashboard sections are 2rem (`stack-lg`).

## Elevation & Depth

To maintain a clean and professional look, the design system avoids heavy shadows, instead using **Low-Contrast Outlines** and **Tonal Layers**.

- **Level 0 (Background):** Used for the main app canvas (`#F6F8FB`).
- **Level 1 (Cards/Surfaces):** Pure white background (`#FFFFFF`) with a 1px solid border (`#E2E8F0`). This is the primary container for all content.
- **Level 2 (Dropdowns/Modals):** Pure white with a subtle, diffused shadow (0px 4px 12px rgba(0, 0, 0, 0.05)) to suggest it is floating above the primary surface.
- **Sidebar Depth:** The sidebar uses a tonal shift (`#1D273B` for dark mode variant or a slightly cooler white for light mode) to distinguish the navigation from the workspace.

For activity timelines, use a vertical "hairline" (1px solid) to connect nodes, rather than shadows, to maintain a flat, architectural feel.

## Shapes

The design system adopts a **Soft (0.25rem)** roundedness approach. This provides a modern feel without the excessive playfulness of pill-shaped elements, maintaining a professional "tool-like" aesthetic.

- **Primary Components:** Buttons, Input Fields, and Status Badges use a 0.25rem (4px) radius.
- **Containers:** Large dashboard cards use a 0.5rem (8px) radius to create a softer boundary between distinct data modules.
- **Interactive States:** Hover states on list items should use the same 0.25rem radius for the highlight background.

## Components

### Buttons & Inputs
- **Primary Action:** Solid Blue (`#206BC4`) with white text.
- **Quick Action (Dashboard):** Outlined buttons with 1px primary blue border and icon prefix.
- **Inputs:** 1px solid slate border, height 40px, with focused state using a 2px blue ring (20% opacity).

### Status Badges
Status badges (New, Won, Lost, etc.) use a "subtle fill" style: a light tinted background (10% opacity of the status color) with high-contrast text of the same hue. This ensures visibility without being visually overwhelming in large tables.

### Data Tables
- Header background: `#F8FAFC`.
- Row height: 52px.
- Use horizontal dividers only; remove vertical borders to enhance readability.

### Timelines (Leads & Visits)
- Vertical layout with a solid grey hairline.
- Visit logs should include a "GPS Metadata" block: a small grey chip containing coordinates and a "View on Map" text link.

### GPS & Location Cards
For Attendance and Visit logging, cards should feature a small static map preview at the top, followed by the formatted address and a timestamp. Coordinates (Lat/Long) should be displayed in `mono-data` typography to signify technical accuracy.

### Sidebar (Future Modules)
Items in the "Future Modules" section must use a `greyscale(1)` filter on icons and a text color of `#94A3B8`. Upon hover, show a "Coming Soon" tooltip to manage salesperson expectations without cluttering the UI.