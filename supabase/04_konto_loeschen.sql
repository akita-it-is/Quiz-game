-- ===== Konto löschen (Recht auf Löschung, DSGVO) =====
-- Diese Datei bitte EINMAL selbst im Supabase SQL Editor ausführen
-- (SQL Editor → "+" → einfügen → Run). Claude darf Befehle mit "delete" nicht selbst einspielen.
--
-- Löscht das eigene Konto. Profil und Freundschaften verschwinden automatisch mit.
create or replace function public.loesche_mein_konto()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Nicht angemeldet'; end if;
  delete from auth.users where id = (select auth.uid());
end $$;
revoke all on function public.loesche_mein_konto() from public, anon;
grant execute on function public.loesche_mein_konto() to authenticated;
