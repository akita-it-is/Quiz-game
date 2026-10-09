// ===== Sammlung: alle Emotes und Sprüche =====
// Neue Einträge einfach unten in die Liste schreiben (Komma am Ende nicht vergessen!).
//
// id            eindeutiger Name – NIE mehr ändern, sonst verlieren Spieler ihren Eintrag
// name / text   was angezeigt wird
// bild          ein Emoji ("👋") ODER ein eigenes Bild ("bilder/emotes/ritter-jubel.gif")
// seltenheit    "gewöhnlich", "selten", "episch" oder "legendär" (bestimmt die Rahmenfarbe)
// freischaltung wie man es bekommt:
//                 "start"          hat jeder von Anfang an
//                 "erfolg:serie5"  wenn der Erfolg mit dieser id geschafft ist (siehe erfolge.js)
//                 "shop"           im Shop kaufen – dann auch "preis" (in Spiel-Dollar) angeben
//                 "battlepass"     Belohnung aus dem Battlepass

const EMOTES = [
  { id: "winken",  name: "Winken",  bild: "👋", seltenheit: "gewöhnlich", freischaltung: "start" },
  { id: "lachen",  name: "Lachen",  bild: "😂", seltenheit: "gewöhnlich", freischaltung: "start" },
  { id: "jubeln",  name: "Jubeln",  bild: "🎉", seltenheit: "gewöhnlich", freischaltung: "start" },
  { id: "gruebeln", name: "Grübeln", bild: "🤔", seltenheit: "selten",    freischaltung: "start" },
  { id: "cool",    name: "Cool",    bild: "😎", seltenheit: "episch",     freischaltung: "erfolg:serie5" },
  { id: "krone",   name: "Krone",   bild: "👑", seltenheit: "legendär",   freischaltung: "shop", preis: 500 }
];

const SPRUECHE = [
  { id: "gg",          text: "GG!",                               seltenheit: "gewöhnlich", freischaltung: "start" },
  { id: "zu-leicht",   text: "Zu leicht!",                        seltenheit: "gewöhnlich", freischaltung: "start" },
  { id: "glueck",      text: "Glück gehabt …",                    seltenheit: "gewöhnlich", freischaltung: "start" },
  { id: "wusste-ich",  text: "Das wusste ich!",                   seltenheit: "selten",     freischaltung: "erfolg:richtig10" },
  { id: "koenig",      text: "Ich bin der König der Tafelrunde!", seltenheit: "legendär",   freischaltung: "shop", preis: 300 }
];

// Haustiere sind Insekten – nur Optik, sie sitzen neben deinem Charakter.
// Hinweis: Für die Hummel gibt es kein eigenes Emoji – bis es ein eigenes Bild gibt,
// sieht sie aus wie die Biene.
const HAUSTIERE = [
  { id: "biene",         name: "Biene",         bild: "🐝", seltenheit: "gewöhnlich", freischaltung: "start" },
  { id: "schmetterling", name: "Schmetterling", bild: "🦋", seltenheit: "gewöhnlich", freischaltung: "start" },
  { id: "hummel",        name: "Hummel",        bild: "🐝", seltenheit: "selten",     freischaltung: "erfolg:richtig10" },
  { id: "kaefer",        name: "Käfer",         bild: "🪲", seltenheit: "episch",     freischaltung: "shop", preis: 400 }
];
