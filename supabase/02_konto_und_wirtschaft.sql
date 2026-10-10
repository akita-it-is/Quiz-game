-- ===== Schritt 1 + 2: Spielerprofil (Anmeldung) und sichere Wirtschaft =====
-- Ist schon in Supabase eingespielt (von Claude über die Supabase-Verbindung). Hier zum Nachlesen.
-- Die Funktion zum Konto-Löschen steht in 04_konto_loeschen.sql.
--
-- Grundidee:
--  * Jeder Spieler (auch Gäste) hat ein Konto in Supabase Auth und genau eine Zeile in "profil".
--  * Harmlose Dinge (Name, Charakter, Skins, Deck, Statistik, Erfolge) darf das Spiel selbst ändern.
--  * Geld, Besitz, XP und Battlepass ändern NUR die Funktionen unten. Die prüfen alles,
--    damit niemand schummeln kann (z. B. sich selbst Geld geben).

-- ---------- Profil ----------

create table if not exists public.profil (
  id               uuid primary key references auth.users (id) on delete cascade,
  spieler_id       text not null unique,                 -- z. B. K7Q2-X9MA, darüber fügen Freunde dich hinzu
  name             text not null default 'Neuer Spieler',
  charakter        text,
  skins            jsonb not null default '{}',          -- { "erling": "erling-gold" }
  deck             jsonb not null default '{"emote": [], "spruch": []}',
  haustier         text,
  statistik        jsonb not null default '{"richtigGesamt": 0, "serie": 0, "besteSerie": 0, "spiele": 0}',
  erfolge          jsonb not null default '{}',
  dollar           integer not null default 0 check (dollar >= 0),
  xp               integer not null default 0 check (xp >= 0),
  besitz           text[] not null default '{}',
  bp_premium       boolean not null default false,
  bp_abgeholt      jsonb not null default '{"gratis": [], "premium": []}',
  importiert       boolean not null default false,       -- altes Profil vom Gerät schon übernommen?
  belohnung_tag    date,                                  -- für das Tageslimit
  belohnung_runden integer not null default 0,
  belohnung_xp     integer not null default 0,
  letzte_belohnung timestamptz,
  zuletzt_online   timestamptz,
  erstellt         timestamptz not null default now(),
  constraint name_laenge check (char_length(btrim(name)) between 3 and 16)
);

alter table public.profil enable row level security;

-- Jeder sieht und ändert nur sein eigenes Profil
create policy "Eigenes Profil lesen" on public.profil
  for select to authenticated using (id = (select auth.uid()));
create policy "Eigenes Profil ändern" on public.profil
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Nur diese Spalten darf das Spiel direkt ändern – Geld, Besitz, XP usw. nicht
revoke all on public.profil from anon, authenticated;
grant select on public.profil to authenticated;
grant update (name, charakter, skins, deck, haustier, statistik, erfolge) on public.profil to authenticated;

-- Ist dieser Spieler ein Gast (anonymes Konto)?
create or replace function public.ist_gast(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_anonymous from auth.users where id = uid), true);
$$;
revoke all on function public.ist_gast(uuid) from public, anon, authenticated;

-- Neue Spieler-ID wie K7Q2-X9MA (ohne 0/O und 1/I)
create or replace function public.neue_spieler_id()
returns text language plpgsql set search_path = '' as $$
declare
  zeichen constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  neue_id text;
begin
  loop
    neue_id := '';
    for i in 1..8 loop
      neue_id := neue_id || substr(zeichen, 1 + floor(random() * 32)::int, 1);
      if i = 4 then neue_id := neue_id || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.profil p where p.spieler_id = neue_id);
  end loop;
  return neue_id;
end $$;
revoke all on function public.neue_spieler_id() from public, anon, authenticated;

-- Jedes neue Konto (auch Gäste) bekommt automatisch ein Profil
create or replace function public.neues_konto()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profil (id, spieler_id) values (new.id, public.neue_spieler_id());
  return new;
end $$;
create or replace trigger neues_konto after insert on auth.users
  for each row execute function public.neues_konto();

-- Trigger-Funktionen darf niemand direkt aufrufen
revoke all on function public.neues_konto() from public, anon, authenticated;

-- Prüft Änderungen am Profil: Name, Charakter und Skins nur, wenn erlaubt
create or replace function public.pruefe_profil()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  gast_figuren constant text[] := array['hannes', 'chiara'];
  wert text;
begin
  new.name := btrim(new.name);

  if new.charakter is distinct from old.charakter and new.charakter is not null then
    if new.charakter = any (gast_figuren) then
      if public.ist_gast(new.id) then
        -- Gäste bekommen genau einen der beiden geschenkt (den ersten, den sie wählen)
        if not (new.besitz && gast_figuren) then
          new.besitz := array_append(new.besitz, new.charakter);
        elsif not (new.charakter = any (new.besitz)) then
          raise exception 'Als Gast kannst du nur einen der beiden Charaktere spielen.';
        end if;
      end if;
    elsif not (new.charakter = any (new.besitz)) then
      raise exception 'Diesen Charakter besitzt du nicht.';
    end if;
  end if;

  if new.skins is distinct from old.skins then
    for wert in select value from jsonb_each_text(new.skins) loop
      if wert is not null and not (wert = any (new.besitz)) then
        raise exception 'Diesen Skin besitzt du nicht.';
      end if;
    end loop;
  end if;
  return new;
end $$;
create or replace trigger pruefe_profil before update on public.profil
  for each row execute function public.pruefe_profil();
revoke all on function public.pruefe_profil() from public, anon, authenticated;

-- Übernimmt einmalig ein altes Profil, das nur auf dem Gerät gespeichert war.
-- Gilt nur bis zum öffentlichen Start (danach gibt es keine alten Geräte-Profile mehr).
create or replace function public.importiere_profil(daten jsonb)
returns public.profil language plpgsql security definer set search_path = '' as $$
declare
  ergebnis public.profil;
  bis constant date := date '2027-03-31';
begin
  if (select auth.uid()) is null then raise exception 'Nicht angemeldet'; end if;
  select * into ergebnis from public.profil where id = (select auth.uid());
  if ergebnis.importiert or current_date > bis then
    return ergebnis;
  end if;
  update public.profil set
    importiert  = true,
    -- Geld, XP und Besitz nur mit Obergrenze (damit niemand sich etwas "importiert")
    dollar      = least(greatest(coalesce((daten ->> 'dollar')::int, 0), 0), 1000),
    xp          = least(greatest(coalesce((daten ->> 'xp')::int, 0), 0), 5000),
    besitz      = (select coalesce(array_agg(distinct b), '{}') from
                    (select jsonb_array_elements_text(coalesce(daten -> 'besitz', '[]')) b limit 100) x
                    where char_length(b) <= 40),
    bp_premium  = coalesce((daten -> 'battlepass' ->> 'premium')::boolean, false),
    bp_abgeholt = coalesce(daten -> 'battlepass' -> 'abgeholt', '{"gratis": [], "premium": []}'),
    statistik   = coalesce(daten -> 'statistik', statistik),
    erfolge     = coalesce(daten -> 'erfolge', erfolge),
    deck        = coalesce(daten -> 'deck', deck),
    haustier    = daten ->> 'haustier'
  where id = (select auth.uid());
  -- Name, Charakter und Skins einzeln, damit ein ungültiger Wert nicht alles verhindert
  begin
    update public.profil set name = daten ->> 'name' where id = (select auth.uid());
  exception when others then null; end;
  begin
    update public.profil set charakter = daten ->> 'charakter' where id = (select auth.uid());
  exception when others then null; end;
  begin
    update public.profil set skins = coalesce(daten -> 'skins', '{}') where id = (select auth.uid());
  exception when others then null; end;
  select * into ergebnis from public.profil where id = (select auth.uid());
  return ergebnis;
end $$;

-- ---------- Shop ----------
-- Alles, was man kaufen kann, mit Preis. Muss zu den Preisen in charaktere.js / sammlung.js passen!
create table if not exists public.shop_artikel (
  id              text primary key,
  preis           integer not null check (preis > 0),
  nur_angemeldet  boolean not null default false,   -- Charaktere gibt es erst mit Anmeldung
  braucht         text                              -- Skins: nur, wenn man den Charakter hat
);
alter table public.shop_artikel enable row level security;
create policy "Shop lesen" on public.shop_artikel for select to anon, authenticated using (true);
grant select on public.shop_artikel to anon, authenticated;

-- Kauft einen Artikel: prüft Preis, Geld, Anmeldung und ob man ihn schon hat
create or replace function public.kaufe(artikel text)
returns public.profil language plpgsql security definer set search_path = '' as $$
declare
  a public.shop_artikel;
  p public.profil;
begin
  select * into p from public.profil where id = (select auth.uid()) for update;
  if not found then raise exception 'Nicht angemeldet'; end if;
  select * into a from public.shop_artikel where id = artikel;
  if not found then raise exception 'Diesen Artikel gibt es nicht.'; end if;
  if artikel = any (p.besitz) then raise exception 'Das hast du schon.'; end if;
  if a.nur_angemeldet and public.ist_gast(p.id) then
    raise exception 'Melde dich an, um das zu kaufen.';
  end if;
  if a.braucht is not null and not (a.braucht = any (p.besitz)
      or (a.braucht in ('hannes', 'chiara') and not public.ist_gast(p.id))) then
    raise exception 'Dafür brauchst du erst den passenden Charakter.';
  end if;
  if p.dollar < a.preis then raise exception 'Dafür reicht dein Geld nicht.'; end if;
  update public.profil set dollar = dollar - a.preis, besitz = array_append(besitz, artikel)
    where id = p.id returning * into p;
  return p;
end $$;

-- ---------- Battlepass ----------
-- 50 Level, 100 XP pro Level. Jede Stufe gibt 1 $, Premium Level 50 den Königs-Skin.
-- (Muss zu BATTLEPASS in wirtschaft.js passen.)

create or replace function public.kaufe_battlepass()
returns public.profil language plpgsql security definer set search_path = '' as $$
declare
  preis constant int := 1000;
  p public.profil;
begin
  select * into p from public.profil where id = (select auth.uid()) for update;
  if not found then raise exception 'Nicht angemeldet'; end if;
  if p.bp_premium then return p; end if;
  if p.dollar < preis then raise exception 'Dafür reicht dein Geld nicht.'; end if;
  update public.profil set dollar = dollar - preis, bp_premium = true where id = p.id returning * into p;
  return p;
end $$;

-- Holt Battlepass-Belohnungen ab. Ohne Angaben: alle, die offen sind.
create or replace function public.hole_battlepass(nur_level int default null, nur_leiste text default null)
returns public.profil language plpgsql security definer set search_path = '' as $$
declare
  max_level constant int := 50;
  xp_pro_level constant int := 100;
  p public.profil;
  stufe int;
  leiste text;
  abgeholt jsonb;
  dazu int := 0;
  neu text[];
begin
  select * into p from public.profil where id = (select auth.uid()) for update;
  if not found then raise exception 'Nicht angemeldet'; end if;
  abgeholt := p.bp_abgeholt;
  neu := p.besitz;
  for stufe in 1 .. least(max_level, p.xp / xp_pro_level) loop
    foreach leiste in array array['gratis', 'premium'] loop
      continue when nur_level is not null and stufe <> nur_level;
      continue when nur_leiste is not null and leiste <> nur_leiste;
      continue when leiste = 'premium' and not p.bp_premium;
      continue when coalesce(abgeholt -> leiste, '[]') @> to_jsonb(stufe);
      if leiste = 'premium' and stufe = max_level then
        if not ('koenig' = any (neu)) then neu := array_append(neu, 'koenig'); end if;
      else
        dazu := dazu + 1;
      end if;
      abgeholt := jsonb_set(abgeholt, array[leiste], coalesce(abgeholt -> leiste, '[]') || to_jsonb(stufe));
    end loop;
  end loop;
  update public.profil set dollar = dollar + dazu, besitz = neu, bp_abgeholt = abgeholt
    where id = p.id returning * into p;
  return p;
end $$;

-- ---------- Belohnung nach dem Spiel ----------
-- 1 $ pro gespielter Runde (höchstens 50 Runden pro Tag) und XP:
-- 10 pro Frage + 10 pro richtiger Antwort (höchstens 3000 XP pro Tag).
create or replace function public.spiel_belohnung(runden int, fragen int, richtige int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  dollar_pro_runde constant int := 1;
  max_runden_tag   constant int := 50;
  max_xp_tag       constant int := 3000;
  heute date := (now() at time zone 'Europe/Berlin')::date;
  p public.profil;
  dollar_neu int;
  xp_neu int;
begin
  select * into p from public.profil where id = (select auth.uid()) for update;
  if not found then raise exception 'Nicht angemeldet'; end if;
  -- Nicht öfter als alle 20 Sekunden (ein Spiel dauert länger)
  if p.letzte_belohnung is not null and p.letzte_belohnung > now() - interval '20 seconds' then
    return jsonb_build_object('dollar', 0, 'xp', 0, 'profil', to_jsonb(p));
  end if;
  if p.belohnung_tag is distinct from heute then
    p.belohnung_runden := 0;
    p.belohnung_xp := 0;
  end if;
  runden   := least(greatest(coalesce(runden, 0), 0), 15);
  fragen   := least(greatest(coalesce(fragen, 0), 0), 100);
  richtige := least(greatest(coalesce(richtige, 0), 0), fragen);
  dollar_neu := greatest(least(runden, max_runden_tag - p.belohnung_runden), 0) * dollar_pro_runde;
  xp_neu := greatest(least(fragen * 10 + richtige * 10, max_xp_tag - p.belohnung_xp), 0);
  update public.profil set
    dollar = dollar + dollar_neu,
    xp = xp + xp_neu,
    belohnung_tag = heute,
    belohnung_runden = p.belohnung_runden + dollar_neu / dollar_pro_runde,
    belohnung_xp = p.belohnung_xp + xp_neu,
    letzte_belohnung = now()
  where id = p.id returning * into p;
  return jsonb_build_object('dollar', dollar_neu, 'xp', xp_neu, 'profil', to_jsonb(p));
end $$;

-- Nur angemeldete Spieler (auch Gäste) dürfen diese Funktionen aufrufen
revoke all on function public.importiere_profil(jsonb),
  public.kaufe(text), public.kaufe_battlepass(), public.hole_battlepass(int, text),
  public.spiel_belohnung(int, int, int) from public, anon;
grant execute on function public.importiere_profil(jsonb),
  public.kaufe(text), public.kaufe_battlepass(), public.hole_battlepass(int, text),
  public.spiel_belohnung(int, int, int) to authenticated;

-- Alle Artikel. Muss zu charaktere.js und sammlung.js passen (Preise dort ändern = hier auch).
insert into public.shop_artikel (id, preis, nur_angemeldet, braucht)
select c, 500, true, null from unnest(array['erling', 'karim', 'douglas', 'charlie', 'ren', 'willi',
  'jimmy', 'oc', 'linus', 'ruven', 'ella', 'gina', 'wolfgang', 'emma', 'fiona', 'justin', 'manny']) c
union all
select c || '-gold', 300, false, c from unnest(array['hannes', 'chiara', 'erling', 'karim', 'douglas',
  'charlie', 'ren', 'willi', 'jimmy', 'oc', 'linus', 'ruven', 'ella', 'gina', 'wolfgang', 'emma',
  'fiona', 'justin', 'manny']) c
union all
select c || '-nacht', 200, false, c from unnest(array['hannes', 'chiara', 'erling', 'karim', 'douglas',
  'charlie', 'ren', 'willi', 'jimmy', 'oc', 'linus', 'ruven', 'ella', 'gina', 'wolfgang', 'emma',
  'fiona', 'justin', 'manny']) c
union all
values ('krone', 500, false, null), ('koenig-spruch', 300, false, null), ('kaefer', 400, false, null)
on conflict (id) do update set preis = excluded.preis, nur_angemeldet = excluded.nur_angemeldet,
  braucht = excluded.braucht;
