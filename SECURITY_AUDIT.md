# Security & Bug Audit — E-LRN Platform (Full System)

> Date: 2026-09-05. Scope: frontend `L:\E-LRN-FRONTEND\a-e-lrn-frontend` + backend `H:\e-learning-platform`. Manual code audit (both servers were down during the audit; no live exploitation performed).

---

## CRITICAL — fix immediately

### 1. Refresh-token secret is a placeholder value (full account takeover)
- **Where:** `H:\e-learning-platform\.env:16` — `REFRESH_TOKEN_SECRET="your_refresh_token_secret_here"`
- **Fallback:** `src/config/env.js:35` uses `process.env.REFRESH_TOKEN_SECRET || process.env.JWTSECRET` — the placeholder wins.
- **Exploit:** Anyone can forge a refresh token for any user, mint unlimited access tokens. The `JWTSECRET` itself is strong, but the refresh path is wide open. This defeats all of auth.
- **Fix:** Set a real random secret in `.env`.

### 2. Admin route protection is completely absent on the frontend
- **Where:** `app/admin/quizzes/*/page.tsx` — no auth check, no role check, not even the cosmetic middleware cookie gate (matcher is only `/me/*` and `/course/*`).
- **Exploit evidence:** `user.role` / `isAdmin` is **never referenced anywhere** in the frontend (grep = 0 matches). Any visitor can navigate directly to `/admin/quizzes/[videoId]` and get the full admin UI: quiz authoring with `answerKey` field, grading queue showing all students' answers, and exemption panel taking a raw `userId`.
- **Fix:** Role-gate admin pages (check `user.role === 'ADMIN'` from Redux) + protect `/admin/*` in middleware.

### 3. Assignment answer keys are exposed before submission
- **Where:** `H:\e-learning-platform\src\controllers\assignmentController.js:108` — `getAssignment` includes `AssignmentQuestion: true`, which includes `correctOption`. Only an enrollment check, no submission-state check.
- **Exploit:** A student can GET the assignment, read the correct answers, then submit and score 100% on self-graded MCQ assignments (grading is client-computed at line 285).
- **Fix:** Strip `correctOption` from the response for unsubmitted users; move MCQ grading fully server-side.

### 4. `/progress/complete` trusts the client — sequential gate is a no-op
- **Where:** backend `videoProgressController.js:26-70`, frontend `app/course/[id]/video/[video]/page.tsx:170-207` ("أكملت مشاهدة المحاضرة؟" button).
- **Exploit:** Any enrolled student clicks the button on every video → instant completion of the whole course → unlocks every quiz/assignment → feeds `evaluateGate`. No watch-time, no playback proof, no server-side verification.
- **Fix:** Server-side verification (time-based, quiz-factored, or server-authoritative completion events).

### 5. Payment is a no-op — every enrollment auto-marks as paid
- **Where:** `enrollmentController.js:51-52` (`const isPaid = true`), `accessControl.js:51-58,117-124` (auto-grant), `paymentController.js:49` (COMPLETED without gateway).
- **Exploit:** Anyone enrolled in any course for free. This is by design per AGENTS.md, but if this ever ships to production with paid content it's full business-logic fraud.

---

## HIGH

### 6. `REFRESH_TOKEN` in JSON response body + no rotation + no reuse detection
- **Where:** `authController.js:43,90` (returns `refreshToken` in body), `authController.js:122-144` (same token returned on refresh, DB copy never updated).
- **Exploit:** Any XSS reads the 7-day refresh token from the response body; it never rotates, so it's usable indefinitely.

### 7. Stored / reflected XSS surfaces (no CSP, no sanitization)
- `videoStreamController.js:73-85` builds `<iframe><embedHtml>` from raw `width/height/url/thumbnail` query params — reflected XSS if rendered as HTML.
- `coursesController.js:138-174` / `videosController.js:68-100` store admin `title/description/thumbnail/url` verbatim.
- Frontend `QuizRunner.tsx:348-355` renders quiz `html` via `dangerouslySetInnerHTML`; the `isSafeHtmlUrl` sanitizer (`QuizRunner.tsx:71-76`) only checks `startsWith("javascript:")` — **bypassable** with control characters (`java\tscript:`) and doesn't block `blob:`/`data:`.
- **No CSP anywhere:** `next.config.js` has no `headers()`. No `helmet()` on backend.

### 8. IDOR — result endpoint shared student/admin, attemptId unverified
- `services/quizService.ts:66` and `adminQuizService.ts:26` both hit `GET /quizzes/attempts/:id/result`. Frontend result page (`.../result/[attemptId]/page.tsx:41`) never verifies the attempt belongs to the current user. Backend ownership check is the only line of defense.

### 9. Enrolled courses endpoint shape mismatch — "My Courses" and "Subscriptions" render broken/blank data
- Backend `getUserEnrolledCourses` (coursesController.js:294-316) returns `[{ id: <enrollmentId>, createdAt, course: {...} }]`.
- Frontend (`app/me/user/courses/page.tsx`, `.../subscriptions/page.tsx`) expects a flat `CourseListItem[]` — so `course.title`, `course.thumbnail`, `course.price` are all `undefined`, and `/course/{enrollmentId}` routes to the wrong course (enrollment id ≠ course id).

### 10. Sequential-gate 403 misread as "not enrolled"
- When the backend returns 403 **without** `quizId` (previous video not completed), the frontend sets `isNotEnrolled(true)` → enrolled students see the subscribe lock screen instead of "watch the previous video".

### 11. Assignments on legacy `Video`, frontend sends `BunnyVideo` ids
- Backend `GET /assignments/video/:videoId` queries `prisma.video`, frontend passes bunny video ids → 404s / missing assignments on Bunny courses. Quizzes/progress/gates use `BunnyVideo`; assignments use `Video`. The two systems never sync.

### 12. Quiz timing is client-authoritative
- `useQuizTimer.ts:49-58` counts down from a client clock; a student can change system time / keep tab backgrounded to stop the timer. `autoSubmitted` is client-supplied to `POST /quizzes/attempts/:id/submit`. Server must be the sole authority on deadlines.

---

## MEDIUM

| # | Finding | Location |
|---|---------|----------|
| 13 | No rate limiting per-user; unlimited account creation via `POST /auth/register`; only `/auth/login` is tightened | `app.js:80-97` |
| 14 | User enumeration via registration: `409 "Email already registered."` | `authController.js:19-27` |
| 15 | `sameSite: 'lax'` cookies in dev + no CSRF tokens; `/progress/complete`, `/enroll`, quiz submit are CSRF-eligible | `src/config/cookie.js:7,16` |
| 16 | Bunny webhook has no replay/nonce/timestamp protection (HMAC itself is correct, timing-safe) | `bunnyWebhookController.js` |
| 17 | Playback token in URL query string, 6h TTL — leakable via logs/referrer/history | `bunnyVideoService.js:357` |
| 18 | No helmet headers; CORS `exposedHeaders: ['Set-Cookie']`; `origin` callback allows origin-less requests | `app.js` |
| 19 | Error objects logged verbosely across ~20 controllers (Prisma internals to stdout) | multiple |
| 20 | Unbounded pagination `limit` (no `parseInt` clamp) — minor DoS | `coursesController.js:7-8` |
| 21 | `isLoggedIn` cookie set without `Secure` flag, 7-day max-age | `services/authService.ts:37,55` |
| 22 | Raw backend error strings forwarded verbatim to UI | `lib/api-client.ts:197-230` |
| 23 | Assignment MCQ resubmission UX lies: submit stays enabled after `hasSubmitted`, backend rejects with raw English 400 | assignment page |
| 24 | `me/user/assignment-results` route doesn't exist — "عرض النتيجة التفصيلية" → 404 | assignment page |
| 25 | `apiClient` unwraps `{success,data,meta}` losing `meta` → pagination fabricated, `totalPages` always 1 | `lib/api-client.ts`, `courseService.ts` |
| 26 | Essay `scorePercent` computed as `mcqEarned / totalPoints` (includes essay points) → MCQ-perfect attempt can't pass → status stuck `GRADING` → gate stuck locked | `quizService.js` submitAttempt |

---

## LOW / Dead code

| # | Finding |
|---|---------|
| 27 | Default `admin123` passwords committed in `README.md:98`, `.env.example:16`, `.opencode/skills/swe-workflow/SKILL.md:151,178` — and live in `.env`. |
| 28 | `fetchAssignmentSubmissions` is dead code with the wrong contract (admin endpoint, called by nothing). |
| 29 | `me/user/all-exam-results` is a dead link (no page.tsx). |
| 30 | `dueDate: null` renders as 1970 (`new Date(null)`). |
| 31 | Mock data ids `9001-9003` in `lib/mock/course.ts` can collide with real DB ids. |
| 32 | Legacy backend routes with no frontend caller: `streamRoutes`, `nextVideoController`, `paymentRoutes`, `searchRoutes`. |
| 33 | "تم فتح الدرس التالي تلقائياً" on quiz result is cosmetic — nothing auto-opens. |
| 34 | `SUBMITTED` attempt status never emitted by backend — dead branch in frontend. |
| 35 | Live `.env` on disk contains real secrets (MySQL password, YouTube API key, Bunny keys) — unencrypted. |

---

## Top 10 fixes by priority

1. **Set a real `REFRESH_TOKEN_SECRET`** in `.env` (blocker).
2. **Role-gate admin routes** on frontend + middleware matcher for `/admin/*`.
3. **Strip answer keys** from assignment GET for unsubmitted users; server-side MCQ grading.
4. **Stop trusting `/progress/complete`** — add server-side completion verification.
5. **Add `helmet()`** (backend) + **CSP/security headers** (frontend `next.config.js`).
6. **Fix `/courses/enrolled` contract mismatch** — flatten to `CourseListItem[]`.
7. **Rotate refresh tokens** + remove from JSON response bodies + reuse detection.
8. **Fix sequential-gate 403 handling** — distinguish "not enrolled" from "previous video incomplete".
9. **Convert legacy assignments to `BunnyVideo`** or reconcile ids (architectural).
10. **Fix quiz essay scoring math** so a passing MCQ-only attempt actually passes.