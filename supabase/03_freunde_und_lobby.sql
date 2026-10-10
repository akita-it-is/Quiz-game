-- ===== Schritt 3 + 4: Freunde und Online-Lobby =====
-- Ist schon in Supabase eingespielt (von Claude über die Supabase-Verbindung). Hier zum Nachlesen.
--
-- Freundschaften: eine Zeile pro Paar. "offen" = Anfrage, "freunde" = befreundet.
-- Abgelehnte oder entfernte Freundschaften bleiben als "abgelehnt"/"entfernt" stehen
-- (so kann man sich später wieder anfragen). Wird ein Konto gelöscht, verschwinden sie mit.

create table if not exists public.freundschaft (
  von uuid not null references public.profil (id) on delete cascade,
  an uuid not null references public.profil (id) on delete cascade,
  status text not null default 'offen' check (status in ('offen', 'freunde', 'abgelehnt', 'entfernt')),
  erstellt timestamptz not null default now(),
  primary key (von, an),
  check (von <> an)
);
alter table public.freundschaft enable row level security;
create policy "Eigene Freundschaften lesen" on public.freundschaft
  for select to authenticated using (von = (select auth.uid()) or an = (select auth.uid()));
revoke all on public.freundschaft from anon, authenticated;
grant select on public.freundschaft to authenticated;
create index if not exists freundschaft_an on public.freundschaft (an);

-- Sind zwei Spieler befreundet? (wird auch für die Einladungen gebraucht)
create or replace function public.sind_freunde(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.freundschaft f where f.status = 'freunde'
    and ((f.von = a and f.an = b) or (f.von = b and f.an = a)));
$$;
revoke all on function public.sind_freunde(uuid, uuid) from public, anon;
grant execute on function public.sind_freunde(uuid, uuid) to authenticated;

-- Spieler über seinen Code finden ("k7q2x9ma" und "K7Q2-X9MA" gehen beide)
create or replace function public.finde_spieler(code text)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.profil
  where spieler_id = upper(substr(regexp_replace(code, '[^A-Za-z0-9]', '', 'g'), 1, 4)) || '-' ||
                     upper(substr(regexp_replace(code, '[^A-Za-z0-9]', '', 'g'), 5, 4));
$$;
revoke all on function public.finde_spieler(text) from public, anon, authenticated;

-- Freund per Code anfragen. sofort = true: Freundes-Link, dann sofort befreundet.
-- Antwort: gesendet, schon_gesendet, freunde, schon_freunde, selbst, nicht_gefunden
create or replace function public.freund_anfrage(code text, sofort boolean default false)
returns text language plpgsql security definer set search_path = '' as $$
declare
  ich uuid := (select auth.uid());
  ziel uuid;
  hin public.freundschaft;
  zurueck public.freundschaft;
begin
  if ich is null then raise exception 'Nicht angemeldet'; end if;
  ziel := public.finde_spieler(code);
  if ziel is null then return 'nicht_gefunden'; end if;
  if ziel = ich then return 'selbst'; end if;
  select * into hin from public.freundschaft where von = ich and an = ziel;
  select * into zurueck from public.freundschaft where von = ziel and an = ich;
  if hin.status = 'freunde' or zurueck.status = 'freunde' then return 'schon_freunde'; end if;
  -- Hat der andere mich schon angefragt? Dann sind wir jetzt befreundet.
  if sofort or zurueck.status = 'offen' then
    if zurueck.von is not null then
      update public.freundschaft set status = 'freunde' where von = ziel and an = ich;
    else
      insert into public.freundschaft (von, an, status) values (ich, ziel, 'freunde')
        on conflict (von, an) do update set status = 'freunde';
    end if;
    return 'freunde';
  end if;
  if hin.status = 'offen' then return 'schon_gesendet'; end if;
  insert into public.freundschaft (von, an, status) values (ich, ziel, 'offen')
    on conflict (von, an) do update set status = 'offen', erstellt = now();
  return 'gesendet';
end $$;

-- Anfrage annehmen oder ablehnen
create or replace function public.freund_antwort(code text, annehmen boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare
  ich uuid := (select auth.uid());
  ziel uuid := public.finde_spieler(code);
begin
  update public.freundschaft set status = case when annehmen then 'freunde' else 'abgelehnt' end
    where von = ziel and an = ich and status = 'offen';
  return case when annehmen then 'freunde' else 'abgelehnt' end;
end $$;

-- Freund entfernen (oder eigene Anfrage zurückziehen)
create or replace function public.freund_entfernen(code text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  ich uuid := (select auth.uid());
  ziel uuid := public.finde_spieler(code);
begin
  update public.freundschaft set status = 'entfernt'
    where (von = ich and an = ziel) or (von = ziel and an = ich);
  return 'entfernt';
end $$;

-- Freundesliste mit Name, Charakter und ob gerade online (in den letzten 90 Sekunden aktiv)
create or replace function public.meine_freunde()
returns table (uid uuid, spieler_id text, name text, charakter text, skin text, haustier text,
               status text, online boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.spieler_id, p.name, p.charakter, p.skins ->> p.charakter, p.haustier,
    case when f.status = 'freunde' then 'freund'
         when f.an = (select auth.uid()) then 'eingehend' else 'ausgehend' end,
    coalesce(p.zuletzt_online > now() - interval '90 seconds', false)
  from public.freundschaft f
  join public.profil p on p.id = case when f.von = (select auth.uid()) then f.an else f.von end
  where (f.von = (select auth.uid()) or f.an = (select auth.uid())) and f.status in ('offen', 'freunde')
  order by 7, 8 desc, 3;
$$;

-- Wird jede Minute aufgerufen, solange das Spiel offen ist
create or replace function public.ich_bin_online()
returns void language sql security definer set search_path = '' as $$
  update public.profil set zuletzt_online = now() where id = (select auth.uid());
$$;

revoke all on function public.freund_anfrage(text, boolean), public.freund_antwort(text, boolean),
  public.freund_entfernen(text), public.meine_freunde(), public.ich_bin_online() from public, anon;
grant execute on function public.freund_anfrage(text, boolean), public.freund_antwort(text, boolean),
  public.freund_entfernen(text), public.meine_freunde(), public.ich_bin_online() to authenticated;

-- ===== Echtzeit-Kanäle (Supabase Realtime, "private" Kanäle) =====
-- lobby:CODE         – jeder angemeldete Spieler (auch Gäste) darf beitreten
-- einladung:<uuid>   – nur der Spieler selbst empfängt; senden dürfen nur seine Freunde
create policy "Lobby-Kanäle" on realtime.messages for select to authenticated
  using (realtime.topic() like 'lobby:%');
create policy "Lobby-Kanäle senden" on realtime.messages for insert to authenticated
  with check (realtime.topic() like 'lobby:%');
create policy "Eigene Einladungen empfangen" on realtime.messages for select to authenticated
  using (realtime.topic() = 'einladung:' || (select auth.uid())::text);
create policy "Freunde einladen" on realtime.messages for insert to authenticated
  with check (realtime.topic() like 'einladung:%'
    and public.sind_freunde((select auth.uid()), substr(realtime.topic(), 11)::uuid));
