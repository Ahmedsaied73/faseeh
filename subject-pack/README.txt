SUBJECT PACK — Arabic / Chemistry identity system

NEW files (copy as-is):
  src/lib/subject-theme.ts                    <- the ONE switch: ACTIVE_SUBJECT = "arabic" | "chemistry"
  src/components/subject/arabic-art.tsx       <- i'rab 404 art + arabesque login/register motion
  src/components/subject/chemistry-art.tsx    <- molecule/orbit art (now animated too)
  src/components/subject/subject-art.tsx      <- picks the art for the active subject
  src/components/subject/not-found-view.tsx   <- the 404 page body

CHANGED files (replace, or merge the diff if your copies differ):
  src/routes/__root.tsx      NotFoundComponent now returns <NotFoundView />
  src/routes/login.tsx       uses <AuthArt variant="login" /> + subject copy (desktop panel + mobile banner)
  src/routes/register.tsx    uses <AuthArt variant="register" /> + subject copy
  src/routes/index.tsx       hero badge/sub from the pack, arabic flourish under the H1, arabesque bg
  src/components/site/footer.tsx            footer blurb + newsletter title from the pack
  src/components/site/ai-assistant-demo.tsx assistant Q&A comes from the pack

CSS: append styles-append.css to the END of your global stylesheet (keyframes + .arabesque-bg).

Requires: Tailwind v4 theme tokens (brand-primary, brand-ink, brand-bg, brand-border, brand-muted, ...) from the design system.
