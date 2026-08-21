// A bare `toLocaleDateString()` picks up whatever locale the runtime
// defaults to — Node's ICU build on the server can differ from the
// browser's on the client (e.g. "19/8/2026" vs "19/08/2026"), which is a
// hydration mismatch since the same string must render on both sides.
// Pinning the locale and format explicitly makes it deterministic everywhere.
export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
