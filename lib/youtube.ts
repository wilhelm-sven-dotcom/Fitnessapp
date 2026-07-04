/**
 * Parse user-pasted YouTube URLs into a video id and a privacy-domain embed URL.
 * Pure and SSR-safe (only the global `URL`). Tolerant of the shapes people
 * actually paste — Shorts, watch, youtu.be, embed, live, with or without a
 * scheme, and with any tracking query params — while refusing anything that
 * isn't a YouTube link so the overlay store can never hold a non-embeddable URL.
 */

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

// Hosts we accept, after stripping a leading "www.". Anything else → not YouTube.
const HOSTS = new Set([
  "youtube.com",
  "youtube-nocookie.com",
  "youtu.be",
  "m.youtube.com",
  "music.youtube.com",
]);

/** Extract the 11-character YouTube video id from a raw string, or null. */
export function youtubeVideoId(raw: string | null | undefined): string | null {
  // Typ-Guard: ein truthy Nicht-String (Objekt/Zahl aus korrupten Daten) darf
  // `raw.trim()` nie werfen (TypeError: raw.trim is not a function).
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s || s.length > 2048) return null;

  let url: URL;
  try {
    url = new URL(s);
  } catch {
    // People paste without a scheme ("youtu.be/ID", "youtube.com/shorts/ID").
    try {
      url = new URL("https://" + s);
    } catch {
      return null;
    }
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (!HOSTS.has(host)) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  let candidate: string | null = null;

  if (host === "youtu.be") {
    candidate = parts[0] ?? null;
  } else if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") {
    candidate = parts[1] ?? null;
  } else if (parts[0] === "watch") {
    candidate = url.searchParams.get("v");
  }
  // No last-segment fallback: it produced false positives ("videoseries",
  // 11-char channel handles) that render broken embeds instead of rejecting.

  return candidate && ID_RE.test(candidate) ? candidate : null;
}

/**
 * Build a privacy-domain (youtube-nocookie) embeddable URL for a raw YouTube
 * URL, or null if it isn't a YouTube link. `rel=0` keeps end-card suggestions
 * to the same channel.
 */
export function youtubeEmbedUrl(raw: string | null | undefined): string | null {
  const id = youtubeVideoId(raw);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
}

/** Whether a raw string parses as a YouTube link. */
export function isYoutubeUrl(raw: string | null | undefined): boolean {
  return youtubeVideoId(raw) != null;
}
