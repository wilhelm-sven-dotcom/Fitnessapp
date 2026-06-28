import {
  PELOTON_BASE,
  normalizeRide,
  type RawPelotonWorkout,
} from "@/lib/peloton";
import type { CardioSession } from "@/lib/types";

// Needs the Node runtime to talk to the (unofficial) Peloton API server-side.
export const runtime = "nodejs";

const HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "fitnessapp/1.0",
  "Peloton-Platform": "web",
};

interface Body {
  action?: "login" | "sync";
  username?: string;
  password?: string;
  userId?: string;
  sessionId?: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  try {
    if (body.action === "login") {
      if (!body.username || !body.password) {
        return Response.json({ ok: false, error: "E-Mail und Passwort nötig." });
      }
      const res = await fetch(`${PELOTON_BASE}/auth/login`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({
          username_or_email: body.username,
          password: body.password,
        }),
      });
      if (!res.ok) {
        return Response.json({
          ok: false,
          error:
            res.status === 401
              ? "Login fehlgeschlagen — E-Mail/Passwort prüfen."
              : `Peloton-Fehler (${res.status}).`,
        });
      }
      const data = (await res.json()) as { user_id?: string; session_id?: string };
      if (!data.user_id || !data.session_id) {
        return Response.json({ ok: false, error: "Unerwartete Antwort von Peloton." });
      }
      // Password is used here only — never returned or stored.
      return Response.json({
        ok: true,
        userId: data.user_id,
        sessionId: data.session_id,
        username: body.username,
      });
    }

    if (body.action === "sync") {
      if (!body.userId || !body.sessionId) {
        return Response.json({ ok: false, error: "Nicht verbunden." });
      }
      const res = await fetch(
        `${PELOTON_BASE}/api/user/${body.userId}/workouts?joins=ride&limit=25&page=0`,
        { headers: { ...HEADERS, Cookie: `peloton_session_id=${body.sessionId}` } },
      );
      if (res.status === 401) {
        return Response.json({
          ok: false,
          reauth: true,
          error: "Sitzung abgelaufen — bitte neu einloggen.",
        });
      }
      if (!res.ok) {
        return Response.json({ ok: false, error: `Peloton-Fehler (${res.status}).` });
      }
      const data = (await res.json()) as { data?: RawPelotonWorkout[] };
      const raw = Array.isArray(data.data) ? data.data : [];
      const rides = raw
        .filter((w) => w.fitness_discipline === "cycling")
        .map(normalizeRide)
        .filter((r): r is CardioSession => r !== null);
      return Response.json({ ok: true, rides });
    }

    return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
  } catch (e) {
    return Response.json({
      ok: false,
      error: e instanceof Error ? e.message : "Netzwerkfehler",
    });
  }
}
