# LogiSales Expo App

LogiSales is an advanced Expo Router mobile and web application designed for sales and logistics workflows. The application integrates with a Supabase backend to streamline sales rep attendance, enquiry pipelines, client leads, and follow-up activities.

---

## 🚀 Key Features

### 🔐 1. Authentication & Identity Management
- **Role-Based Routing**: Clean login and registration workflows supporting multiple roles (e.g., `admin`, `sales_person`).
- **Authorization Flow**: Supports both username and email-based login credentials with validation against Supabase Auth records.

### 📍 2. Attendance & Field Check-in
- **Location Tracking**: Uses `expo-location` to fetch real-time device coordinates on check-in and check-out.
- **Accuracy Verification**: Client-side GPS validation ensures that check-ins occur within required accuracy thresholds.
- **Interactive Maps**: Integrates Leaflet-based map views (`components/WebMap.tsx` and `components/LocationIQMap.tsx`) for visual coordinate verification.

### 📋 3. Enquiries Pipeline
- **Enquiry Dashboard**: Tabular, card-based overview of active logistics enquiries with visual indicators (e.g., shipment mode, routes).
- **Enquiry Details**: Comprehensive sheet covering Port of Loading (POL), Port of Destination (POD), commodity specs, cargo weights, and exchange rates.
- **Key Actions**: Supports confirming/cancelling enquiries, editing, printing documents, and converting enquiries directly into jobs.

### 💼 4. Leads & Follow-ups
- **Leads Directory**: Centralized list tracking contact details and company metadata.
- **Follow-up Reminders**: Log, schedule, and track customer follow-up actions to drive sales conversions.
- **Visits Log**: Record physical customer visits with location info, contact reference, and visit outcomes.

---

## 🛠️ Technology Stack

- **Framework**: [Expo SDK 54](https://expo.dev/) & [Expo Router v6](https://docs.expo.dev/router/introduction/) (File-Based Navigation)
- **Language**: TypeScript / JavaScript
- **Styling**: React Native Stylesheet, `expo-linear-gradient`, `expo-blur` (frosted glass)
- **Database & Auth**: [Supabase](https://supabase.com/) (`@supabase/supabase-js`)
- **Maps**: Leaflet (Web) & `expo-location` (Native GPS)

---

## 📂 Project Structure

- [app/](file:///c:/Users/riyas/OneDrive/Documents/sies_things/skills/logistics_project/app) - Expo Router navigation, screen files, and layout controllers.
- [components/](file:///c:/Users/riyas/OneDrive/Documents/sies_things/skills/logistics_project/components) - Reusable UI widgets (badges, maps, form modals, and metric cards).
- [lib/](file:///c:/Users/riyas/OneDrive/Documents/sies_things/skills/logistics_project/lib) - Supabase clients, TS type schemas, and relational salesperson mappers.
- [backend/](file:///c:/Users/riyas/OneDrive/Documents/sies_things/skills/logistics_project/backend) - Local Express REST API (Supabase database integration layer).
- [.planning/](file:///c:/Users/riyas/OneDrive/Documents/sies_things/skills/logistics_project/.planning) - GSD roadmap, phases, and technical codebase mapping.

---

## 📦 Project Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the project root:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   - Press `w` to open the app in a web browser.
   - Scan the QR code with **Expo Go** on a physical iOS or Android device.

---

## 🔮 Future Enhancements

1. **Strict REST API Integration**: Migrate direct frontend-to-Supabase database queries to secure Express backend API endpoints.
2. **Advanced Quotation Module**: Implement price calculations, currency conversion rates, and quotation line items for enquiries.
3. **Automated Reminders**: Introduce push notifications and automated email reminder schedules for follow-ups via Supabase Edge Functions or background cron jobs.
4. **Enhanced Access Control**: Transition from simple user roles to a rich Role-Based Access Control (RBAC) model with hierarchical sales structures (managers and reps).
