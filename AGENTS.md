# AGENTS.md — E-LRN-FRONTEND

## Repository layout

The Next.js app lives inside `a-e-lrn-frontend/`, not at the repo root. **All commands must be run from `a-e-lrn-frontend/`.**

```
a-e-lrn-frontend/
├── app/                 # Next.js App Router (v13.5) — all routes live here
│   ├── course/[id]/     # Course detail, video/[video]/quiz, subscribe
│   ├── me/user/         # Student dashboard, exam results, assignments, subscriptions
│   ├── admin/quizzes/   # Admin quiz management
│   └── login/ register/ # Auth pages
├── components/          # Shared React components
│   ├── ui/              # Shadcn UI primitives (do NOT edit directly — regenerate via shadcn CLI)
│   └── quiz/            # Quiz-specific components (QuizRunner, QuizIntroCard, etc.)
├── lib/
│   ├── api-client.ts    # Central HTTP client — ALL API calls go through this
│   └── errors.ts        # Typed error classes (ApiError, AuthError, NotFoundError, etc.)
├── services/            # Thin wrappers around apiClient per domain (auth, course, quiz, assignment, admin, bunny)
├── store/               # Redux Toolkit store
│   └── slices/          # auth, course, quiz, assignment, ui slices
├── hooks/               # Custom hooks (useQuizAutosave, useQuizTimer, use-toast)
├── types/               # Shared TS types — api.ts, quiz.ts, bunny.ts
└── utils/               # auth-utils.ts
```

## Commands

All run from `a-e-lrn-frontend/`:

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (port 3000) |
| Lint | `npm run lint` |
| Build | `npm run build` (ESLint runs during build — `ignoreDuringBuilds: false`) |
| Production | `npm start` |

There is **no `typecheck` script** and **no test infrastructure** (no test framework, no test scripts, no test files). The TypeScript compiler is not invoked separately — Next.js handles type checking during dev/build via its SWC plugin.

## Backend

- **Backend repo:** `H:\e-learning-platform` (Express + Prisma + MySQL)
- API expected at `localhost:3005` (set via `NEXT_PUBLIC_API_URL` in `.env.local`)
- The backend must be running for the app to function — auth, courses, quizzes, assignments all hit it
- **CORS:** Backend allowlists `localhost:3000` and `localhost:3002`. If dev server runs on another port, add it to `allowedOrigins` in `H:\e-learning-platform\app.js`
- **Two video systems on backend:** `BunnyVideo` (active, used for quizzes/progress/gates) and legacy `Video` (used for assignments). This is a known design issue — assignments are on the legacy model.
- **Payment disabled:** All enrollments auto-mark as paid on the backend. No real payment flow.
- **Backend known bugs:** See `H:\e-learning-platform\AGENTS.md` section "Bugs confirmed by grilling" — `previousVideo` undefined in sequentialAccess.js, `evaluateGate` only queries BunnyVideo (legacy Video courses locked), `deleteCourse` doesn't clean up Bunny remote, `submitAttempt` essay scoring dead code.
- **Known security issues:** See `SECURITY_AUDIT.md` at repo root — includes: placeholder `REFRESH_TOKEN_SECRET` in backend `.env` (account takeover), no admin role-gating on `/admin/*` routes, assignment answer keys exposed pre-submission, `/progress/complete` trivially bypassable, `/courses/enrolled` response shape mismatch (My Courses/Subscriptions render blank), sequential-gate 403 misread as "not enrolled".

## Architecture gotchas

- **RTL Arabic app**: `layout.tsx` sets `lang="ar" dir="rtl"`. UI text is in Arabic. Cairo font loaded from Google Fonts.
- **Auth is dual-layer**: In-memory JWT token (`lib/api-client.ts`) + HttpOnly cookies set by backend. The `isLoggedIn` cookie in middleware is **client-side only** — it's a UX signal, not a security boundary. Real auth gating happens on the backend via the httpOnly session cookie.
- **AuthInitializer** (`store/auth-initializer.tsx`) runs `/user/me` exactly once per app load. Components should read auth state from Redux (`useAppSelector(selectIsAuthenticated)`) — **do not call `getCurrentUser()` directly** from components, as that causes duplicate requests and 429 rate limiting.
- **apiClient** handles: silent token refresh on 401, typed error classes for 401/403/404/409/429, `{ success, data }` envelope unwrapping, and `credentials: 'include'` on every request. Use it for all HTTP calls.
- **Middleware** (`middleware.ts`) only protects `/me` and `/course` routes with a client-side cookie check. It does **not** enforce server-side auth.
- **Shadcn UI**: Components in `components/ui/` are generated, not hand-written. Path alias `@/components/ui` maps to `components/ui/`. Use `npx shadcn-ui@latest add <component>` to add new ones.
- **No devDependencies**: All packages are in `dependencies` — this is unusual but intentional.
- **`output: 'standalone'`** in `next.config.js` — the build produces a standalone deployment artifact.
- **Image domains**: Only whitelisted hosts in `next.config.js` images.remotePatterns are allowed. Add new hosts there when needed.

## Redux state shape

```
auth    — user, isAuthenticated, loading, initialized, error
courses — course list / enrollment data
quiz    — quiz data, submission, results
assignment — assignment data
ui      — theme, notifications
```

Use typed hooks from `store/hooks.ts`: `useAppDispatch` and `useAppSelector`.

## Code conventions

- TypeScript strict mode is on (`tsconfig.json`).
- All API responses flow through `apiClient` in `lib/api-client.ts` — never call `fetch()` directly.
- Error handling uses typed classes from `lib/errors.ts` (`instanceof` checks, not string matching).
- Form validation uses `react-hook-form` + `zod` resolvers.
- `tailwind-merge` via `cn()` utility in `lib/utils.ts` for class merging.

## SWE workflow

For any non-trivial task (feature, bug fix touching multiple files, ambiguous request):

```
1. PLAN    → Use the `plan` agent to analyze and produce an implementation plan
              (files to touch, responsibilities, task breakdown)
2. BUILD   → Execute the plan task-by-task using the `build` agent
              (smallest correct change, touch only what's required)
3. REVIEW  → Inspect the diff: does it match the plan? Any regressions?
4. VERIFY  → Run `npm run lint` and `npm run build` to confirm no errors
```

Skip to step 2 only for trivial one-line fixes or typo corrections.

**Key discipline:** Never refactor something "while you're in there." Touch only what the task requires. If you discover a separate issue mid-execution, note it and continue — don't branch into unplanned work.

## Installed skills

| Skill | Location | Purpose |
|-------|----------|---------|
| `playwright-cli` | `~/.agents/skills/playwright-cli/` | Browser automation, E2E testing, UI verification |
| `grill-me` | `~/.agents/skills/grill-me/` | Relentless interview to sharpen plans/designs |
| `find-skills` | `~/.agents/skills/find-skills/` | Discover and install new skills |

### Using playwright-cli

`playwright-cli` is available via `npx playwright cli`. Use it for:

- **UI verification** after building a feature (navigate, click through flows, check for errors)
- **Debugging** (inspect console output, network requests, element state)
- **Screenshot capture** for visual diffing

Quick reference:
```bash
npx playwright cli open http://localhost:3000    # open dev server
npx playwright cli snapshot                      # get page state with element refs
npx playwright cli click e5                      # interact via refs
npx playwright cli console                       # check console for errors
npx playwright cli close                         # clean up
```

Full command reference: `~/.agents/skills/playwright-cli/SKILL.md`

### Skill workflow integration

```
PLAN → BUILD → REVIEW → VERIFY (lint/build) → UI TEST (playwright-cli)
                                                ↑
                                    Optional: run after VERIFY when
                                    the change affects user-facing UI
```

UI testing with playwright-cli is **optional** — skip it for:
- Service-layer-only changes (no UI impact)
- Type-only changes
- Config/documentation changes

Run it when:
- Building a new page or component
- Fixing a UI bug
- Changing routing or navigation
- Modifying form submissions or auth flows

## Learned Architecture & Engineering Rules

### HTML Sanitization Rule
- Never import `isomorphic-dompurify` in frontend components. It pulls server-side `jsdom` and `undici` into client bundles and breaks Next.js webpack builds.
- Always use client-side `dompurify` (`import DOMPurify from 'dompurify'`) with `@types/dompurify`.

### Data Fetching Invariant
- `/courses/:id` returns an aggregate `{ course, videos, enrollment, progress }`.
- Components must consume progress directly from this aggregate rather than firing secondary requests to `/progress/course/:id`.

