import type { Route } from "next";

type Params = Record<string, string | string[] | undefined>;

const MAX_QUERY_LENGTH = 120;

export function readString(params: Params, key: string): string {
  const value = params[key];
  const single = Array.isArray(value) ? value[0] : value;
  return (single ?? "").trim().slice(0, MAX_QUERY_LENGTH);
}

export function readFlag(params: Params, key: string): boolean {
  const value = readString(params, key).toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function readPositiveInt(raw: string): number | null {
  if (!/^\d{1,9}$/.test(raw)) return null;
  const value = Number(raw);
  return value > 0 ? value : null;
}

/** Builds a relative URL for the same page with updated query parameters. */
export function withParams(pathname: Route, params: Record<string, string | undefined>): Route {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return (query ? `${pathname}?${query}` : pathname) as Route;
}
