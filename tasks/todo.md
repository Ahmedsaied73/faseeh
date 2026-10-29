# Task List: Centralized Colors + BG Unification + Animations + Navbar

## Phase 1: Foundation
- [x] Task 1: Create `lib/colors.ts` — single source of truth for all palette hex values

## Phase 2: Wire Color Config
- [x] Task 2: Update `tailwind.config.ts` to import from `lib/colors.ts`
- [x] Task 3: Update `app/globals.css` CSS vars with source-of-truth comments

## Phase 3: Background Unification
- [x] Task 4: Convert student-facing dark-scheme pages to light (courses, subscriptions, achievements, assignments, login, register, invoice, assignment detail)
- [x] Task 5: Update `components/navbar.tsx` colors to use tokens
- [x] Task 6: Update `components/footer.tsx` colors to use tokens
- [x] Task 7: Update `components/enrollment-card.tsx` colors to use tokens

## Phase 4: Animations
- [x] Task 8: Install `framer-motion`
- [x] Task 9: Create reusable animation components (`components/animations.tsx`)
- [x] Task 10: Add animations to landing page sections
- [x] Task 11: Add animations to course catalog and profile pages

## Phase 5: Navbar Redesign
- [x] Task 12: Redesign navbar layout, styling, dropdown, and mobile menu

## Verification
- [x] `npm run lint` passes after every phase (only pre-existing warnings)
- [x] `npm run build` passes after every phase (23/23 static pages)
- [x] No raw hex colors in student-facing components (only tokens or `lib/colors.ts` references)
- [x] Animations visible on landing page, course catalog, and profile
- [x] Navbar modernized and consistent with design system

## Notes
- Stitch screen `4ac06ed717fb454e8f58e8e8e12e3877` could not be fetched (SPA shell) — navbar redesigned best-effort.
- `framer-motion@13.2.0` installed; landing first-load JS grew +42kB.
- Admin console pages retain raw hex (being removed; out of scope).
- Remaining raw hex lives in `app/icon.svg` and decorative glow shadows (`shadow-[0_8px_40px_rgba(32,123,255,0.25)]`) — intentional.