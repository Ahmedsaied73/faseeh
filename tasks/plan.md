# Implementation Plan: Centralized Colors + BG Unification + Animations + Navbar Redesign

## Overview

Unify the scattered hardcoded color hex values across the codebase into a single source of truth (`lib/colors.ts` + CSS vars), change all student-facing page backgrounds to white (matching the landing hero), add entry animations to key components, and update the navbar design. The Stitch screen "دليل الكورسات والمراحل التعليمية" couldn't be fetched (SPA), so navbar redesign follows the existing "Academic Precision" design system with refinements.

## Architecture Decisions

- **Single color config file** (`lib/colors.ts`) exports all palette values as a JS object. This is the ONLY place hex values are defined. `tailwind.config.ts`, `globals.css` CSS vars, and components all derive from it.
- **Background unification**: All student-facing pages change to `bg-white` (matching hero). The `#f7f9fc` surface color remains as the "subtle section" bg for alternating sections.
- **Animations**: Use `framer-motion` (needs install) for scroll-triggered fade-in/slide-up on cards, sections, and page content. Lightweight, performant, and covers the 80% case well.
- **Navbar**: Update to a cleaner, more modern look — larger logo area, better spacing, refined dropdown. Keep the floating glass pill structure.
- **Admin pages**: Left alone per user directive (being removed entirely).

## Task List

### Phase 1: Foundation — Color Config File

- [ ] Task 1: Create `lib/colors.ts` — single source of truth for all palette hex values
  - Export typed object with all colors: primary, secondary, surface, text, border, accent, semantic (success/error/warning), dark-scheme variants
  - Include computed helpers: `rgba(hex, alpha)` utility
  - File: `a-e-lrn-frontend/lib/colors.ts`

### Phase 2: Wire Color Config

- [ ] Task 2: Update `tailwind.config.ts` to import from `lib/colors.ts`
  - Replace all hardcoded hex values in `theme.extend.colors` with references to the color config
  - File: `a-e-lrn-frontend/tailwind.config.ts`

- [ ] Task 3: Update `app/globals.css` CSS vars to use values from the config
  - The `:root` CSS custom properties should reference the same values (can't import TS in CSS, so duplicate with a comment pointing to `lib/colors.ts` as source of truth)
  - File: `a-e-lrn-frontend/app/globals.css`

### Phase 3: Background Unification

- [ ] Task 4: Change student-facing page backgrounds to white
  - `app/page.tsx`: hero section already white; features/grades/why-us sections — keep alternating white/`#f7f9fc` pattern (this is correct design)
  - `components/course-catalog.tsx`: already uses tokens, no change needed
  - `app/me/user/page.tsx`: already redesigned with tokens
  - `app/me/user/courses/page.tsx`, `subscriptions/page.tsx`, `achievements/page.tsx`, `assignments/page.tsx`: these use dark scheme (`#111827`) — convert to light scheme using design tokens
  - `app/login/page.tsx`, `app/register/page.tsx`: convert dark backgrounds to light
  - `app/course/[id]/video/[video]/page.tsx`: WIP file — DO NOT TOUCH
  - `app/course/[id]/video/[video]/assignment/[assignment]/page.tsx`: convert dark scheme to light
  - `app/course/[id]/subscribe/invoice/page.tsx`: convert dark scheme elements to light
  - Files: ~8 page files

- [ ] Task 5: Update `components/navbar.tsx` colors to use tokens
  - Replace all `#207bff`, `#1a6bdf`, `#4ea5ff`, `#111827`, `#1f2937`, `gray-600`, `gray-700`, `gray-800` with semantic tokens
  - File: `a-e-lrn-frontend/components/navbar.tsx`

- [ ] Task 6: Update `components/footer.tsx` colors to use tokens
  - Replace hardcoded hex values with semantic tokens
  - File: `a-e-lrn-frontend/components/footer.tsx`

- [ ] Task 7: Update `components/enrollment-card.tsx` colors to use tokens
  - File: `a-e-lrn-frontend/components/enrollment-card.tsx`

### Phase 4: Animations

- [ ] Task 8: Install `framer-motion`
  - `npm install framer-motion` (only animation lib needed for React scroll/motion)

- [ ] Task 9: Create reusable animation components in `components/animations.tsx`
  - `FadeIn` — scroll-triggered fade-in with configurable direction (up/down/left/right)
  - `StaggerChildren` — staggered container for lists/grids
  - `ScaleIn` — scale + fade for cards
  - All respect `prefers-reduced-motion`

- [ ] Task 10: Add animations to landing page sections
  - Hero: subtle entrance animation (badge, headline, stats stagger in)
  - Features section: cards stagger in on scroll
  - Grade cards: stagger in on scroll
  - Why-us section: slide in from sides
  - File: `a-e-lrn-frontend/app/page.tsx`

- [ ] Task 11: Add animations to course catalog and profile pages
  - Course cards: fade-in on scroll
  - Profile sidebar/cards: fade-in on mount
  - Files: `components/course-catalog.tsx`, `app/me/user/page.tsx`

### Phase 5: Navbar Redesign

- [ ] Task 12: Redesign navbar layout and styling
  - Cleaner logo area with academy name + subtle icon
  - Better nav link styling (pill-shaped active state, refined hover)
  - Lighter, more modern dropdown (white bg with subtle shadow instead of dark bg)
  - Refined mobile menu
  - Better spacing and proportions
  - File: `a-e-lrn-frontend/components/navbar.tsx`

### Checkpoint: Before Starting

- [ ] Backend still down — no live verification possible
- [ ] `npm run lint` must pass after each task
- [ ] `npm run build` must pass after each task
- [ ] DO NOT touch WIP files: `subscribe/page.tsx`, `video/[video]/page.tsx`, `next.config.js`, `bunnyVideoService.ts`

### Checkpoint: After Phase 3 (Tasks 1-7)

- [ ] `npm run lint` clean
- [ ] `npm run build` passes
- [ ] All colors reference `lib/colors.ts` or tailwind tokens — no raw hex in student-facing components

### Checkpoint: After Phase 4 (Tasks 8-11)

- [ ] `npm run lint` clean
- [ ] `npm run build` passes
- [ ] Animations visible on landing page, course catalog, and profile page

### Checkpoint: After Phase 5 (Task 12)

- [ ] `npm run lint` clean
- [ ] `npm run build` passes
- [ ] Navbar looks modern and clean
- [ ] All student-facing pages use consistent light theme

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stitch screen not fetchable | Medium | Design navbar based on existing design system + best practices; can refine later if Stitch data becomes available |
| `framer-motion` bundle size | Low | Only ~30KB gzipped; lazy-load animation components; respect `prefers-reduced-motion` |
| Breaking admin pages | High | Admin pages are being removed — skip them entirely |
| Breaking WIP user files | High | Never touch `subscribe/page.tsx`, `video/[video]/page.tsx`, `next.config.js`, `bunnyVideoService.ts` |
| CSS var duplication | Low | `globals.css` `:root` must duplicate values from `lib/colors.ts` (CSS can't import TS); add comment pointing to source of truth |

## Open Questions

- Should framer-motion be installed, or should we use CSS-only animations (lighter but less flexible)?
  → Decision: framer-motion — more flexible for scroll triggers, better DX, ~30KB gzipped is acceptable.
- The Stitch screen can't be fetched — should I ask the user for a screenshot/description, or proceed with best-effort design?
  → Decision: Proceed with best-effort based on existing design system. Can refine later.
