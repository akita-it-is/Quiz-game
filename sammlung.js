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

// Haustiere – nur Optik, sitzen neben deinem Charakter
const HAUSTIERE = [
  { id: "hund",    name: "Hund",    bild: "🐶", seltenheit: "gewöhnlich", freischaltung: "start" },
  { id: "katze",   name: "Katze",   bild: "🐱", seltenheit: "gewöhnlich", freischaltung: "start" },
  { id: "fuchs",   name: "Fuchs",   bild: "🦊", seltenheit: "selten",     freischaltung: "erfolg:richtig10" },
  { id: "eule",    name: "Eule",    bild: "🦉", seltenheit: "episch",     freischaltung: "shop", preis: 400 },
  { id: "drache",  name: "Drache",  bild: "🐉", seltenheit: "legendär",   freischaltung: "shop", preis: 800 }
];
