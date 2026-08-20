# Supabase einrichten

Von oben nach unten abarbeiten. Danach kann sich die App anmelden, synct und
braucht dafür **keine einzige Mail**.

Zwei Dinge musst du dir vorher heraussuchen:

- **Project-Ref** — die Subdomain aus `NEXT_PUBLIC_SUPABASE_URL`, also das
  `<ref>` in `https://<ref>.supabase.co`.
- **Access-Token** (nur für Abschnitt B und C, nicht fürs SQL) — anlegen unter
  `supabase.com/dashboard/account/tokens`, beginnt mit `sbp_`.

---

## A · Datenbank

Supabase-Dashboard → **SQL Editor** → New query → das Folgende einfügen → Run.

Der Block läuft **gefahrlos mehrfach**: Tabelle und Bucket entstehen nur, wenn
sie fehlen, und jede Policy wird vorher weggeräumt. Du kannst ihn also auch
dann einwerfen, wenn dein Projekt schon halb steht.

```sql
-- Cloud-Sync store for the training app.
-- One row per (user, storage key); `value` holds the same JSON string that
-- localStorage holds. Last-write-wins via `updated_at` (single user, several devices).

create table if not exists public.app_state (
  user_id    uuid        not null references auth.users on delete cascade,
  key        text        not null,
  value      text        not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.app_state enable row level security;

-- A user may only ever see or touch their own rows.
drop policy if exists "app_state_select_own" on public.app_state;
create policy "app_state_select_own"
  on public.app_state for select
  using (auth.uid() = user_id);

drop policy if exists "app_state_insert_own" on public.app_state;
create policy "app_state_insert_own"
  on public.app_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "app_state_update_own" on public.app_state;
create policy "app_state_update_own"
  on public.app_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "app_state_delete_own" on public.app_state;
create policy "app_state_delete_own"
  on public.app_state for delete
  using (auth.uid() = user_id);

-- Private bucket for progress photos. Each user's files live under a folder
-- named with their user id ("<uid>/<photoId>"), enforced by RLS.

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- One policy for every operation: the first path segment must be the caller's uid.
drop policy if exists "progress_photos_own" on storage.objects;
create policy "progress_photos_own"
  on storage.objects for all
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

Wer das Repo ausgecheckt hat, kann sich dasselbe auch direkt holen — die
Migrationsdateien sind die Quelle dieses Blocks:

```bash
cat supabase/migrations/*.sql
```

**Was das anlegt.** `public.app_state` ist der Cloud-Spiegel des lokalen
Speichers: eine Zeile je (Nutzer, Schlüssel), `value` enthält denselben
JSON-String wie `localStorage`. Die vier Policies sperren jede Zeile auf ihren
Besitzer (`auth.uid() = user_id`) — der Anon-Key darf öffentlich sein, die
Sicherheit kommt aus der Row-Level-Security, nicht aus Geheimhaltung. Der
private Bucket `progress-photos` hält die Vorher/Nachher-Fotos, je Nutzer in
einem Ordner mit seiner ID; die Policy erzwingt genau das.

---

## B · Die zwei Auth-Schalter

Damit „Konto anlegen" ohne Mail durchläuft.

**Zum Klicken:** Dashboard → **Authentication** → **Sign In / Providers** →
**Email**

- `Allow new users to sign up` → **an**
- `Confirm email` → **aus**

**Als Befehl** — dasselbe über die Management-API:

```bash
export SUPABASE_ACCESS_TOKEN="sbp_…"
export PROJECT_REF="…"

curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "disable_signup": false, "mailer_autoconfirm": true }'
```

`disable_signup: false` = Registrierung erlaubt.
`mailer_autoconfirm: true` = keine Bestätigungsmail, das Konto gilt sofort.

Gegenprüfen, ob es angekommen ist:

```bash
curl -s "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | grep -oE '"(disable_signup|mailer_autoconfirm|rate_limit_email_sent)":[^,}]*'
```

Erwartet: `"disable_signup":false` und `"mailer_autoconfirm":true`.

> Ist `Confirm email` aus, kann sich jeder mit jeder Adresse registrieren. Für
> eine private App unkritisch: die Row-Level-Security hängt an der User-ID, nicht
> an einer bestätigten Adresse — fremde Konten sehen deine Daten nicht.

---

## C · Mail-Limit — nur falls du den Mail-Weg wirklich brauchst

Der **eingebaute Supabase-Mailer hat eine harte Stundenrate** (eine Handvoll
Mails, projektweit). Die lässt sich nicht hochdrehen. Der Regler
`rate_limit_email_sent` existiert zwar, greift aber **erst mit eigenem SMTP** —
solange der eingebaute Mailer läuft, ist er wirkungslos.

Reihenfolge, wenn du es brauchst:

1. Dashboard → **Project Settings** → **Authentication** → **SMTP Settings** →
   eigenen SMTP-Server hinterlegen (Resend, Postmark, Mailgun, der eigene
   Mailserver — egal, Hauptsache nicht der eingebaute).
2. Danach das Limit setzen:

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "rate_limit_email_sent": 100 }'
```

Für den normalen Betrieb der App brauchst du das **nicht** — Anmelden und
Kontoanlegen laufen über Passwort und rühren den Mailer gar nicht an.

---

## Woran du merkst, dass es steht

App → **Einstellungen** → **Verbindungen** → E-Mail und Passwort eintragen →
**Konto anlegen**.

| Was passiert | Bedeutung |
| --- | --- |
| „Konto angelegt — du bist angemeldet." | Alles steht. |
| Hinweis auf eine Bestätigungsmail | `mailer_autoconfirm` fehlt noch (Abschnitt B). |
| „Registrierung ist im Supabase-Projekt abgeschaltet" | `disable_signup` steht noch auf `true` (Abschnitt B). |
| „Für diese Adresse gibt es schon ein Konto" | Kein Fehler — nimm „Anmelden". |
| Fehler beim Synchronisieren | Abschnitt A lief nicht durch. |

Fotos unter Fortschritt → Körper prüfen den Bucket aus Abschnitt A separat —
wenn Sync läuft, aber Fotos nicht hochgehen, fehlt `0002`.
