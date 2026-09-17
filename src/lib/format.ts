/**
 * Presentation helpers. All dates render in UTC so server output is stable
 * regardless of where the console is hosted; the ISO value is exposed via
 * `title` for anyone who needs the exact instant.
 */

const absolute = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateOnly = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "numeric",
});

/** Some systems of record emit naive timestamps (no zone). Treat those as UTC. */
export function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parseTimestamp(value);
  return date ? `${absolute.format(date)} UTC` : "—";
}

export function formatDate(value: string | null | undefined): string {
  const date = parseTimestamp(value);
  return date ? dateOnly.format(date) : "—";
}

export function formatRelative(value: string | null | undefined, now: Date = new Date()): string {
  const date = parseTimestamp(value);
  if (!date) return "—";
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const abs = Math.abs(seconds);
  const suffix = seconds >= 0 ? "ago" : "from now";

  if (abs < 45) return "just now";
  if (abs < 3600) return `${Math.round(abs / 60)}m ${suffix}`;
  if (abs < 86_400) return `${Math.round(abs / 3600)}h ${suffix}`;
  if (abs < 86_400 * 30) return `${Math.round(abs / 86_400)}d ${suffix}`;
  return dateOnly.format(date);
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const local = name.split("@")[0] ?? name;
  const parts = local.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || local.slice(0, 2).toUpperCase();
}

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

const CLOSED = /^(resolved|closed|done|complete|completed|cancel+ed)$/i;
const WAITING = /waiting|blocked|on hold|pending/i;
const ACTIVE = /progress|assigned|working/i;

export function statusTone(status: string | null | undefined): Tone {
  if (!status) return "neutral";
  if (CLOSED.test(status.trim())) return "success";
  if (WAITING.test(status)) return "warning";
  if (ACTIVE.test(status)) return "info";
  return "accent";
}

export function priorityTone(priority: string | null | undefined): Tone {
  switch (priority?.toLowerCase()) {
    case "critical":
    case "urgent":
      return "danger";
    case "high":
      return "warning";
    case "medium":
    case "normal":
      return "info";
    case "low":
      return "neutral";
    default:
      return "neutral";
  }
}

export function isOpenStatus(status: string | null | undefined): boolean {
  return statusTone(status) !== "success";
}

export function hostnameOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.host || parsed.pathname || url;
  } catch {
    return url;
  }
}
