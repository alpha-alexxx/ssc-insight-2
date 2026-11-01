/**
 * `/plan` is a valid route so the bare path does not 404 — but it renders
 * nothing itself. The `(workspace)` layout deliberately discards `children`
 * (the shell derives the view from the pathname), so a `redirect()` here
 * would never run; the shell resolves `/plan` to today in IST and replaces
 * the URL. See `workspace-shell.tsx`.
 */
export default function PlanIndexPage() {
  return null;
}
