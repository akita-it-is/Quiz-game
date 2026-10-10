// ===== Verbindung zu Supabase (Datenbank) =====
// Hier stehen nur die ÖFFENTLICHEN Zugangsdaten – die dürfen im Code stehen.
// Was man lesen und ändern darf, regeln die Sicherheitsregeln (RLS) in Supabase.
// Den "secret"/"service_role"-Key NIEMALS hier eintragen!

const SUPABASE_URL = "https://zyrfgwehsmqiyzsetafn.supabase.co";
const SUPABASE_KEY = "sb_publishable_4Tal6QJCDf5pET2MhB7xng_bC5BKQYv";

// Lädt alle Zeilen einer Tabelle, z. B. ladeTabelle("multiple_choice").
// Jede Zeile ist ein Objekt mit den Spaltennamen, genau wie bei Google Sheets.
async function ladeTabelle(name) {
  const antwort = await fetch(SUPABASE_URL + "/rest/v1/" + name + "?select=*", {
    headers: { apikey: SUPABASE_KEY },
    // Nach 10 Sekunden aufgeben, damit die Ladeanzeige nicht ewig stehen bleibt
    signal: AbortSignal.timeout(10000)
  });
  if (!antwort.ok) {
    throw new Error("Die Tabelle \"" + name + "\" konnte nicht geladen werden (Fehler " + antwort.status + ").");
  }
  return antwort.json();
}
