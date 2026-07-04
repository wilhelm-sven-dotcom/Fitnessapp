import { stravaSport } from "@/lib/cardio-sport";
import type { CardioSession } from "@/lib/types";

/** Official Strava OAuth + API. Client secret is used server-side only. */
export const STRAVA_AUTHORIZE = "https://www.strava.com/oauth/authorize";
export const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
export const STRAVA_API = "https://www.strava.com/api/v3";

/** Build the consent URL. `activity:read_all` also reads private (Peloton) rides. */
export function buildAuthorizeUrl(clientId: string, redirectUri: string): string {
  const p = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    approval_prompt: "auto",
    scope: "activity:read_all",
  });
  return `${STRAVA_AUTHORIZE}?${p.toString()}`;
}

/** Summary activity from `GET /athlete/activities` — fields are best-effort. */
export interface RawStravaActivity {
  id?: number;
  name?: string;
  type?: string;
  sport_type?: string;
  start_date?: string;
  elapsed_time?: number;
  moving_time?: number;
  distance?: number;
  average_heartrate?: number;
  kilojoules?: number;
  /** Only present on the per-activity detail endpoint (not the summary list). */
  calories?: number;
}

/** Map a raw Strava activity to a CardioSession. Defensive — fields may be missing. */
export function normalizeActivity(raw: RawStravaActivity): CardioSession | null {
  if (!raw || raw.id == null) return null;
  const durationSec = raw.moving_time ?? raw.elapsed_time ?? 0;
  const date = raw.start_date
    ? new Date(raw.start_date).toISOString()
    : new Date(0).toISOString();
  const kj = typeof raw.kilojoules === "number" ? Math.round(raw.kilojoules) : undefined;
  const avgHr =
    typeof raw.average_heartrate === "number" ? Math.round(raw.average_heartrate) : undefined;
  const distance = typeof raw.distance === "number" ? Math.round(raw.distance) : undefined;

  // Prefer power (kJ/min) for intensity; fall back to heart rate; else moderate.
  const mins = durationSec / 60;
  let intensity: CardioSession["intensity"];
  if (kj != null && mins > 0) {
    const kjPerMin = kj / mins;
    intensity = kjPerMin >= 9 ? "hard" : kjPerMin >= 5.5 ? "moderate" : "easy";
  } else if (avgHr != null) {
    intensity = avgHr >= 150 ? "hard" : avgHr >= 130 ? "moderate" : "easy";
  } else {
    intensity = "moderate";
  }

  const calories = typeof raw.calories === "number" ? Math.round(raw.calories) : undefined;

  return {
    id: `strava-${raw.id}`,
    source: "strava",
    sport: stravaSport(raw.type, raw.sport_type),
    date,
    durationSec,
    kj,
    calories,
    avgHr,
    distance,
    title: raw.name ?? undefined,
    intensity,
  };
}
