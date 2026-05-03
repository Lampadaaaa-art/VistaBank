# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm start        # Start production server
npm run lint     # Run ESLint
npm run clean    # Clear Next.js cache
```

Before running, copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`.

## Architecture

**Vista Gui** is a bank queue management system — currently a high-fidelity UI prototype (no real backend). Built with Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, and Framer Motion.

### Role-Based Portal Structure

The app has five distinct portals, each a separate route namespace:

| Portal | Route | Audience |
|---|---|---|
| Borne (Kiosk) | `/borne` | Customers — issue tickets |
| TV Display | `/tv` | Lobby screens — show current ticket + queue |
| Caissier (Teller) | `/caissier` | Bank tellers — call next ticket, view history |
| Superviseur | `/superviseur` | Supervisors — real-time KPIs, alerts, reports |
| Admin | `/admin` | Administrators — users, services, counters, settings |

The root `/` page is a role-selection landing screen with navigation cards to each portal.

### Current State: UI Prototype

All pages use **hardcoded mock data** with local `useState`. There is no:
- Authentication (no `/login` route exists)
- Database or persistence
- API routes
- Real-time data (no WebSocket/Firestore listeners)

`firebase-tools` is in dependencies as a CLI dev tool only — the Firebase client/admin SDK is **not installed or initialized**.

### Key Files

- `app/layout.tsx` — Root layout; sets `lang="fr"`, imports Manrope + Inter fonts, global metadata
- `app/globals.css` — Tailwind `@theme` block defining brand colors (`--color-primary: #b80033`) and fonts
- `lib/utils.ts` — `cn()` helper (clsx + twMerge)
- `hooks/use-mobile.ts` — `useIsMobile()` hook (768px breakpoint)

### Design System

Brand primary color is `#b80033` (red). All UI is in French. Custom Tailwind theme variables are defined in `globals.css` under `@theme {}` — do not use arbitrary Tailwind values for brand colors; use the CSS variables (`text-primary`, `bg-primary`, etc.).

Component composition uses `class-variance-authority` for variant-based styling and `lucide-react` for icons.

### Path Alias

`@/*` maps to the project root (set in `tsconfig.json`). Use `@/app/...`, `@/lib/...`, `@/hooks/...` for imports.

### Planned Backend Stack (per `AUDIT/audite.md`)

When adding real functionality, the project intends to use:
- Firebase Auth + Firestore (real-time listeners)
- Next.js API Routes
- Zustand for global state
- Zod for validation
- Web Speech API for ticket announcements (TV/teller screens)
