const fragenSpeicher = {};

// Merkt sich alles, was während eines Spiels passiert
let spielstand = null;

// Lädt die Fragen einer Spielart aus der Tabelle (nur beim ersten Mal)
async function ladeFragen(spiel) {
  if (fragenSpeicher[spiel.name]) {
    return fragenSpeicher[spiel.name];
  }
  const antwort = await fetch(spiel.fragenQuelle);
  const text = await antwort.text();
  const tabelle = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    // Spaltennamen ohne Leerzeichen und in Kleinbuchstaben ("Text " wird zu "text")
    transformHeader: function (spalte) { return spalte.trim().toLowerCase(); }
  });
  // Ohne Spalte "text" kann keine Frage angezeigt werden
  if (!tabelle.meta.fields || !tabelle.meta.fields.includes("text")) {
    throw new Error("In der Tabelle für " + spiel.name + " fehlt die Spalte \"text\". " +
      "Gefundene Spalten: " + (tabelle.meta.fields || []).join(", "));
  }
  const fragen = tabelle.data.map(spiel.zeileZuFrage).map(function (frage, nummer) {
    // Kategorie einheitlich schreiben ("Sport " wird zu "sport")
    frage.kategorie = String(frage.kategorie || "sonstiges").trim().toLowerCase();
    // Jede Frage braucht eine eindeutige id, damit sie im Spiel nicht doppelt kommt
    frage.id = frage.id || spiel.name + "-" + nummer;
    // Optionale Spalte "info": kleiner Extra-Fakt, der nach der Antwort erscheint
    frage.info = String(tabelle.data[nummer].info || "").trim();
    return frage;
  });
  fragenSpeicher[spiel.name] = fragen;
  return fragen;
}

// Alle Spielarten, bei denen schon ein Tabellen-Link eingetragen ist
function aktiveSpiele() {
  return Object.values(spiele).filter(function (s) { return s.fragenQuelle; });
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
    rundenSiege: 0,
    letzteSpielart: null,
    benutzteFragen: new Set(),
    verlauf: []   // alle gespielten Fragen für den Endbildschirm
  };
  zeigeBildschirm("spiel");
  await naechsteRunde();
}

// Wählt eine Spielart und die Fragen für die nächste Runde
async function naechsteRunde() {
  const kategorien = spielstand.einstellungen.kategorien;

  // Für jede Spielart die Fragen aus den gewählten Kategorien heraussuchen
  const moeglich = [];
  for (const spiel of aktiveSpiele()) {
    const fragen = (await ladeFragen(spiel)).filter(function (f) {
      return kategorien.includes(f.kategorie);
    });
    if (fragen.length > 0) {
      moeglich.push({ spiel: spiel, fragen: fragen });
    }
  }
  if (moeglich.length === 0) {
    throw new Error("Keine Fragen in den gewählten Kategorien gefunden");
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

  zeigeFrage();
}

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
  // Manche Spielarten haben eine feste Zeit (z. B. Kärtchen: immer 60 Sekunden)
  const sekunden = spielstand.spiel.festeZeit || spielstand.einstellungen.sekunden;
  starteTimer(sekunden, function () {
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
    // Ohne Infobox oder im Mehrspieler-Modus: automatisch weiter
    setTimeout(weiter, frage.info ? 2000 : 1500);
  }
}

let timerId = null;

// Zählt die Sekunden herunter und ruft "zeitAbgelaufen" auf, wenn die Zeit um ist
function starteTimer(sekunden, zeitAbgelaufen) {
  stoppeTimer();
  const ende = Date.now() + sekunden * 1000;
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

// Hält den Timer an, er bleibt aber sichtbar stehen
function pausiereTimer() {
  clearInterval(timerId);
  timerId = null;
}

// Hält den Timer an und versteckt ihn
function stoppeTimer() {
  clearInterval(timerId);
  timerId = null;
  document.getElementById("timer").style.display = "none";
  document.getElementById("timer-zahl").textContent = "";
}

// Zeigt oben an, in welcher Runde und bei welcher Frage man ist
function aktualisiereInfo() {
  const e = spielstand.einstellungen;
  let rundenText = "Runde " + spielstand.runde;
  if (e.modus === "runden") {
    rundenText = rundenText + " von " + e.anzahl;
  } else {
    rundenText = rundenText + " · Rundensiege: " + spielstand.rundenSiege + " von " + e.anzahl;
  }
  document.getElementById("spiel-info").textContent =
    rundenText + " · " + spielstand.spiel.name +
    " · Frage " + (spielstand.frageNummer + 1) + "/" + spielstand.rundenFragen.length;
  document.getElementById("punkte").textContent = "Punkte: " + spielstand.punkte;
}

// Wird von der Spielart aufgerufen, wenn eine Frage beantwortet wurde
function frageBeantwortet(erreichtePunkte) {
  document.getElementById("spielfeld").classList.remove("ausblenden");
  spielstand.punkte = spielstand.punkte + erreichtePunkte;
  spielstand.rundenPunkte = spielstand.rundenPunkte + erreichtePunkte;
  spielstand.frageNummer = spielstand.frageNummer + 1;

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

  // Allein gewinnt man eine Runde mit mehr als der Hälfte der möglichen Punkte.
  // (Online gewinnt später, wer in der Runde die meisten Punkte hat.)
  const gewonnen = spielstand.rundenPunkte * 2 > maxPunkte;
  if (gewonnen) {
    spielstand.rundenSiege = spielstand.rundenSiege + 1;
  }

  const spielVorbei = e.modus === "runden"
    ? spielstand.runde >= e.anzahl
    : spielstand.rundenSiege >= e.anzahl;

  document.getElementById("punkte").textContent = "Punkte: " + spielstand.punkte;
  const spielfeld = document.getElementById("spielfeld");
  spielfeld.innerHTML = "";

  const titel = document.createElement("h2");
  titel.textContent = "Runde " + spielstand.runde + " vorbei: " +
    spielstand.rundenPunkte + " von " + maxPunkte + " Punkten";
  spielfeld.appendChild(titel);

  if (e.modus === "siege") {
    const text = document.createElement("p");
    text.textContent = (gewonnen ? "Rundensieg! " : "Runde verloren. ") +
      "Rundensiege: " + spielstand.rundenSiege + " von " + e.anzahl;
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
  let text = "Fertig! Du hast " + spielstand.punkte + " Punkte.";
  if (spielstand.einstellungen.modus === "siege") {
    text = "Gewonnen! " + spielstand.rundenSiege + " Rundensiege in " +
      spielstand.runde + " Runden (" + spielstand.punkte + " Punkte).";
  }
  document.getElementById("ergebnis-text").textContent = text;

  // Alle Spieler mit Punkten. Allein bist nur du dabei, online kommen später die Freunde dazu.
  zeigeTreppchen([{ name: "Du", punkte: spielstand.punkte }]);
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
