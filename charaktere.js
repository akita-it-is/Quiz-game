// ===== Charaktere und Skins =====
// Jeder Charakter ist ein Tier und ist besonders gut in einer Kategorie
// (das hat im Spiel noch keine Auswirkung).
//
// id          eindeutiger Name – NIE mehr ändern
// name        so heißt er im Shop und im Inventar
// tier        welches Tier er ist
// kategorie   sein Spezialgebiet – so schreiben wie in der Spalte "kategorie" der Tabelle
// text        erscheint, wenn man ihn im Shop antippt
// bild        Emoji ODER eigenes Bild, z. B. "bilder/charaktere/erling.png"
// farbe       Hintergrundfarbe des Standard-Looks
// preis       Preis im Shop (Spiel-Dollar). Den ersten Charakter bekommt man geschenkt.

const CHARAKTERE = [
  // Diese beiden kann man als Gast spielen (einen davon). Wer sich anmeldet, bekommt beide.
  { id: "hannes",  name: "Hannes",               tier: "Hund",         kategorie: "allrounder",
    text: "Hannes ist treu, neugierig und überall ein bisschen zu Hause.",
    bild: "🐶", farbe: "#c68b59", freischaltung: "anmeldung" },
  { id: "chiara",  name: "Chiara",               tier: "Katze",        kategorie: "allrounder",
    text: "Chiara tut immer so, als wüsste sie alles – und meistens stimmt's.",
    bild: "🐱", farbe: "#e8962e", freischaltung: "anmeldung" },
  { id: "erling",  name: "Erling the GOAT",      tier: "Ziege",        kategorie: "sport",
    text: "Erling ist the GOAT – in allen Sportarten.",
    bild: "🐐", farbe: "#3b82f6", preis: 500 },
  { id: "karim",   name: "Karim Kamel",          tier: "Kamel",        kategorie: "geschichte",
    text: "Karim hat ein fotografisches Gedächtnis und vergisst nie etwas.",
    bild: "🐫", farbe: "#cfa66a", preis: 500 },
  { id: "douglas", name: "Douglas Duck",         tier: "Ente",         kategorie: "social media",
    text: "Douglas Duck steckt mit seinem Lachen jeden Tag tausende Tiere an.",
    bild: "🦆", farbe: "#2fb36d", preis: 500 },
  { id: "charlie", name: "Charlie Chuckles",     tier: "Waschbär",     kategorie: "filme/serien",
    text: "Charlie hat immer Augenringe vom Nächte-Durchmachen und Serienschauen.",
    bild: "🦝", farbe: "#48426a", preis: 500 },
  { id: "ren",     name: "Ren Kyubi",            tier: "Fuchs",        kategorie: "anime",
    text: "Ren cosplayt für sein Leben gern.",
    bild: "🦊", farbe: "#e8962e", preis: 500 },
  { id: "willi",   name: "Willi Wuzz",           tier: "Schwein",      kategorie: "essen/trinken",
    text: "„Isst du das noch?“",
    bild: "🐷", farbe: "#f28bb0", preis: 500 },
  { id: "jimmy",   name: "Jimmy Lang",           tier: "Giraffe",      kategorie: "geographie",
    text: "Jimmy kann über die Erdkrümmung schauen.",
    bild: "🦒", farbe: "#f5c542", preis: 500 },
  { id: "oc",      name: "Doktor Oc",            tier: "Oktopus",      kategorie: "wissenschaft",
    text: "Kann dank seiner 8 Tentakel am besten von allen Reagenzgläser halten.",
    bild: "🐙", farbe: "#a855f7", preis: 500 },
  { id: "linus",   name: "Linus Leo",            tier: "Löwe",         kategorie: "politik",
    text: "Ist seit 4 Amtszeiten Bürgermeister. Eigentlich darf man nur 2 machen – aber keiner traut sich, es ihm zu sagen.",
    bild: "🦁", farbe: "#cd8a4f", preis: 500 },
  { id: "ruven",   name: "Ruven Raven",          tier: "Rabe",         kategorie: "mythologie",
    text: "Der Weiseste von allen. Keiner weiß, wie alt er wirklich ist – und ob seine Geschichten wahr sind oder nur Geschichten.",
    bild: "🐦‍⬛", farbe: "#26232f", preis: 500 },
  { id: "ella",    name: "Ella Eule",            tier: "Eule",         kategorie: "bücher",
    text: "Ella liest wirklich gerne.",
    bild: "🦉", farbe: "#7a5230", preis: 500 },
  { id: "gina",    name: "Gina Geschwindigkeit", tier: "Gepard",       kategorie: "superhelden",
    text: "Blitzschnell.",
    bild: "🐆", farbe: "#e5484d", preis: 500 },
  { id: "wolfgang", name: "Wolfgang",            tier: "Wolf",         kategorie: "musik",
    text: "Wolfgang hat ein perfektes Gehör.",
    bild: "🐺", farbe: "#2b4c7e", preis: 500 },
  { id: "emma",    name: "EmmaSlayer",           tier: "Eichhörnchen", kategorie: "gaming",
    text: "Blitzschnelle Reflexe.",
    bild: "🐿️", farbe: "#7c5cff", preis: 500 },
  { id: "fiona",   name: "Fiona Faul",           tier: "Faultier",     kategorie: "tiere und pflanzen",
    text: "Fiona chillt echt gerne.",
    bild: "🦥", farbe: "#4cd38a", preis: 500 },
  { id: "justin",  name: "Justin Otter",         tier: "Biber",        kategorie: "kunst & architektur",
    text: "Justin ist Bauarbeiter und zeichnet sehr gerne.",
    bild: "🦫", farbe: "#b8860b", preis: 500 },
  // Für den Maulwurf gibt es kein Emoji – bis es ein eigenes Bild gibt, steht hier der Hamster
  { id: "manny",   name: "Manny Maulwurf",       tier: "Maulwurf",     kategorie: "mathe",
    text: "Manny gräbt sich durch jede Rechnung – im Kopf, versteht sich.",
    bild: "🐹", farbe: "#5c4a3d", preis: 500 }
];

// Diese Charaktere kann man als Gast spielen
const GAST_CHARAKTERE = ["hannes", "chiara"];

// Alle anderen Charaktere gibt es im Shop – kaufen kann man sie aber erst mit Anmeldung
CHARAKTERE.forEach(function (c) {
  c.freischaltung = c.freischaltung || "shop";
  c.seltenheit = "legendär";
});

// Ist man angemeldet? (Kommt mit Supabase – bis dahin spielen alle als Gast.)
function istAngemeldet() {
  return Boolean(profil && profil.angemeldet);
}

// Darf man diesen Charakter gerade spielen?
function darfCharakterSpielen(id) {
  if (!profil.besitz.includes(id) && !(istAngemeldet() && GAST_CHARAKTERE.includes(id))) {
    return false;
  }
  // Als Gast nur Hund oder Katze
  return istAngemeldet() || GAST_CHARAKTERE.includes(id);
}

// ===== Skins =====
// charakter   für welchen Charakter (id) – oder "alle" für einen Skin, der zu jedem passt
// hintergrund Hintergrundfarbe
// rahmen      Rahmenfarbe
// extra       kleines Zusatz-Emoji (z. B. 👑), oder "" für keins
// freischaltung / preis wie in sammlung.js ("shop" + preis, "battlepass", "erfolg:<id>")
//
// Jeder Charakter hat automatisch seinen Standard-Look (kostenlos).

const SKINS = [
  // Platzhalter: für jeden Charakter eine Gold-Edition im Shop …
  ...CHARAKTERE.map(function (c) {
    return { id: c.id + "-gold", charakter: c.id, name: "Gold-Edition",
      hintergrund: "#f5c542", rahmen: "#fff3c4", extra: "✨",
      seltenheit: "episch", freischaltung: "shop", preis: 300 };
  }),
  // … und eine Nacht-Edition
  ...CHARAKTERE.map(function (c) {
    return { id: c.id + "-nacht", charakter: c.id, name: "Nacht-Edition",
      hintergrund: "#0f1a3a", rahmen: "#7c5cff", extra: "🌙",
      seltenheit: "selten", freischaltung: "shop", preis: 200 };
  }),
  // Belohnung aus dem Battlepass (Level 50, Premium) – passt zu jedem Charakter
  { id: "koenig", charakter: "alle", name: "Königs-Edition",
    hintergrund: "#8b1e3f", rahmen: "#f5c542", extra: "👑",
    seltenheit: "legendär", freischaltung: "battlepass" }
];

function findeCharakter(id) {
  return CHARAKTERE.find(function (c) { return c.id === id; });
}

function findeSkin(id) {
  return SKINS.find(function (s) { return s.id === id; });
}

// Welche Skins gibt es für diesen Charakter? (eigene + die für "alle")
function skinsFuer(charakterId) {
  return SKINS.filter(function (s) { return s.charakter === charakterId || s.charakter === "alle"; });
}

// Kategorie schön schreiben: "kunst & architektur" → "Kunst & Architektur"
function kategorieText(kategorie) {
  return kategorie.replace(/(^|[\s/&])(\p{L})/gu, function (_, vor, buchstabe) {
    return vor + buchstabe.toUpperCase();
  }).replace(/ Und /g, " und ");
}

// Baut das Bild eines Charakters mit Skin (als HTML-Text).
// Die Größe kommt von außen: Das Bild füllt das Kästchen, in dem es steckt.
function charakterBild(charakterId, skinId) {
  const c = findeCharakter(charakterId) || CHARAKTERE[0];
  const skin = findeSkin(skinId);
  const hintergrund = skin ? skin.hintergrund : c.farbe;
  const rahmen = skin ? skin.rahmen : "transparent";
  let tier = c.bild;
  if (c.bild.includes("/")) {
    tier = '<img src="' + c.bild + '" alt="">';
  }
  return '<div class="avatar" style="background:' + hintergrund + ';border-color:' + rahmen + '">' +
    '<span class="avatar-tier">' + tier + '</span>' +
    (skin && skin.extra ? '<span class="avatar-extra">' + skin.extra + '</span>' : '') +
    '</div>';
}

// Bild des eigenen, gerade gewählten Charakters
function meinCharakterBild() {
  return charakterBild(profil.charakter, profil.skins[profil.charakter]);
}
