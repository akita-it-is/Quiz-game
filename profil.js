// ===== Profil: Name, Charakter, Statistik – wird im Browser gespeichert =====

// Alle Teile, aus denen man seinen Charakter zusammenstellt (provisorische Modelle)
const FIGUR_TEILE = {
  figur: {
    titel: "Figur",
    auswahl: [
      { name: "Figur 1", haut: "#f2c9a0", haare: "#6b3e1f" },
      { name: "Figur 2", haut: "#c68b59", haare: "#1e1b1b" },
      { name: "Figur 3", haut: "#7a4b2a", haare: "#e8c35a" }
    ]
  },
  kopf: {
    titel: "Kopf",
    auswahl: [
      { name: "Nichts", art: "keins" },
      { name: "Krone", art: "krone", farbe: "#f5c542" },
      { name: "Kappe", art: "kappe", farbe: "#e5484d" },
      { name: "Zauberhut", art: "zauberhut", farbe: "#7c5cff" }
    ]
  },
  oberteil: {
    titel: "Oberteil",
    auswahl: [
      { name: "Rotes Shirt", farbe: "#e5484d" },
      { name: "Blaues Shirt", farbe: "#3b82f6" },
      { name: "Grünes Shirt", farbe: "#2fb36d" },
      { name: "Ritterrüstung", farbe: "#b8c2d6" },
      // Belohnung aus dem Battlepass (Level 50, Premium)
      { id: "bp-ruestung", name: "Goldene Rüstung", farbe: "#f5c542", seltenheit: "legendär", freischaltung: "battlepass" }
    ]
  },
  hose: {
    titel: "Hose",
    auswahl: [
      { name: "Jeans", farbe: "#2b4c7e" },
      { name: "Schwarz", farbe: "#26232f" },
      { name: "Braun", farbe: "#7a5230" }
    ]
  },
  schuhe: {
    titel: "Schuhe",
    auswahl: [
      { name: "Weiß", farbe: "#f2f0fa" },
      { name: "Schwarz", farbe: "#111111" },
      { name: "Rot", farbe: "#e5484d" }
    ]
  }
};

// Liest das gespeicherte Profil (oder null, wenn es noch keins gibt)
function ladeProfil() {
  try {
    const text = localStorage.getItem("quiz-profil");
    return text ? JSON.parse(text) : null;
  } catch (e) {
    return null;
  }
}

// Speichert das Profil im Browser
function speichereProfil() {
  try {
    localStorage.setItem("quiz-profil", JSON.stringify(profil));
  } catch (e) {
    // Speichern nicht möglich (z. B. privater Modus) – dann gilt es nur bis zum Neuladen
  }
}

// Löscht das Profil aus dem Browser (Recht auf Löschung)
function loescheProfil() {
  try {
    localStorage.removeItem("quiz-profil");
  } catch (e) {
    // nichts gespeichert – nichts zu löschen
  }
  profil = null;
}

// Ein neues Gast-Profil mit zufälligem Namen
function neuesProfil() {
  return {
    name: zufallsName(),
    figur: { figur: 0, kopf: 0, oberteil: 0, hose: 0, schuhe: 0 },
    statistik: { richtigGesamt: 0, serie: 0, besteSerie: 0, spiele: 0 },
    erfolge: {},
    dollar: 0,                       // Spielgeld
    xp: 0,                           // Erfahrungspunkte für den Battlepass
    besitz: [],                      // gekaufte oder freigespielte Dinge (ids)
    deck: { emote: [], spruch: [] }, // je bis zu 4 fürs Online-Spiel
    haustier: null,                  // id des ausgerüsteten Haustiers
    battlepass: { premium: false, abgeholt: { gratis: [], premium: [] } },
    spielerId: neueSpielerId(),      // darüber fügen dich Freunde hinzu
    freunde: []                      // [{ id, name }]
  };
}

// Erfindet einen Namen wie "Flinker Fuchs 42"
function zufallsName() {
  const eigenschaften = ["Flinker", "Schlauer", "Mutiger", "Lustiger", "Wilder", "Edler", "Tapferer", "Kluger", "Listiger", "Fröhlicher"];
  const wesen = ["Fuchs", "Drache", "Ritter", "Falke", "Bär", "Wolf", "Luchs", "Panda", "Zauberer", "Greif"];
  function eins(liste) { return liste[Math.floor(Math.random() * liste.length)]; }
  return eins(eigenschaften) + " " + eins(wesen) + " " + (10 + Math.floor(Math.random() * 90));
}

// Zeichnet den Charakter als Bild (SVG). "nurKopf" zeigt nur Kopf und Schultern (fürs Profilbild).
function zeichneFigur(figur, nurKopf) {
  const t = FIGUR_TEILE;
  const koerper = t.figur.auswahl[figur.figur];
  const kopf = t.kopf.auswahl[figur.kopf];
  const oberteil = t.oberteil.auswahl[figur.oberteil];
  const hose = t.hose.auswahl[figur.hose];
  const schuhe = t.schuhe.auswahl[figur.schuhe];

  let hut = "";
  if (kopf.art === "krone") {
    hut = '<polygon points="32,22 36,8 43,17 50,5 57,17 64,8 68,22" fill="' + kopf.farbe + '" stroke="#b8860b" stroke-width="1.5"/>';
  } else if (kopf.art === "kappe") {
    hut = '<path d="M30,24 Q50,2 70,24 Z" fill="' + kopf.farbe + '"/><rect x="62" y="20" width="18" height="5" rx="2" fill="' + kopf.farbe + '"/>';
  } else if (kopf.art === "zauberhut") {
    hut = '<polygon points="28,24 50,-14 72,24" fill="' + kopf.farbe + '"/><circle cx="50" cy="4" r="3" fill="#f5c542"/>';
  }

  const ansicht = nurKopf ? "15 -16 70 70" : "0 -16 100 176";
  return '<svg viewBox="' + ansicht + '" xmlns="http://www.w3.org/2000/svg">' +
    // Schuhe und Beine
    '<ellipse cx="40" cy="152" rx="11" ry="6" fill="' + schuhe.farbe + '"/>' +
    '<ellipse cx="60" cy="152" rx="11" ry="6" fill="' + schuhe.farbe + '"/>' +
    '<rect x="33" y="98" width="14" height="52" rx="5" fill="' + hose.farbe + '"/>' +
    '<rect x="53" y="98" width="14" height="52" rx="5" fill="' + hose.farbe + '"/>' +
    // Arme und Oberkörper
    '<rect x="16" y="54" width="12" height="42" rx="6" fill="' + koerper.haut + '"/>' +
    '<rect x="72" y="54" width="12" height="42" rx="6" fill="' + koerper.haut + '"/>' +
    '<rect x="24" y="50" width="52" height="54" rx="12" fill="' + oberteil.farbe + '"/>' +
    // Kopf mit Haaren und Gesicht
    '<circle cx="50" cy="30" r="20" fill="' + koerper.haut + '"/>' +
    '<path d="M30,28 Q50,0 70,28 Q60,16 50,16 Q40,16 30,28 Z" fill="' + koerper.haare + '"/>' +
    '<circle cx="43" cy="31" r="2.5" fill="#1e1b2e"/><circle cx="57" cy="31" r="2.5" fill="#1e1b2e"/>' +
    '<path d="M43,39 Q50,45 57,39" stroke="#1e1b2e" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    hut +
    '</svg>';
}

// Zeichnet den Charakter und daneben das ausgerüstete Haustier
function zeigeFigurMitHaustier(container) {
  container.innerHTML = zeichneFigur(profil.figur);
  const tier = HAUSTIERE.find(function (h) { return h.id === profil.haustier; });
  if (tier) {
    const platz = document.createElement("div");
    platz.className = "haustier";
    platz.appendChild(emoteBild(tier));
    container.appendChild(platz);
  }
}

// ===== Charakter-Bildschirm =====

let charakterZurueckZu = "home";

// Öffnet die Charakter-Auswahl. "zurueckZu" = wohin "Fertig" führt.
function oeffneCharakter(zurueckZu) {
  charakterZurueckZu = zurueckZu;
  document.getElementById("knopf-charakter-fertig").textContent =
    zurueckZu === "inventar" ? "Speichern" : "Los geht's";
  zeigeCharakter();
  zeigeBildschirm("charakter");
}

// Zeichnet Figur, Name und die Pfeil-Reihen neu
function zeigeCharakter() {
  document.getElementById("charakter-name").textContent = profil.name;
  zeigeFigurMitHaustier(document.getElementById("charakter-figur"));

  const auswahl = document.getElementById("charakter-auswahl");
  auswahl.innerHTML = "";
  Object.keys(FIGUR_TEILE).forEach(function (teil) {
    const liste = FIGUR_TEILE[teil].auswahl;
    const reihe = document.createElement("div");
    reihe.className = "pfeil-reihe";

    function pfeil(zeichen, schritt) {
      const knopf = document.createElement("button");
      knopf.className = "pfeil zweitrangig";
      knopf.textContent = zeichen;
      knopf.onclick = function () {
        // Weiterblättern, am Ende wieder von vorne – Teile, die man noch nicht hat, überspringen
        let neu = profil.figur[teil];
        do {
          neu = (neu + schritt + liste.length) % liste.length;
        } while (!besitzt(liste[neu]));
        profil.figur[teil] = neu;
        zeigeCharakter();
      };
      return knopf;
    }

    const mitte = document.createElement("div");
    mitte.className = "teil-name";
    mitte.innerHTML = "<small>" + FIGUR_TEILE[teil].titel + "</small><br>";
    mitte.appendChild(document.createTextNode(liste[profil.figur[teil]].name));

    reihe.appendChild(pfeil("◀", -1));
    reihe.appendChild(mitte);
    reihe.appendChild(pfeil("▶", 1));
    auswahl.appendChild(reihe);
  });
}

// ===== Startseite und Profil =====

function zeigeHome() {
  document.getElementById("home-name").textContent = profil.name;
  document.getElementById("knopf-profilbild").innerHTML = zeichneFigur(profil.figur, true);
  zeigeDollar();
  zeigeBildschirm("home");
}

function zeigeProfil() {
  zeigeFigurMitHaustier(document.getElementById("profil-figur"));
  document.getElementById("profil-name").textContent = profil.name;
  document.getElementById("profil-id").textContent = profil.spielerId;
  document.getElementById("profil-info").hidden = true;
  document.getElementById("profil-hinweis").textContent = "";
  zeigeBildschirm("profil");
}

// Text für "Profilinformationen"
function profilInfoText() {
  const s = profil.statistik;
  const geschafft = Object.keys(profil.erfolge).length;
  return "Spiele gespielt: " + s.spiele +
    "\nFragen richtig: " + s.richtigGesamt +
    "\nBeste Serie: " + s.besteSerie + " richtig hintereinander" +
    "\nErfolge: " + geschafft + " von " + ERFOLGE.length +
    "\nSpielgeld: " + profil.dollar + " $" +
    "\nBattlepass-Level: " + battlepassLevel();
}

// Das aktuelle Profil (beim Start aus dem Browser geladen)
let profil = ladeProfil();
