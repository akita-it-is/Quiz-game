// ===== Lobby-Einstellungen =====
// Zahlen werden mit < Zahl > eingestellt, die Kategorien mit Cards.
// Die Auswahl wird auf dem Gerät gemerkt, damit man sie nicht jedes Mal neu einstellen muss.

// Grenzen und Schritte für die < Zahl >-Knöpfe
const STEPPER = {
  sekunden:   { min: 10,  max: 60,   schritt: 5,   einheit: " s" },
  maxSpieler: { min: 2,   max: 6,    schritt: 1,   einheit: "" },
  runden:     { min: 3,   max: 15,   schritt: 1,   einheit: "" },
  zielPunkte: { min: 500, max: 5000, schritt: 250, einheit: "" }
};

// Alle Kategorien mit ihrem Charakter – fest, in der Reihenfolge der Charaktere
// (Hannes und Chiara sind "Allrounder" und haben keine eigene Kategorie)
const KATEGORIEN = CHARAKTERE.filter(function (c) { return c.kategorie !== "allrounder"; });

// Aktuelle Einstellungen (Startwerte – werden durch die gemerkte Auswahl ersetzt)
const lobbyWahl = ladeLobbyWahl();

function ladeLobbyWahl() {
  const standard = { sekunden: 20, maxSpieler: 4, runden: 6, zielPunkte: 1500, modus: "runden", kategorien: {} };
  KATEGORIEN.forEach(function (c) {
    standard.kategorien[c.kategorie] = { an: true, schwer: false };
  });
  try {
    const gemerkt = JSON.parse(localStorage.getItem("quiz-lobby") || "{}");
    const wahl = Object.assign(standard, gemerkt);
    // Neue Kategorien, die es beim Merken noch nicht gab, ergänzen
    KATEGORIEN.forEach(function (c) {
      wahl.kategorien[c.kategorie] = wahl.kategorien[c.kategorie] || { an: true, schwer: false };
    });
    return wahl;
  } catch (e) {
    return standard;
  }
}

function merkeLobbyWahl() {
  // Mitspieler im Warteraum sehen die Einstellungen sofort
  if (aktuelleLobby && aktuelleLobby.host) {
    sendeLobbyInfo();
  }
  try {
    localStorage.setItem("quiz-lobby", JSON.stringify(lobbyWahl));
  } catch (e) {
    // nicht schlimm
  }
}

// Öffnet die Lobby-Einstellungen
async function oeffneEinstellungen() {
  zeigeBildschirm("einstellungen");
  erstelleLobby();
  zeigeLobbyWahl();
  // Fragen schon mal im Hintergrund laden, damit das Spiel schneller startet
  for (const spiel of aktiveSpiele()) {
    await ladeFragen(spiel);
  }
}

// Zeichnet Stepper, Modus-Schalter und Kategorie-Cards neu
function zeigeLobbyWahl() {
  document.querySelectorAll("#einstellungen .stepper").forEach(function (box) {
    baueStepper(box, box.dataset.wert);
  });
  const punkteModus = lobbyWahl.modus === "punkte";
  document.getElementById("modus-schalter").checked = punkteModus;
  document.getElementById("block-runden").classList.toggle("inaktiv", punkteModus);
  document.getElementById("block-punkte").classList.toggle("inaktiv", !punkteModus);
  zeigeKategorien();
}

// Ein "< Zahl >"-Feld
function baueStepper(box, schluessel) {
  const regel = STEPPER[schluessel];
  box.innerHTML = "";
  function knopf(zeichen, richtung) {
    const k = document.createElement("button");
    k.className = "zweitrangig stepper-knopf";
    k.textContent = zeichen;
    const neu = lobbyWahl[schluessel] + richtung * regel.schritt;
    k.disabled = neu < regel.min || neu > regel.max;
    k.onclick = function () {
      lobbyWahl[schluessel] = neu;
      merkeLobbyWahl();
      if (schluessel === "maxSpieler" && aktuelleLobby) {
        aktuelleLobby.maxSpieler = neu;
        zeigeLobbyDetails();
      }
      baueStepper(box, schluessel);
    };
    return k;
  }
  const wert = document.createElement("div");
  wert.className = "stepper-wert";
  wert.textContent = lobbyWahl[schluessel] + regel.einheit;
  box.appendChild(knopf("<", -1));
  box.appendChild(wert);
  box.appendChild(knopf(">", 1));
}

// Kategorie-Cards: Name, Haken oben rechts, Charakter-Emoji, darunter Casual/Schwer
function zeigeKategorien() {
  const gitter = document.getElementById("kategorien");
  gitter.innerHTML = "";
  KATEGORIEN.forEach(function (c) {
    const wahl = lobbyWahl.kategorien[c.kategorie];
    const block = document.createElement("div");
    block.className = "kategorie-block";

    const karte = document.createElement("button");
    karte.className = "kategorie-karte" + (wahl.an ? " an" : "");
    karte.innerHTML = '<span class="kat-name"></span><span class="kat-haken">' + (wahl.an ? "✓" : "") +
      '</span><span class="kat-bild"></span>';
    karte.querySelector(".kat-name").textContent = kategorieText(c.kategorie);
    karte.querySelector(".kat-bild").textContent = c.bild;
    karte.title = c.name;
    karte.onclick = function () {
      wahl.an = !wahl.an;
      merkeLobbyWahl();
      zeigeKategorien();
    };

    const schalter = document.createElement("label");
    schalter.className = "schwierigkeit-schalter" + (wahl.an ? "" : " inaktiv");
    schalter.innerHTML = '<span>Casual</span><input type="checkbox" class="schalter"><span>Schwer</span>';
    const input = schalter.querySelector("input");
    input.checked = wahl.schwer;
    input.onchange = function () {
      wahl.schwer = input.checked;
      merkeLobbyWahl();
    };

    block.appendChild(karte);
    block.appendChild(schalter);
    gitter.appendChild(block);
  });
}

// Liest die Einstellungen für das Spiel aus
function leseEinstellungen() {
  // Nur angehakte Kategorien, jeweils mit "casual" oder "schwer"
  const kategorien = {};
  Object.keys(lobbyWahl.kategorien).forEach(function (kategorie) {
    const wahl = lobbyWahl.kategorien[kategorie];
    if (wahl.an) {
      kategorien[kategorie] = wahl.schwer ? "schwer" : "casual";
    }
  });
  return {
    modus: lobbyWahl.modus,
    runden: lobbyWahl.runden,
    zielPunkte: lobbyWahl.zielPunkte,
    sekunden: lobbyWahl.sekunden,
    maxSpieler: lobbyWahl.maxSpieler,
    kategorien: kategorien
  };
}

// Umschalter "Feste Rundenanzahl" ↔ "Punkte bis Sieg"
document.getElementById("modus-schalter").onchange = function () {
  lobbyWahl.modus = this.checked ? "punkte" : "runden";
  merkeLobbyWahl();
  zeigeLobbyWahl();
};
