"use client";
// Named imports (not a namespace import) so the bundler can drop the ~70
// unused glyphs from the client bundle — Phase 13 hygiene.
import {
  AddCircle,
  AlertTriangle,
  Award,
  Book,
  Calendar,
  CheckCircle,
  Clock,
  Dashboard,
  File,
  Fire,
  Info,
  Menu,
  Moon2,
  Settings,
  Sun,
  Target,
  UploadFile,
  UserCard,
  World,
  Clipboard,
} from "@duo-icons/react";
import {
  Activity,
  AlertCircle,
  Bell,
  ArrowDownRight,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Brain,
  Calculator,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardPaste,
  Ellipsis,
  FileCheck2,
  GitCompareArrows,
  Layers3,
  LogOut,
  Minus,
  Monitor,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import type { SVGProps } from "react";

/**
 * Unified icon system — Phase 8 of the UI overhaul.
 *
 * Policy: @duo-icons/react is the preferred library. Every semantic name is
 * mapped to a Duo glyph when a suitable one exists; otherwise a Lucide icon
 * is the documented fallback (Duo ships 91 icons and has no arrows, search,
 * close, trend or subject-specific glyphs).
 *
 * Rendering, by glyph construction:
 * - Duo glyphs are filled duotone: CSS (`.icon-duo`, globals.css) tints the
 *   primary layer with ink/accent and the secondary layer with the accent
 *   wash, both from design tokens — so dark mode flips automatically.
 * - Lucide fallbacks used in duotone contexts go through `DuotoneIcon`
 *   (the echo technique). Tiny utility glyphs (X, chevrons, search) render
 *   as plain 1.75-stroke line icons via `PlainIcon`.
 *
 * Canonical sizes (no ad-hoc values): 14 micro · 16 inline · 18 nav/row ·
 * 22 tile · 28 large tile.
 */

type DuoIcon = (props: { size?: number; className?: string } & SVGProps<SVGSVGElement>) => React.ReactNode;

export type IconName =
  // navigation & views
  | "dashboard"
  | "history"
  | "compare"
  | "settings"
  | "help"
  | "menu"
  // themes
  | "sun"
  | "moon"
  // actions
  | "add"
  | "plus"
  | "check"
  | "close"
  | "search"
  | "save"
  | "refresh"
  | "more"
  | "paste"
  | "sparkles"
  | "logout"
  // data & files
  | "download"
  | "upload"
  | "file"
  | "fileCheck"
  | "report"
  | "trash"
  // concepts
  | "target"
  | "book"
  | "trend"
  | "clock"
  | "timer"
  | "bell"
  | "calendar"
  | "award"
  | "layers"
  | "shield"
  | "user"
  | "fire"
  | "activity"
  // statuses
  | "success"
  | "warning"
  | "danger"
  | "info"
  // directions
  | "arrowLeft"
  | "arrowRight"
  | "arrowUpRight"
  | "arrowDownRight"
  | "minus"
  | "chevronRight"
  | "chevronDown"
  // subjects
  | "quant"
  | "reasoning"
  | "english"
  | "ga"
  | "computer";

type IconEntry = { duo?: DuoIcon; lucide?: LucideIcon };

const ICONS: Record<IconName, IconEntry> = {
  // Duo first
  dashboard: { duo: Dashboard },
  history: { duo: Clipboard },
  settings: { duo: Settings },
  add: { duo: AddCircle },
  file: { duo: File },
  upload: { duo: UploadFile },
  target: { duo: Target },
  book: { duo: Book },
  clock: { duo: Clock },
  bell: { lucide: Bell },
  timer: { duo: Clock },
  calendar: { duo: Calendar },
  award: { duo: Award },
  user: { duo: UserCard },
  fire: { duo: Fire },
  success: { duo: CheckCircle },
  warning: { duo: AlertTriangle },
  info: { duo: Info },
  menu: { duo: Menu },
  sun: { duo: Sun },
  moon: { duo: Moon2 },
  ga: { duo: World },
  english: { duo: Book },
  // Lucide fallbacks (no Duo equivalent in the 91-icon set)
  compare: { lucide: GitCompareArrows },
  help: { lucide: CircleHelp },
  plus: { lucide: Plus },
  logout: { lucide: LogOut },
  check: { lucide: Check },
  close: { lucide: X },
  search: { lucide: Search },
  save: { lucide: Save },
  refresh: { lucide: RefreshCw },
  more: { lucide: Ellipsis },
  paste: { lucide: ClipboardPaste },
  sparkles: { lucide: Sparkles },
  download: { lucide: ArrowDownToLine },
  fileCheck: { lucide: FileCheck2 },
  report: { lucide: ChartNoAxesColumnIncreasing },
  trash: { lucide: Trash2 },
  trend: { lucide: TrendingUp },
  layers: { lucide: Layers3 },
  shield: { lucide: ShieldCheck },
  activity: { lucide: Activity },
  danger: { lucide: AlertCircle },
  arrowLeft: { lucide: ArrowLeft },
  arrowRight: { lucide: ArrowRight },
  arrowUpRight: { lucide: ArrowUpRight },
  arrowDownRight: { lucide: ArrowDownRight },
  minus: { lucide: Minus },
  chevronRight: { lucide: ChevronRight },
  chevronDown: { lucide: ChevronDown },
  quant: { lucide: Calculator },
  reasoning: { lucide: Brain },
  computer: { lucide: Monitor },
};

export function resolveIcon(name: IconName): IconEntry {
  return ICONS[name] ?? { lucide: Activity };
}

export type IconTone = "ink" | "accent" | "paper" | "muted" | "mono";

/**
 * Renders a single Duo glyph with token-tinted layers, or `undefined` when
 * the name has no Duo mapping (caller decides the Lucide treatment).
 *
 * @duo-icons/react's compiled SVGs use the kebab-case attribute "fill-rule",
 * which React 19 dev-mode flags. scripts/fix-duo-icons.mjs rewrites the
 * attribute to camelCase inside the installed package (wired into
 * postinstall), so the glyphs render through plain JSX with a clean console.
 * If the warning reappears after a library update, extend that script.
 */
function DuoGlyph({
  name,
  size,
  tone,
  className = "",
}: {
  name: IconName;
  size: number;
  tone: IconTone;
  className?: string;
}) {
  const Glyph = resolveIcon(name).duo;
  if (!Glyph) return null;
  const toneClass =
    tone === "accent"
      ? "icon-accent"
      : tone === "paper"
        ? "icon-paper"
        : tone === "muted"
          ? "icon-muted"
          : tone === "mono"
            ? "icon-mono"
            : "";
  return (
    <Glyph
      size={size}
      className={`icon-duo shrink-0 ${toneClass} ${className}`}
      aria-hidden="true"
    />
  );
}

/** True duotone rendering for any semantic icon name. */
export function DuotoneIcon({
  name,
  size = 18,
  tone = "ink",
  className = "",
  title,
}: {
  name: IconName;
  size?: number;
  tone?: IconTone;
  className?: string;
  /** Accessible name when the icon stands alone. */
  title?: string;
}) {
  const duo = resolveIcon(name).duo;
  if (duo) {
    return (
      <span
        className={`duotone relative inline-flex shrink-0 ${className}`}
        role={title ? "img" : undefined}
        aria-label={title}
        aria-hidden={title ? undefined : true}
      >
        <DuoGlyph name={name} size={size} tone={tone} />
      </span>
    );
  }
  // Lucide fallback keeps the echo treatment so the surface stays duotone.
  const Lucide = resolveIcon(name).lucide;
  if (!Lucide) return null;
  const mainTone =
    tone === "accent" ? "text-accent" : tone === "paper" ? "text-paper" : tone === "muted" ? "text-muted" : "text-ink";
  return (
    <span
      className={`duotone relative inline-flex shrink-0 ${className}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <Lucide
        size={size}
        strokeWidth={1.6}
        aria-hidden="true"
        className="duotone-echo absolute left-0 top-0 text-accent"
      />
      <Lucide size={size} strokeWidth={1.9} aria-hidden="true" className={`relative ${mainTone}`} />
    </span>
  );
}

/**
 * Icon inside a tile — feature cards, empty states, panel headers.
 * `tile` selects the wash; accent = terracotta wash, ink = charcoal wash.
 */
export function DuotoneTile({
  name,
  size = 22,
  tile = "accent",
  className = "",
  title,
}: {
  name: IconName;
  size?: number;
  tile?: "accent" | "ink" | "paper";
  className?: string;
  title?: string;
}) {
  const wash =
    tile === "accent"
      ? "bg-accent-soft border-accent/30"
      : tile === "ink"
        ? "bg-soft border-rule-soft"
        : "bg-paper border-rule-soft";
  const tone: IconTone = tile === "accent" ? "accent" : "ink";
  return (
    <span
      className={`duotone-tile inline-flex size-11 items-center justify-center border rounded-card ${wash} ${className}`}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      <DuotoneIcon name={name} size={size} tone={tone} />
    </span>
  );
}

/** Plain single-tone glyph for micro utility use (close, chevrons, search). */
export function PlainIcon({
  name,
  size = 16,
  className = "",
  strokeWidth = 1.75,
  tone = "ink",
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  tone?: IconTone;
}) {
  const duo = resolveIcon(name).duo;
  if (duo) {
    const Glyph = duo;
    const toneClass =
      tone === "accent"
        ? "icon-accent"
        : tone === "paper"
          ? "icon-paper"
          : tone === "muted"
            ? "icon-muted"
            : tone === "mono"
              ? "icon-mono"
              : "";
    return (
      <Glyph
        size={size}
        className={`shrink-0 icon-duo ${toneClass} ${className}`}
        aria-hidden="true"
      />
    );
  }
  const Lucide = resolveIcon(name).lucide;
  if (!Lucide) return null;
  return <Lucide size={size} strokeWidth={strokeWidth} className={`shrink-0 ${className}`} aria-hidden="true" />;
}
