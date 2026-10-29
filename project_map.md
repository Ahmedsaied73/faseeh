# Project Map — E-LRN-FRONTEND

> Last updated: 2026-09-04. Auto-generated from full codebase analysis.

## What This Is

An Arabic RTL e-learning platform for Egyptian secondary school chemistry students (Mr. Lotfy Zahran). Students browse courses by grade, watch Bunny Stream videos, take timed quizzes (MCQ + essay with auto-grading), submit assignments, and track progress. An admin panel manages quizzes, grading queues, and exemptions.

**Target audience:** Secondary school students (First/Second/Third Secondary) in Egypt. UI text is entirely in Arabic.

**Backend repo:** `H:\e-learning-platform` (Express + Prisma + MySQL, port 3005). Both repos must be running for the app to function. See backend's `AGENTS.md` for its own architecture, bugs, and conventions.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 13.5.1 |
| Language | TypeScript (strict mode) | 5.2.2 |
| Styling | Tailwind CSS + shadcn/ui | 3.3.3 |
| State | Redux Toolkit | 2.6.1 |
| Forms | react-hook-form + zod | 7.53 / 3.23 |
| Video | Bunny Stream CDN | -- |
| Auth | JWT (in-memory) + HttpOnly cookies (backend) | -- |
| Backend | Separate Node.js API | localhost:3005 |

---

## Repository Structure

```
L:\E-LRN-FRONTEND\                    # Git root
└── a-e-lrn-frontend\                 # Next.js app root — ALL commands run here
    ├── app\                          # App Router routes
    ├── components\                   # React components
    │   ├── ui\                       # shadcn primitives (generated, don't edit)
    │   ├── quiz\                     # Quiz components (QuizRunner, QuizIntroCard, etc.)
    │   └── admin\                    # Admin components (QuizAuthoringForm, GradingQueue, ExemptionResetPanel)
    ├── services\                     # API service layer (thin wrappers around apiClient)
    ├── store\                        # Redux Toolkit store + slices
    │   └── slices\                   # auth, course, quiz, assignment, ui
    ├── lib\                          # Core utilities
    │   ├── api-client.ts             # Central HTTP client
    │   ├── errors.ts                 # Typed error classes
    │   └── mock\                     # Mock data for development
    ├── hooks\                        # Custom hooks
    ├── types\                        # Shared TypeScript types
    └── utils\                        # Auth utilities
```

---

## Route Map (22 pages)

### Public Routes

| Route | Type | Component | Description |
|-------|------|-----------|-------------|
| `/` | Client | `app/page.tsx` | Home page — hero, grade cards (1/2/3), features, CTA |
| `/login` | Client | `app/login/page.tsx` | Email/password login form |
| `/register` | Client | `app/register/page.tsx` | Student registration (name, phone, grade, password) |
| `/grades/1` | Server | `app/grades/1/page.tsx` | First Secondary course catalog |
| `/grades/2` | Server | `app/grades/2/page.tsx` | Second Secondary course catalog |
| `/grades/3` | Server | `app/grades/3/page.tsx` | Third Secondary course catalog |

### Protected Routes (middleware checks `isLoggedIn` cookie)

| Route | Type | Component | Description |
|-------|------|-----------|-------------|
| `/me` | Client | `app/me/page.tsx` | Redirect → `/me/user` |
| `/me/user` | Client | `app/me/user/page.tsx` | Student dashboard — profile, stats, nav |
| `/me/user/courses` | Client | `app/me/user/courses/page.tsx` | Enrolled courses grid |
| `/me/user/subscriptions` | Client | `app/me/user/subscriptions/page.tsx` | Subscriptions (same endpoint as courses) |
| `/me/user/assignments` | Client | `app/me/user/assignments/page.tsx` | Assignment submission history |
| `/course/[id]` | Client | `app/course/[id]/page.tsx` | Course detail — videos, assignments, enrollment sidebar |
| `/course/[id]/subscribe` | Server | `app/course/[id]/subscribe/page.tsx` | Redirect → invoice page |
| `/course/[id]/subscribe/invoice` | Client | `app/course/[id]/subscribe/invoice/page.tsx` | Enrollment invoice + payment |
| `/course/[id]/video/[video]` | Client | `app/course/[id]/video/[video]/page.tsx` | Video player + assignments + quiz intro |
| `/course/[id]/video/[video]/quiz` | Server | `app/course/[id]/video/[video]/quiz/page.tsx` | Standalone quiz intro page |
| `/course/[id]/video/[video]/quiz/run` | Client | `app/course/[id]/video/[video]/quiz/run/page.tsx` | Active quiz runner |
| `/course/[id]/video/[video]/quiz/result/[attemptId]` | Client | `app/course/[id]/video/[video]/quiz/result/[attemptId]/page.tsx` | Quiz result + review |
| `/course/[id]/video/[video]/assignment/[assignment]` | Client | `app/course/[id]/video/[video]/assignment/[assignment]/page.tsx` | Assignment submission (MCQ or text) |

### Admin Routes

| Route | Type | Component | Description |
|-------|------|-----------|-------------|
| `/admin/quizzes/[videoId]` | Server | `app/admin/quizzes/[videoId]/page.tsx` | Quiz authoring form |
| `/admin/quizzes/[videoId]/access` | Server | `app/admin/quizzes/[videoId]/access/page.tsx` | Exemption reset panel |
| `/admin/quizzes/quiz/[quizId]/attempts` | Server | `app/admin/quizzes/quiz/[quizId]/attempts/page.tsx` | Grading queue |

### Broken Links

| Link from | Missing route |
|-----------|--------------|
| `/me/user` sidebar | `/me/user/all-exam-results` — no page.tsx exists |

---

## Auth Flow

```
App Load
  → AuthInitializer (runs ONCE per session, guarded by useRef)
    → Check Redux: already authenticated? → Skip
    → Check cookie: isLoggedIn=true?
      → No → dispatch(guestSessionChecked())  — visitor, not error
      → Yes → dispatch(loginStart())
              → GET /user/me
              → dispatch(loginSuccess(user)) or dispatch(loginFailure())
```

**Dual-layer auth:**
1. **In-memory JWT** — stored in `lib/api-client.ts` module singleton, sent as `Authorization: Bearer` header
2. **HttpOnly cookies** — set by backend, sent via `credentials: 'include'`
3. **`isLoggedIn` cookie** — plain (non-httpOnly), client-side UX signal only, NOT a security boundary

**401 recovery:** apiClient intercepts 401 → tries silent refresh (`POST /auth/refresh-token` then `/auth/refresh`) → retries original request once → on failure: clears state, redirects to `/login`.

---

## Redux State Shape

```
auth
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  initialized: boolean          // false until AuthInitializer completes
  error: string | null

courses
  courses: CourseListItem[]
  currentCourse: CourseDetail | null
  enrollments: EnrollmentStatus[]
  loading: boolean
  error: string | null
  pagination: { total, page, limit, totalPages } | null

quiz
  meta: QuizMeta | null
  metaStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  activeAttempt: StartQuizData | null
  submitResult: SubmitQuizData | null
  result: QuizResultData | null
  attempts: AttemptSummary[]
  error: string | null

assignment
  assignments: Assignment[]
  currentAssignment: Assignment | null
  assignmentResults: AssignmentResult | null
  assignmentStatuses: Record<number, AssignmentStatus>
  submissions: AssignmentSubmission[]
  selectedAnswers: Record<number, number>   // questionId → optionId
  loading / submitting / submitSuccess: boolean
  error: string | null

ui
  theme: 'light' | 'dark' | 'system'
  notifications: Notification[]
  globalLoading: boolean
  sidebarOpen: boolean
```

---

## API Endpoints (all via apiClient → localhost:3005)

### Auth
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/auth/login` | No | Login (returns token + sets cookies) |
| POST | `/auth/register` | No | Register new student |
| POST | `/auth/logout` | Yes | Logout (clears cookies) |
| GET | `/user/me` | Yes | Current user profile |
| POST | `/auth/refresh-token` | Cookie | Silent token refresh |
| POST | `/auth/refresh` | Cookie | Silent token refresh (fallback) |

### Courses
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/courses?page=&limit=` | List courses (paginated) |
| GET | `/courses/:id` | Course detail + videos + enrollment + progress |
| POST | `/enroll/status` | Check enrollment status |
| POST | `/enroll/` | Enroll in course |

### Videos (Bunny Stream)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/courses/:id/bunny-videos` | List videos for course |
| GET | `/videos/:id/playback` | Signed playback URL (time-limited) |
| GET | `/progress/course/:id` | Video completion progress |
| POST | `/progress/complete` | Mark video as completed |

### Quizzes
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/quizzes/videos/:videoId/meta` | Quiz metadata (exists, unlocked, scores) |
| POST | `/quizzes/videos/:videoId/start` | Start or resume quiz attempt |
| PATCH | `/quizzes/attempts/:id/save` | Autosave responses |
| POST | `/quizzes/attempts/:id/submit` | Submit quiz for grading |
| GET | `/quizzes/attempts/:id/result` | Get graded result |
| GET | `/quizzes/videos/:videoId/attempts` | All attempts for a video |

### Assignments
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/assignments/video/:videoId` | Assignments for a video |
| GET | `/assignments/:id` | Single assignment detail |
| POST | `/assignments/submit` | Submit (MCQ answers or text content) |
| GET | `/assignments/:id/status` | Submission status |
| GET | `/assignments/:id/submissions` | User's submission history |

### Admin
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/quizzes/videos/:videoId` | Create/update quiz |
| GET | `/quizzes/:quizId/attempts?status=` | List attempts (filter by status) |
| PUT | `/quizzes/attempts/:id/grade` | Grade essay questions |
| POST | `/quizzes/attempts/:id/reset` | Reset an attempt |
| POST | `/quizzes/videos/:videoId/exemptions` | Grant exemption |
| DELETE | `/quizzes/exemptions/:id` | Revoke exemption |

---

## Key Components

### Custom Components

| File | Purpose | Key behavior |
|------|---------|-------------|
| `components/navbar.tsx` | Main navigation | Reads auth from Redux, shows login/logout/profile based on state |
| `components/course-catalog.tsx` | Course grid | Fetches all courses, used by `/grades/*` pages |
| `components/enrollment-card.tsx` | Sticky sidebar | Course price + enrollment button, uses `react-hot-toast` |
| `components/quiz/QuizRunner.tsx` | Active quiz UI | Timer, autosave (25s debounce), flag questions, submit with confirmation |
| `components/quiz/QuizIntroCard.tsx` | Quiz start screen | Shows quiz meta, attempt history, start/resume button |
| `components/quiz/QuizResultSummary.tsx` | Result display | Score, pass/fail, per-question breakdown |
| `components/quiz/QuizReviewList.tsx` | Question review | Filterable list of answers with correct/incorrect indicators |

### Shadcn UI (components/ui/ — 48 files)

Generated, not hand-written. Add new ones via `npx shadcn-ui@latest add <component>`. Key ones used: Button, Card, Form, Input, Select, Tabs, Dialog, RadioGroup, Badge, Avatar, Accordion, Separator, Skeleton, Toaster.

---

## Custom Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useQuizAutosave` | `hooks/useQuizAutosave.ts` | Debounced (25s) autosave of quiz responses, flush on tab blur |
| `useQuizTimer` | `hooks/useQuizTimer.ts` | Server-synced countdown timer from `deadlineAt` ISO string |
| `useToast` | `hooks/use-toast.ts` | Standalone toast system (not Redux-based, limit 1 at a time) |

---

## Design System

- **Font:** Cairo (Google Fonts, Arabic subset)
- **Primary color:** `#207bff` (digital blue)
- **Surface system:** Material Design-style hierarchy (surface, surface-container-*, surface-variant)
- **Spacing:** Base-4 rhythm (4px base, 8/16/24/40/64px scale)
- **Border radius:** 0.25rem to 1.5rem, pill-shaped progress bars
- **Shadows:** 4-level elevation (base, cards, interactive, overlays)
- **Full spec:** See `DESIGN.md`

---

## Known Issues / Tech Debt

| # | Issue | Status | Notes |
|---|-------|--------|-------|
| 1 | No test infrastructure | Open | No test framework, no test files, no test scripts |
| 2 | No typecheck script | Open | TS checking only during `next dev`/`next build` |
| 3 | No CI/CD pipelines | Open | No GitHub Actions, no pre-commit hooks |
| 4 | `/me/user/all-exam-results` missing | **Planned** | Page not built yet. Sidebar links to it. |
| 5 | Courses & Subscriptions redundant | **To unify** | Both hit `GET /courses/enrolled`. Needs consolidation into one. |
| 6 | Dashboard stats hardcoded to 0 | **Needs backend** | Backend must build new per-user aggregation endpoints first |
| 7 | File upload in assignments stubbed | **Decision pending** | Backend needs to confirm if file upload is planned and where files go |
| 8 | 3 toast systems coexist | **To consolidate** | Consolidate on one (e.g. `sonner`), remove the rest |
| 9 | Mock data in assignmentService | **Dead code** | `lib/mock/course` imports should be removed |
| 10 | Duplicate `getCurrentUser()` | **Dead code** | Exported from both `authService.ts` and `userService.ts` |

### Requires Backend Coordination

These cannot be resolved frontend-only:

- **Dashboard stats:** No backend endpoints exist for lecture time, video views, quiz opens, completions. Backend must design and build per-user aggregation endpoints.
- **File upload:** Backend must confirm: is it planned? Storage target (backend service or Bunny Stream)? Need upload endpoint before frontend can implement.
- **Quiz gating security:** Must verify server-side enforcement. Currently unclear if playback URL requests are rejected when required quiz isn't passed. If frontend-only, students can bypass via direct Bunny Stream URL.
- **Quiz expiry status:** Must confirm whether auto-submitted (expired) attempts are marked `EXPIRED` or `GRADED`, and whether display differs.
- **Admin route exposure:** Admin pages are being removed/rebuilt. Backend must confirm 401/403 behavior for admin endpoints during transition.

### Frontend ↔ Backend API Contract

| Frontend Service | Backend Route | Backend File | Notes |
|-----------------|---------------|--------------|-------|
| `authService.loginUser` | `POST /auth/login` | `src/routes/auth.js` | Returns token + sets httpOnly cookie |
| `authService.registerUser` | `POST /auth/register` | `src/routes/auth.js` | |
| `authService.getCurrentUser` | `GET /user/me` | `src/routes/users.js` | |
| `courseService.fetchAllCourses` | `GET /courses` | `src/routes/courses.js` | |
| `courseService.fetchCourseById` | `GET /courses/:id` | `src/routes/courses.js` | Returns course + videos + enrollment + progress |
| `courseService.enrollInCourse` | `POST /enroll/` | `src/routes/enrollmentRoutes.js` | Payment disabled, auto-marks paid |
| `bunnyVideoService.fetchBunnyCourseVideos` | `GET /courses/:id/bunny-videos` | `src/routes/bunnyVideoRoutes.js` | |
| `bunnyVideoService.fetchBunnyPlaybackUrl` | `GET /videos/:id/playback` | `src/routes/bunnyVideoRoutes.js` | Signed URL, 6h TTL |
| `quizService.getQuizMeta` | `GET /quizzes/videos/:videoId/meta` | `src/routes/quizRoutes.js` | |
| `quizService.startQuiz` | `POST /quizzes/videos/:videoId/start` | `src/routes/quizRoutes.js` | |
| `quizService.submitQuiz` | `POST /quizzes/attempts/:id/submit` | `src/routes/quizRoutes.js` | |
| `quizService.saveQuizResponses` | `PATCH /quizzes/attempts/:id/save` | `src/routes/quizRoutes.js` | Autosave |
| `assignmentService.fetchAssignmentsByVideo` | `GET /assignments/video/:videoId` | `src/routes/assignmentRoutes.js` | **⚠️ Legacy Video only** |
| `assignmentService.submitAssignment` | `POST /assignments/submit` | `src/routes/assignmentRoutes.js` | MCQ auto-graded, text is PENDING |
