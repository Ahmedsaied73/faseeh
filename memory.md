# Ahmed — Developer Memory

> Captured from codebase analysis. Update as patterns emerge.

## Profile

- **Role:** SWE / AI Engineer
- **Project:** E-learning platform for Egyptian secondary school chemistry students
- **Language:** Arabic RTL app, English codebase

## How Ahmed Thinks

- **Architecture-first:** Built a 6-phase refactoring plan before coding (see `implementation_plan.md`, `PLANNING.md`). All phases completed.
- **Security-conscious:** Extensive comments on why `isLoggedIn` cookie is UX-only, not security. Removed wildcard image domains to prevent SSRF. Documented CORS issues in `COOKIE_AUTHENTICATION_GUIDE.md`.
- **Error handling rigor:** Typed error hierarchy (`lib/errors.ts`), every service function maps errors to Arabic user messages. No bare `catch` blocks.
- **Documentation-heavy:** 7 markdown docs in project root covering architecture, design system, auth guide, planning, and project summary. Creates docs as thinking tools.
- **Design-system aware:** Full Material Design-style token system in Tailwind config. Created `DESIGN.md` spec before building UI.

## Coding Patterns

- Uses `useRef` guards against React StrictMode double-invocations
- Prefers `AbortController` for cleanup in useEffect fetch calls
- Services use local `unwrap()`/`extractData()` helpers to handle both envelope-wrapped and flat API responses
- Custom hooks follow options-object pattern (`useQuizAutosave({ attemptId, responses, enabled })`)
- Redux thunks are synchronous wrappers around service functions (no `createAsyncThunk`)

## Architecture Decisions

- **Centralized HTTP client** (`lib/api-client.ts`) — all API calls go through it, never raw `fetch()`
- **In-memory JWT** — no tokens in localStorage (post-refactor decision)
- **AuthInitializer singleton** — prevents duplicate `/user/me` requests (was causing 429s)
- **Middleware as UX-only gate** — real auth enforcement is backend-side
- **Shadcn UI generated components** — never hand-edit `components/ui/`

## Cross-Project Awareness

- **Backend lives at:** `H:\e-learning-platform` (Express + Prisma + MySQL, port 3005)
- **Two video systems:** Backend has `BunnyVideo` (active) and legacy `Video` (assignments). Frontend's `assignmentService` hits legacy Video endpoints. This is a known design gap.
- **Sequential gate:** Backend's `quizService.evaluateGate()` is the source of truth. Frontend shows a 403 with quiz scores when gated.
- **Payment:** Disabled on backend. All enrollments auto-mark as paid. Frontend has enrollment UI but no real payment flow.
- **Backend bugs affect frontend:** `previousVideo` undefined in sequentialAccess, `evaluateGate` only queries BunnyVideo (legacy Video courses locked), `deleteCourse` orphan cleanup missing.

## What He's Building Now

- Full backend integration (completed per PLANNING.md)
- Quiz system with timed attempts, autosave, MCQ + essay grading
- Assignment system with MCQ auto-grading + text submission (file upload stubbed)
- Admin panel for quiz authoring, grading queue, exemptions
- Bunny Stream video integration with signed playback URLs

## What's Next (confirmed by Ahmed)

**Immediate priority — fix v1 gaps before new features:**
- Remove mock data dead code from `assignmentService.ts`
- Unify `/me/user/courses` and `/me/user/subscriptions` into one page
- Build `/me/user/all-exam-results` page
- Consolidate toast systems onto one (prefer `sonner`)
- Remove duplicate `getCurrentUser()` from `userService.ts`

**Blocked on backend:**
- Dashboard stats (needs new backend aggregation endpoints)
- File upload for assignments (needs backend decision + endpoint)
- Quiz gating security verification (server-side enforcement check)

**Deferred:**
- Admin pages being removed entirely (not happy with current implementation)
- Test infrastructure
- CI/CD setup

## Grilling Session Notes (2026-09-04)

Ahmed confirmed:
- Mock data in assignmentService is dead code, should be removed
- Courses/Subscriptions are redundant routing, needs unification
- Dashboard stats need backend endpoints built from scratch
- Exam results page is planned but not built
- File upload decision is pending
- Quiz gating enforcement is unknown (security concern)
- Toast consolidation planned (sonner wins)
- Quiz expiry status needs backend verification
- Admin pages are being removed entirely
- v1 shipped, fixing gaps is the current priority

## Full-System Audit (2026-09-05)

Full code audit of frontend + backend found these **confirmed** critical issues (see `SECURITY_AUDIT.md`):

1. **`REFRESH_TOKEN_SECRET` is a placeholder value** in backend `.env` — anyone can forge refresh tokens → account takeover.
2. **Admin routes have zero role gating** on frontend — `user.role` never used anywhere; any visitor sees `/admin/*`.
3. **Assignment answer keys (`correctOption`) exposed** in `GET /assignments/:id` before submission — MCQ assignments are cheat-proof bypassable.
4. **`/progress/complete` trusts the client** — the sequential gate is a no-op; one click per video completes the course.
5. **Payment auto-marks paid** — enrollment = free course (by design, but a fraud vector if it ships).

High-value logic bugs: `/courses/enrolled` shape mismatch (My Courses/Subscriptions render blank), sequential-gate 403 misread as "not enrolled", assignments on legacy `Video` vs backend's `BunnyVideo` ids, quiz timer is client-authoritative, essay scoring math wrong.

Both servers were DOWN during the audit — no live verification was possible. Findings are code-verified, not exploit-tested.
