# LogiSales Expo App

LogiSales is an Expo Router app for sales and logistics workflows. It includes authentication, a tab-based dashboard, attendance tracking, leads, follow-ups, visits, and profile management.

## Requirements

- Node.js 18 or newer
- npm
- An Expo-compatible device or simulator for native testing
- A Supabase project for backend/auth/data access

## Project Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root with your Supabase credentials:

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Make sure your Supabase tables and auth setup match the app screens used in the project.

## Run in Expo

Start the Expo development server:

```bash
npm run dev
```

From the Expo CLI, you can then:

- Press `i` to open iOS simulator on macOS
- Press `a` to open Android emulator
- Scan the QR code with Expo Go on a physical device

## Run in Web Browser

There are two easy options for web testing:

### Option 1: Start Expo and open web from the dev server

```bash
npm run dev
```

Then press `w` in the Expo terminal to open the app in the browser.

### Option 2: Export the web build

```bash
npm run build:web
```

This creates a static web export that you can serve or inspect locally.

## Useful Scripts

- `npm run dev` - Start the Expo development server
- `npm run build:web` - Export the app for web
- `npm run lint` - Run Expo linting
- `npm run typecheck` - Run TypeScript type checking

## Notes

- The app uses Expo Router, so screens are file-based under the `app/` directory.
- Auth and data access depend on the Supabase environment variables above.
- If you want to test UI pages directly, the root auth redirect has been removed, so you can open the dashboard and other tab pages without being forced back to login.

## Project Structure

- `app/` - Expo Router screens and layouts
- `components/` - Reusable UI components
- `hooks/` - Shared React hooks
- `lib/` - Supabase client, types, and utilities
- `assets/` - Images and other static assets
