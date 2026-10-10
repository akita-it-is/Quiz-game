const fragenSpeicher = {};

// So viele Punkte gibt eine komplett richtige Frage
const PUNKTE_PRO_FRAGE = 50;

// "schwer" oder "casual" (leer oder alles andere zählt als casual)
function leseSchwierigkeit(text) {
  return String(text || "").trim().toLowerCase().startsWith("schwer") ? "schwer" : "casual";
}

// Merkt sich alles, was während eines Spiels passiert
let spielstand = null;

// Lädt die Fragen einer Spielart (nur beim ersten Mal)
async function ladeFragen(spiel) {
  if (fragenSpeicher[spiel.name]) {
    return fragenSpeicher[spiel.name];
  }
  // Manche Spielarten (z. B. Mathe) erzeugen ihre Fragen selbst, ohne Tabelle
  if (spiel.erzeugeFragen) {
    const fragen = spiel.erzeugeFragen().map(function (frage, nummer) {
      frage.kategorie = String(frage.kategorie || "sonstiges").trim().toLowerCase();
      frage.id = spiel.name + "-" + nummer;
      frage.info = frage.info || "";
      frage.schwierigkeit = leseSchwierigkeit(frage.schwierigkeit);
      return frage;
    });
    fragenSpeicher[spiel.name] = fragen;
    return fragen;
  }
  // Fragen aus der Supabase-Tabelle dieser Spielart laden
  let zeilen;
  ladenStart();
  try {
    zeilen = await ladeTabelle(spiel.tabelle);
  } finally {
    ladenEnde();
  }
  const fragen = zeilen.map(spiel.zeileZuFrage).map(function (frage, nummer) {
    // Kategorie einheitlich schreiben ("Sport " wird zu "sport")
    frage.kategorie = String(frage.kategorie || "sonstiges").trim().toLowerCase();
    // Jede Frage braucht eine eindeutige id, damit sie im Spiel nicht doppelt kommt
    // (mit Spielart davor, weil z. B. Multiple Choice und Wahr/Falsch beide eine Frage 1 haben)
    frage.id = spiel.name + "-" + (frage.id || nummer);
    // Optionale Spalte "info": kleiner Extra-Fakt, der nach der Antwort erscheint
    frage.info = String(zeilen[nummer].info || "").trim();
    // Spalte "schwierigkeit": casual oder schwer
    frage.schwierigkeit = leseSchwierigkeit(zeilen[nummer].schwierigkeit);
    return frage;
  });
  fragenSpeicher[spiel.name] = fragen;
  return fragen;
}

// Alle Spielarten, die Fragen haben können (Supabase-Tabelle oder selbst erzeugte Fragen).
// Spielarten ohne passende Fragen (z. B. leere Tabelle) werden im Spiel übersprungen.
function aktiveSpiele() {
  return Object.values(spiele).filter(function (s) { return s.tabelle || s.erzeugeFragen; });
}

// Wie viele Sekunden eine Frage dieser Spielart hat.
// "festeZeit" kann eine Zahl sein (Kärtchen: immer 60) oder eine Funktion,
// die aus der Lobby-Zeit eine eigene Zeit macht (Mathe: 15 oder 20).
function zeitFuer(spiel) {
  const lobbyZeit = spielstand.einstellungen.sekunden;
  if (typeof spiel.festeZeit === "function") {
    return spiel.festeZeit(lobbyZeit);
  }
  return spiel.festeZeit || lobbyZeit;
}

// Liest eine Zahl aus einem Text, auch in deutscher Schreibweise:
// "1.000" wird zu 1000, "3,5" wird zu 3.5. Kommt keine Zahl heraus, ist das Ergebnis NaN.
function leseZahl(text) {
  let s = String(text || "").replace(/\s/g, "");
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  s = s.replace(",", ".");
  return s === "" ? NaN : Number(s);
}

// Schreibt eine Zahl schön lesbar, z. B. 1000000 als "1.000.000"
function zahlText(zahl) {
  return zahl.toLocaleString("de-DE");
}

// Mischt eine Liste zufällig durch
function mische(liste) {
  const kopie = liste.slice();
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

// Startet ein neues Spiel mit den gewählten Einstellungen
async function starteSpiel(einstellungen) {
  spielstand = {
    einstellungen: einstellungen,
    runde: 0,
    punkte: 0,
    letzteSpielart: null,
    benutzteFragen: new Set(),
    verlauf: [],      // alle gespielten Fragen für den Endbildschirm
    pausiert: false,
    wartend: [],      // was nach der Pause weiterlaufen soll
    abgebrochen: false
  };
  zeigeBildschirm("spiel");
  await naechsteRunde();
}

// Wählt eine Spielart und die Fragen für die nächste Runde
async function naechsteRunde() {
  // Gewählte Kategorien mit ihrer Schwierigkeit, z. B. { sport: "casual", politik: "schwer" }
  const kategorien = spielstand.einstellungen.kategorien;

  // Für jede Spielart die passenden Fragen heraussuchen (Kategorie + Schwierigkeit)
  const moeglich = [];
  for (const spiel of aktiveSpiele()) {
    const fragen = (await ladeFragen(spiel)).filter(function (f) {
      return kategorien[f.kategorie] === f.schwierigkeit;
    });
    if (fragen.length > 0) {
      moeglich.push({ spiel: spiel, fragen: fragen });
    }
  }
  if (moeglich.length === 0) {
    throw new Error("Für die gewählten Kategorien (und Casual/Schwer) gibt es noch keine Fragen. " +
      "Wähl andere Kategorien oder trag in Supabase Fragen ein.");
  }

  // Nicht zweimal hintereinander dieselbe Spielart (wenn es mehrere gibt)
  let auswahl = moeglich.filter(function (m) { return m.spiel !== spielstand.letzteSpielart; });
  if (auswahl.length === 0) {
    auswahl = moeglich;
  }
  const gewaehlt = auswahl[Math.floor(Math.random() * auswahl.length)];

  // Zuerst Fragen nehmen, die in diesem Spiel noch nicht dran waren
  const neue = gewaehlt.fragen.filter(function (f) { return !spielstand.benutzteFragen.has(f.id); });
  const alte = gewaehlt.fragen.filter(function (f) { return spielstand.benutzteFragen.has(f.id); });
  const anzahl = gewaehlt.spiel.fragenProRunde || 5;
  const rundenFragen = mische(neue).concat(mische(alte)).slice(0, anzahl);

  spielstand.runde = spielstand.runde + 1;
  spielstand.letzteSpielart = gewaehlt.spiel;
  spielstand.spiel = gewaehlt.spiel;
  spielstand.rundenFragen = rundenFragen;
  spielstand.frageNummer = 0;
  spielstand.rundenPunkte = 0;
  spielstand.rundenMaxPunkte = 0;

  zeigeIntro();
}

// 2 Sekunden lang: Name der Spielart und kurze Erklärung, dann geht's los
function zeigeIntro() {
  stoppeTimer();
  const spiel = spielstand.spiel;
  setzeTitel(spiel.name);
  document.getElementById("spiel-info").textContent = "Runde " + spielstand.runde;

  const spielfeld = document.getElementById("spielfeld");
  spielfeld.classList.remove("ausblenden");
  spielfeld.innerHTML = "";
  const karte = document.createElement("div");
  karte.className = "intro-karte";
  const titel = document.createElement("h2");
  titel.textContent = spiel.name;
  const text = document.createElement("p");
  text.textContent = spiel.beschreibung || "";
  karte.appendChild(titel);
  karte.appendChild(text);
  spielfeld.appendChild(karte);

  setTimeout(function () { nachPause(zeigeFrage); }, 2000);
}

// ===== Pause =====

// Führt etwas aus – oder wartet damit, bis die Pause vorbei ist.
// Ist das Spiel abgebrochen, passiert nichts mehr.
function nachPause(aktion) {
  if (!spielstand || spielstand.abgebrochen) {
    return;
  }
  if (spielstand.pausiert) {
    spielstand.wartend.push(aktion);
  } else {
    aktion();
  }
}

// Hält das Spiel an. "fensterTitel"/"fensterInhalt": was im Pause-Fenster steht.
function pausiereSpiel(fensterTitel, fensterInhalt, knopfText) {
  if (!spielstand || spielstand.pausiert || spielstand.abgebrochen) {
    return;
  }
  spielstand.pausiert = true;
  merkeTimer();
  zeigeFenster(fensterTitel, fensterInhalt, knopfText || "▶ Weiter", fortsetzeSpiel);
}

function fortsetzeSpiel() {
  if (!spielstand || !spielstand.pausiert) {
    return;
  }
  spielstand.pausiert = false;
  setzeTimerFort();
  const wartend = spielstand.wartend;
  spielstand.wartend = [];
  wartend.forEach(function (aktion) { aktion(); });
}

// Inhalt des Pause-Fensters (mit "Neu verbinden")
function pauseInhalt(text) {
  const box = document.createElement("div");
  const p = document.createElement("p");
  p.textContent = text;
  const meldung = document.createElement("p");
  meldung.className = "hinweis";
  const neu = document.createElement("button");
  neu.className = "zweitrangig";
  neu.textContent = "🔄 Neu verbinden";
  neu.onclick = function () {
    // Im Online-Spiel verbindet das wieder mit der Lobby. Allein ist keine Verbindung nötig.
    meldung.textContent = navigator.onLine
      ? "✓ Verbunden. (Im Online-Spiel holt dich dieser Knopf zurück in die Lobby.)"
      : "Noch keine Internetverbindung – versuch es gleich nochmal.";
  };
  box.appendChild(p);
  box.appendChild(neu);
  box.appendChild(meldung);
  return box;
}

// Bricht das laufende Spiel ab (Zurück-Knopf)
function brichSpielAb() {
  stoppeTimer();
  if (spielstand) {
    spielstand.abgebrochen = true;
  }
  document.getElementById("fenster").hidden = true;
}

// Internet weg? Dann automatisch pausieren.
window.addEventListener("offline", function () {
  if (aktuellerBildschirm === "spiel") {
    pausiereSpiel("📡 Verbindung verloren", pauseInhalt("Das Spiel ist pausiert, bis du wieder verbunden bist."));
  }
});

// Zeigt die aktuelle Frage der Runde an
function zeigeFrage() {
  const frage = spielstand.rundenFragen[spielstand.frageNummer];
  spielstand.benutzteFragen.add(frage.id);
  aktualisiereInfo();

  // Jede Frage darf nur einmal zählen: entweder Antwort oder Zeit abgelaufen
  let schonBeantwortet = false;
  function fertig(erreichtePunkte) {
    if (schonBeantwortet) {
      return;
    }
    schonBeantwortet = true;
    stoppeTimer();
    frageBeantwortet(erreichtePunkte);
  }

  // Eine Spielart kann eine eigene Funktion für "Zeit abgelaufen" zurückgeben
  // (z. B. Schätzfrage: das bisher Eingetippte trotzdem werten)
  const beiZeitAblauf = spielstand.spiel.zeige(frage, document.getElementById("spielfeld"), fertig);
  // Manche Spielarten haben eine eigene Zeit (z. B. Kärtchen: immer 60 Sekunden)
  starteTimer(zeitFuer(spielstand.spiel), function () {
    if (typeof beiZeitAblauf === "function") {
      beiZeitAblauf();
    } else {
      // Standard: richtige Antwort zeigen, 0 Punkte
      auswerten(null, fertig);
    }
  });
}

// Färbt die Knöpfe nach einer Antwort: richtige Antwort grün, falsch gewählte rot.
// Der Timer bleibt stehen, nach einer Pause blendet die Frage weich aus.
// "gewaehlterKnopf" ist null, wenn die Zeit abgelaufen ist.
function auswerten(gewaehlterKnopf, fertig) {
  const spielfeld = document.getElementById("spielfeld");

  const richtigerKnopf = spielfeld.querySelector("[data-richtig]");
  if (richtigerKnopf) {
    richtigerKnopf.classList.add("richtig");
  }
  const istRichtig = gewaehlterKnopf !== null && gewaehlterKnopf === richtigerKnopf;
  if (gewaehlterKnopf && !istRichtig) {
    gewaehlterKnopf.classList.add("falsch");
  }

  abschliessen(istRichtig ? 1 : 0, 1, fertig);
}

// Wird nach jeder Antwort aufgerufen (von allen Spielarten):
// Timer anhalten, Punkte zeigen, Infobox zeigen und dann zur nächsten Frage.
// "maxPunkte" = so viele Punkte hätte man bei dieser Frage höchstens bekommen können.
function abschliessen(punkte, maxPunkte, fertig) {
  // Umrechnen in Spielpunkte: 50 pro komplett richtiger Frage, anteilig bei teilweise richtig.
  // Spielarten mit "punkteJeTreffer" (Kärtchen) geben 50 pro Treffer.
  if (spielstand.spiel.punkteJeTreffer) {
    punkte = punkte * PUNKTE_PRO_FRAGE;
    maxPunkte = maxPunkte * PUNKTE_PRO_FRAGE;
  } else {
    punkte = maxPunkte > 0 ? Math.round(PUNKTE_PRO_FRAGE * punkte / maxPunkte) : 0;
    maxPunkte = PUNKTE_PRO_FRAGE;
  }
  pausiereTimer();
  const spielfeld = document.getElementById("spielfeld");
  spielfeld.querySelectorAll("button, input").forEach(function (k) { k.disabled = true; });
  spielstand.rundenMaxPunkte = spielstand.rundenMaxPunkte + maxPunkte;

  // Punkte sofort hochzählen (mit kleinem Hüpfer)
  if (punkte > 0) {
    const anzeige = document.getElementById("punkte");
    anzeige.textContent = "Punkte: " + (spielstand.punkte + punkte) + "  (+" + punkte + ")";
    anzeige.classList.remove("hochzaehlen");
    void anzeige.offsetWidth; // startet die Animation neu
    anzeige.classList.add("hochzaehlen");
  }

  // Ton und Vibration
  if (punkte > 0) {
    richtigTon();
  } else {
    falschTon();
  }

  // Für Statistik und Erfolge zählen (als richtig zählt alles mit Punkten)
  zaehleAntwort(punkte > 0);

  // Frage für den Endbildschirm merken
  const frage = spielstand.rundenFragen[spielstand.frageNummer];
  spielstand.verlauf.push({
    text: frage.text,
    punkte: punkte,
    maxPunkte: maxPunkte,
    info: frage.info
  });

  // Blendet die Frage aus und geht zur nächsten
  function weiter() {
    spielfeld.classList.add("ausblenden");
    setTimeout(function () { fertig(punkte); }, 300);
  }

  if (frage.info) {
    const box = document.createElement("div");
    box.className = "infobox";
    const titel = document.createElement("strong");
    titel.textContent = "Infobox";
    const text = document.createElement("p");
    text.textContent = frage.info;
    box.appendChild(titel);
    box.appendChild(text);
    spielfeld.appendChild(box);
  }

  if (frage.info && !spielstand.einstellungen.mehrspieler) {
    // Allein mit Infobox: weiter geht es per Knopf, damit man in Ruhe lesen kann
    const knopf = document.createElement("button");
    knopf.className = "weiter";
    knopf.textContent = "Weiter";
    knopf.onclick = function () {
      knopf.disabled = true;
      weiter();
    };
    spielfeld.appendChild(knopf);
  } else {
    // Ohne Infobox oder im Mehrspieler-Modus: automatisch weiter (nicht während einer Pause)
    setTimeout(function () { nachPause(weiter); }, frage.info ? 2000 : 1500);
  }
}

let timerId = null;
let timerInfo = null;   // { sekunden, zeitAbgelaufen, ende, rest } – fürs Pausieren

// Zählt die Sekunden herunter und ruft "zeitAbgelaufen" auf, wenn die Zeit um ist.
// "restMs": nach einer Pause nur noch so viele Millisekunden (der Balken bleibt im Verhältnis)
function starteTimer(sekunden, zeitAbgelaufen, restMs) {
  stoppeTimer();
  const ende = Date.now() + (restMs === undefined ? sekunden * 1000 : restMs);
  timerInfo = { sekunden: sekunden, zeitAbgelaufen: zeitAbgelaufen, ende: ende, rest: null };
  const balken = document.getElementById("timer-balken");
  const zahl = document.getElementById("timer-zahl");
  document.getElementById("timer").style.display = "block";

  function aktualisiere() {
    const rest = Math.max(0, ende - Date.now());
    balken.style.width = (rest / (sekunden * 1000) * 100) + "%";
    // Die letzten 5 Sekunden wird der Balken rot
    balken.classList.toggle("knapp", rest <= 5000);
    zahl.textContent = Math.ceil(rest / 1000) + " s";
    if (rest === 0) {
      pausiereTimer();
      zahl.textContent = "Zeit um!";
      zeitAbgelaufen();
    }
  }
  aktualisiere();
  timerId = setInterval(aktualisiere, 100);
}

// Pause: Restzeit merken (nur wenn der Timer gerade läuft)
function merkeTimer() {
  if (timerId && timerInfo) {
    timerInfo.rest = Math.max(0, timerInfo.ende - Date.now());
    pausiereTimer();
  }
}

// Nach der Pause mit der gemerkten Restzeit weitermachen
function setzeTimerFort() {
  if (timerInfo && timerInfo.rest !== null) {
    starteTimer(timerInfo.sekunden, timerInfo.zeitAbgelaufen, timerInfo.rest);
  }
}

// Hält den Timer an, er bleibt aber sichtbar stehen
function pausiereTimer() {
  clearInterval(timerId);
  timerId = null;
}

// Hält den Timer an und versteckt ihn
function stoppeTimer() {
  clearInterval(timerId);
  timerId = null;
  timerInfo = null;
  document.getElementById("timer").style.display = "none";
  document.getElementById("timer-zahl").textContent = "";
}

// Zeigt oben an, in welcher Runde und bei welcher Frage man ist
function aktualisiereInfo() {
  const e = spielstand.einstellungen;
  let rundenText = "Runde " + spielstand.runde;
  if (e.modus === "runden") {
    rundenText = rundenText + " von " + e.runden;
  } else {
    rundenText = rundenText + " · Ziel: " + e.zielPunkte + " Punkte";
  }
  document.getElementById("spiel-info").textContent =
    rundenText + " · Frage " + (spielstand.frageNummer + 1) + "/" + spielstand.rundenFragen.length;
  document.getElementById("punkte").textContent = "Punkte: " + spielstand.punkte;
}

// Wird von der Spielart aufgerufen, wenn eine Frage beantwortet wurde
function frageBeantwortet(erreichtePunkte) {
  if (!spielstand || spielstand.abgebrochen) {
    return;
  }
  document.getElementById("spielfeld").classList.remove("ausblenden");
  spielstand.punkte = spielstand.punkte + erreichtePunkte;
  spielstand.rundenPunkte = spielstand.rundenPunkte + erreichtePunkte;
  spielstand.frageNummer = spielstand.frageNummer + 1;

  // "Punkte bis Sieg": Sobald das Ziel erreicht ist, ist das Spiel vorbei
  const e = spielstand.einstellungen;
  if (e.modus === "punkte" && spielstand.punkte >= e.zielPunkte) {
    zeigeErgebnis();
    return;
  }

  if (spielstand.frageNummer < spielstand.rundenFragen.length) {
    zeigeFrage();
  } else {
    rundeVorbei();
  }
}

// Zeigt das Ergebnis der Runde und entscheidet, ob das Spiel weitergeht
function rundeVorbei() {
  const e = spielstand.einstellungen;
  const maxPunkte = spielstand.rundenMaxPunkte;

  // Feste Rundenanzahl: nach der letzten Runde ist Schluss
  // (bei "Punkte bis Sieg" endet das Spiel schon direkt nach der Frage, die das Ziel erreicht)
  const spielVorbei = e.modus === "runden" && spielstand.runde >= e.runden;

  document.getElementById("punkte").textContent = "Punkte: " + spielstand.punkte;
  const spielfeld = document.getElementById("spielfeld");
  spielfeld.innerHTML = "";

  const titel = document.createElement("h2");
  titel.textContent = "Runde " + spielstand.runde + " vorbei: " +
    spielstand.rundenPunkte + " von " + maxPunkte + " Punkten";
  spielfeld.appendChild(titel);

  if (e.modus === "punkte") {
    const text = document.createElement("p");
    text.textContent = "Noch " + (e.zielPunkte - spielstand.punkte) + " Punkte bis zum Sieg.";
    spielfeld.appendChild(text);
  }

  const knopf = document.createElement("button");
  knopf.textContent = spielVorbei ? "Zum Ergebnis" : "Nächste Runde";
  knopf.onclick = function () {
    if (spielVorbei) {
      zeigeErgebnis();
    } else {
      naechsteRunde().catch(zeigeFehler);
    }
  };
  spielfeld.appendChild(knopf);
}

// Zeigt den Endbildschirm
function zeigeErgebnis() {
  stoppeTimer();
  let text = "Fertig! Du hast " + spielstand.punkte + " Punkte.";
  if (spielstand.einstellungen.modus === "punkte") {
    text = "🏆 Ziel erreicht! " + spielstand.punkte + " Punkte in " + spielstand.runde + " Runden.";
  }
  document.getElementById("ergebnis-text").textContent = text;

  // Alle Spieler mit Punkten. Allein bist nur du dabei, online kommen später die Freunde dazu.
  zeigeTreppchen([{ name: profil.name, punkte: spielstand.punkte }]);
  profil.statistik.spiele = profil.statistik.spiele + 1;
  document.getElementById("ergebnis-belohnung").textContent = spielBelohnung(spielstand.verlauf);
  zeigeRueckblick(spielstand.verlauf);
  zeigeBildschirm("ergebnis");
}

// Siegertreppchen: Platz 2 links, Platz 1 in der Mitte (am höchsten), Platz 3 rechts
function zeigeTreppchen(spieler) {
  const sortiert = spieler.slice().sort(function (a, b) { return b.punkte - a.punkte; });
  const treppchen = document.getElementById("treppchen");
  treppchen.innerHTML = "";
  [1, 0, 2].forEach(function (platz) {
    const s = sortiert[platz];
    const stufe = document.createElement("div");
    stufe.className = "stufe platz" + (platz + 1);
    if (s) {
      const name = document.createElement("div");
      name.className = "name";
      name.textContent = (platz === 0 ? "👑 " : "") + s.name;
      const punkte = document.createElement("div");
      punkte.className = "punktzahl";
      punkte.textContent = s.punkte + " Punkte";
      stufe.appendChild(name);
      stufe.appendChild(punkte);
    } else {
      // Platz nicht besetzt (z. B. allein gespielt): Stufe unsichtbar, Platz bleibt frei
      stufe.style.visibility = "hidden";
    }
    const block = document.createElement("div");
    block.className = "block";
    block.textContent = platz + 1;
    stufe.appendChild(block);
    treppchen.appendChild(stufe);
  });
}

// Liste aller Fragen des Spiels. Mit ⓘ klappt man die Infobox auf (nur wenn es eine gibt).
function zeigeRueckblick(verlauf) {
  const liste = document.getElementById("rueckblick");
  liste.innerHTML = "";
  verlauf.forEach(function (eintrag, nummer) {
    const details = document.createElement("details");
    // ✅ alle Punkte, 🟡 ein Teil der Punkte, ❌ keine Punkte
    let symbolText = "🟡 ";
    details.className = "teilweise";
    if (eintrag.punkte >= eintrag.maxPunkte) {
      symbolText = "✅ ";
      details.className = "richtig";
    } else if (eintrag.punkte === 0) {
      symbolText = "❌ ";
      details.className = "falsch";
    }

    const zeile = document.createElement("summary");
    zeile.textContent = (nummer + 1) + ". " + symbolText + eintrag.text;
    details.appendChild(zeile);

    if (eintrag.info) {
      const symbol = document.createElement("span");
      symbol.className = "info-symbol";
      symbol.textContent = "ⓘ";
      zeile.appendChild(symbol);
      const info = document.createElement("p");
      info.textContent = eintrag.info;
      details.appendChild(info);
    } else {
      // Ohne Infobox gibt es nichts zum Aufklappen
      zeile.onclick = function (e) { e.preventDefault(); };
    }
    liste.appendChild(details);
  });
}

// Zeigt eine Fehlermeldung auf der Seite an
function zeigeFehler(fehler) {
  stoppeTimer();
  document.getElementById("spielfeld").classList.remove("ausblenden");
  zeigeBildschirm("spiel");
  document.getElementById("spielfeld").textContent = "Fehler: " + fehler.message;
}
