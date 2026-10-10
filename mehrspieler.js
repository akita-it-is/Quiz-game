// ===== Online-Spiel: Lobby in Echtzeit und Mehrspieler (Supabase Realtime) =====
// So funktioniert es:
//  * Jede Lobby ist ein Kanal "lobby:CODE". Wer gerade drin ist, sieht man über "Presence".
//  * Host ist, wer am längsten in der Lobby ist. Geht er, wird automatisch der Nächste Host.
//  * Der Host LEITET das Spiel: Er sucht Runden und Fragen aus, sammelt die Antworten und
//    verteilt die Punkte. Alle Geräte (auch das des Hosts) zeigen an, was er schickt.
//  * Jedes Gerät schreibt den Spielstand mit – so kann jeder übernehmen, wenn der Host geht.

// Punkte nach Platz: Schätzfrage (wer am nächsten dran ist) und
// Multiple Choice, Wahr/Falsch, Mathe (wer am schnellsten richtig antwortet)
const PLATZ_PUNKTE = [50, 30, 10];
// Kärtchen: So viele Sekunden hat man für seinen Zug
const ZUG_SEKUNDEN = 10;

// Alle Nachrichten, die in einer Lobby verschickt werden
const NACHRICHTEN = ["lobby", "start", "runde", "frage", "antwort", "zug", "wahl", "aufgedeckt",
  "ergebnis", "pause", "ende", "zustand", "raus"];

let lobbyKanal = null;
let lobbySpieler = [];        // wer gerade in der Lobby ist (der Host steht vorne)
let presenceBereit = false;   // erst wenn wir uns selbst in der Liste sehen, wissen wir, wer Host ist
let lobbyInfo = { maxSpieler: 6, laeuft: false, gesperrt: [] };
let meinBeitritt = 0;
let warHost = false;
const bekannteSpieler = {};   // id → Name und Bild (auch von Spielern, die schon gegangen sind)
let onlineStand = null;       // Spielstand, den jedes Gerät mitschreibt
let leitung = null;           // nur beim Host: alles, was er zum Leiten braucht
let reihumAnzeige = null;     // Kärtchen online: die Knöpfe auf dem Bildschirm

function ichAlsSpieler() {
  return { id: profil.spielerId, name: profil.name, charakter: profil.charakter,
    skin: profil.skins[profil.charakter] || null, haustier: profil.haustier, seit: meinBeitritt };
}

function merkeSpieler(s) {
  bekannteSpieler[s.id] = { name: s.name, charakter: s.charakter, skin: s.skin };
}

function spielerName(id) {
  return id === profil.spielerId ? "Du" : (bekannteSpieler[id] ? bekannteSpieler[id].name : "Jemand");
}

// Wer ist Host? (die id)
function hostId() {
  if (presenceBereit && lobbySpieler.length > 0) {
    return lobbySpieler[0].id;
  }
  return aktuelleLobby && aktuelleLobby.host ? profil.spielerId : null;
}

function ichBinHost() {
  return !aktuelleLobby || hostId() === profil.spielerId;
}

// ===== Verbinden und Trennen =====

function verbindeLobby(code) {
  trenneLobby();
  meinBeitritt = Date.now();
  presenceBereit = false;
  lobbySpieler = [ichAlsSpieler()];
  merkeSpieler(lobbySpieler[0]);
  lobbyInfo = { maxSpieler: aktuelleLobby.maxSpieler, laeuft: false, gesperrt: [] };
  warHost = aktuelleLobby.host;
  // Ohne Konto (oder ohne Internet) spielt man allein
  if (!sitzung) {
    return;
  }
  const kanal = db.channel("lobby:" + code, {
    config: { private: true, broadcast: { self: true }, presence: { key: profil.spielerId } }
  });
  NACHRICHTEN.forEach(function (ereignis) {
    kanal.on("broadcast", { event: ereignis }, function (nachricht) {
      if (lobbyKanal === kanal) {
        beiNachricht(ereignis, nachricht.payload || {});
      }
    });
  });
  kanal.on("presence", { event: "sync" }, function () {
    if (lobbyKanal === kanal) {
      beiPresence();
    }
  });
  kanal.subscribe(function (status) {
    if (status === "SUBSCRIBED") {
      kanal.track(ichAlsSpieler());
    } else if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && lobbyKanal === kanal) {
      meldeLobby("📡 Keine Verbindung zur Lobby. Allein spielen geht trotzdem.");
    }
  });
  lobbyKanal = kanal;
}

function trenneLobby() {
  stoppePlaene();
  leitung = null;
  onlineStand = null;
  reihumAnzeige = null;
  if (lobbyKanal) {
    const kanal = lobbyKanal;
    lobbyKanal = null;
    kanal.untrack().catch(function () {});
    db.removeChannel(kanal);
  }
  lobbySpieler = [];
  presenceBereit = false;
}

function sende(ereignis, daten) {
  if (lobbyKanal) {
    lobbyKanal.send({ type: "broadcast", event: ereignis, payload: daten });
  }
}

// Hinweis auf dem Lobby-Bildschirm
function meldeLobby(text) {
  const feld = document.getElementById(aktuellerBildschirm === "warteraum" ? "warteraum-info" : "lobby-hinweis");
  if (feld) {
    feld.textContent = text;
  }
}

// ===== Wer ist in der Lobby? =====

function beiPresence() {
  const zustand = lobbyKanal.presenceState();
  const liste = [];
  Object.keys(zustand).forEach(function (schluessel) {
    if (zustand[schluessel][0]) {
      liste.push(zustand[schluessel][0]);
    }
  });
  liste.sort(function (a, b) { return a.seit - b.seit || (a.id < b.id ? -1 : 1); });
  liste.forEach(merkeSpieler);
  if (!liste.some(function (s) { return s.id === profil.spielerId; })) {
    // Wir selbst sind noch nicht angekommen – erst mal nur anzeigen
    lobbySpieler = liste.concat([ichAlsSpieler()]);
    aktualisiereLobbyAnzeige();
    return;
  }
  presenceBereit = true;
  const vorher = lobbySpieler.map(function (s) { return s.id; });
  lobbySpieler = liste;
  const neue = liste.filter(function (s) { return !vorher.includes(s.id); });

  const jetztHost = ichBinHost();
  if (jetztHost && !warHost) {
    wurdeHost();
  }
  warHost = jetztHost;

  if (jetztHost) {
    // Gesperrte und Spieler über der Höchstzahl gleich wieder hinausschicken
    liste.forEach(function (s, i) {
      if (lobbyInfo.gesperrt.includes(s.id)) {
        sende("raus", { id: s.id, grund: "gesperrt" });
      } else if (i >= aktuelleLobby.maxSpieler) {
        sende("raus", { id: s.id, grund: "voll" });
      }
    });
    if (neue.length > 0) {
      sendeLobbyInfo();
      // Läuft das Spiel schon? Dann steigen Neue (oder Zurückgekehrte) direkt ein.
      if (leitung) {
        neue.forEach(function (s) {
          sende("zustand", { fuer: s.id, einstellungen: leitung.e, gesamt: leitung.gesamt, runde: leitung.runde });
        });
      }
    }
    if (leitung) {
      pruefeObAlleFertig();
    }
  }
  aktualisiereLobbyAnzeige();
}

function aktualisiereLobbyAnzeige() {
  if (!aktuelleLobby) {
    return;
  }
  if (aktuellerBildschirm === "einstellungen") {
    zeigeLobbyDetails();
  } else if (aktuellerBildschirm === "warteraum") {
    zeigeWarteraum();
  }
  const start = document.getElementById("knopf-spiel-starten");
  start.textContent = lobbySpieler.length > 1
    ? "Spiel starten (" + lobbySpieler.length + " Spieler)" : "Spiel starten (allein)";
}

// Der Host ist gegangen – jetzt bin ich Host
function wurdeHost() {
  aktuelleLobby.host = true;
  if (onlineStand && onlineStand.laeuft) {
    uebernehmeLeitung();
    return;
  }
  if (aktuellerBildschirm === "warteraum") {
    document.getElementById("lobby-code").textContent = aktuelleLobby.code;
    zeigeLobbyWahl();
    zeigeBildschirm("einstellungen");
    zeigeLobbyDetails();
    meldeLobby(lobbySpieler.length > 1
      ? "👑 Du bist jetzt Host dieser Lobby." : "👑 Die Lobby war leer – jetzt bist du Host.");
  }
  sendeLobbyInfo();
}

// Host: schickt allen die Lobby-Einstellungen
function sendeLobbyInfo() {
  if (!lobbyKanal || !ichBinHost() || !aktuelleLobby) {
    return;
  }
  lobbyInfo.maxSpieler = aktuelleLobby.maxSpieler;
  lobbyInfo.laeuft = Boolean(leitung);
  sende("lobby", { maxSpieler: lobbyInfo.maxSpieler, laeuft: lobbyInfo.laeuft,
    gesperrt: lobbyInfo.gesperrt, text: einstellungenText(leseEinstellungen()) });
}

function einstellungenText(e) {
  return "⚙️ " + (e.modus === "runden" ? e.runden + " Runden" : e.zielPunkte + " Punkte bis zum Sieg") +
    " · " + e.sekunden + " s pro Frage · " + Object.keys(e.kategorien).length + " Kategorien";
}

function wirfSpielerRaus(id) {
  if (!lobbyInfo.gesperrt.includes(id)) {
    lobbyInfo.gesperrt.push(id);
  }
  sende("raus", { id: id, grund: "gesperrt" });
  sendeLobbyInfo();
}

// ===== Nachrichten =====

function beiNachricht(ereignis, p) {
  const vomHost = ichBinHost();
  switch (ereignis) {
    case "lobby":
      lobbyInfo = { maxSpieler: p.maxSpieler, laeuft: p.laeuft, gesperrt: p.gesperrt || [] };
      if (!vomHost) {
        aktuelleLobby.maxSpieler = p.maxSpieler;
        document.getElementById("warteraum-info").textContent = (p.text || "") + "\n" + (p.laeuft
          ? "Das Spiel läuft gerade – du steigst gleich ein."
          : "Warte, bis der Host das Spiel startet …");
        aktualisiereLobbyAnzeige();
      }
      break;
    case "raus":
      if (p.id === profil.spielerId) {
        rausgeworfen(p.grund);
      }
      break;
    case "start":
      beiStart(p.einstellungen, {});
      if (vomHost) {
        leitung = neueLeitung(onlineStand);
        sendeLobbyInfo();
        planen(800, leitungRunde);
      }
      break;
    case "zustand":
      if (p.fuer === profil.spielerId && (!spielstand || !spielstand.online || spielstand.beendet)) {
        beiStart(p.einstellungen, p.gesamt || {});
        onlineStand.runde = p.runde;
        document.getElementById("spielfeld").textContent = "Du steigst bei der nächsten Frage ein …";
      }
      break;
    case "runde":
      beiRunde(p);
      break;
    case "frage":
      beiFrage(p);
      break;
    case "antwort":
      beiAntwort(p);
      break;
    case "zug":
      beiZug(p);
      break;
    case "wahl":
      if (leitung) {
        leitungWahl(p);
      }
      break;
    case "aufgedeckt":
      beiAufgedeckt(p);
      break;
    case "ergebnis":
      beiErgebnis(p);
      break;
    case "pause":
      beiPause(p.an);
      break;
    case "ende":
      beiEnde(p);
      break;
  }
}

function rausgeworfen(grund) {
  const imSpiel = spielstand && spielstand.online && !spielstand.beendet;
  if (imSpiel) {
    stoppeTimer();
    spielstand.abgebrochen = true;
  }
  trenneLobby();
  aktuelleLobby = null;
  zeigeHome();
  zeigeFenster("Lobby", grund === "voll"
    ? "Die Lobby ist leider schon voll."
    : "Du wurdest vom Host aus der Lobby genommen.");
}

// ===== Anzeige auf jedem Gerät =====

// Host: Spiel für alle starten
function starteOnline(einstellungen) {
  if (!ichBinHost()) {
    return;
  }
  sende("start", { einstellungen: einstellungen });
}

function beiStart(einstellungen, gesamt) {
  spielstand = {
    online: true,
    einstellungen: einstellungen,
    runde: 0,
    punkte: gesamt[profil.spielerId] || 0,
    letzteSpielart: null,
    benutzteFragen: new Set(),
    verlauf: [],
    pausiert: false,
    wartend: [],
    abgebrochen: false,
    rundenFragen: [],
    frageNummer: 0,
    rundenPunkte: 0,
    rundenMaxPunkte: 0,
    fid: null,
    geantwortetFid: null
  };
  onlineStand = { laeuft: true, einstellungen: einstellungen, runde: 0, gesamt: gesamt, benutzt: [],
    spielKey: null, fid: 0, nr: 0, frage: null, ergebnisFid: null, antworten: {}, reihumPunkte: {} };
  zeigeBildschirm("spiel");
  setzeTitel("Online-Spiel");
  document.getElementById("spiel-info").textContent = lobbySpieler.length + " Spieler";
  document.getElementById("punkte").textContent = "Punkte: " + spielstand.punkte;
  const spielfeld = document.getElementById("spielfeld");
  spielfeld.classList.remove("ausblenden");
  spielfeld.textContent = "Gleich geht's los …";
}

function laeuftOnline() {
  return spielstand && spielstand.online && !spielstand.abgebrochen && !spielstand.beendet;
}

// Neue Runde: Intro mit Name und Erklärung der Spielart
function beiRunde(p) {
  if (!laeuftOnline()) {
    return;
  }
  onlineStand.runde = p.runde;
  onlineStand.spielKey = p.spielKey;
  spielstand.runde = p.runde;
  spielstand.spiel = spiele[p.spielKey];
  spielstand.letzteSpielart = spielstand.spiel;
  spielstand.rundenFragen = new Array(p.anzahl).fill(null);
  spielstand.frageNummer = 0;
  zeigeIntro();
}

// Neue Frage: anzeigen (die Frage selbst kommt mit, so kann jeder jederzeit einsteigen)
function beiFrage(p) {
  if (!onlineStand) {
    return;
  }
  Object.assign(onlineStand, { fid: p.fid, nr: p.nr, frage: p.frage, spielKey: p.spielKey,
    runde: p.runde, gesamt: p.gesamt, reihumPunkte: {} });
  onlineStand.antworten[p.fid] = onlineStand.antworten[p.fid] || {};
  if (!onlineStand.benutzt.includes(p.frage.id)) {
    onlineStand.benutzt.push(p.frage.id);
  }
  if (!laeuftOnline()) {
    return;
  }
  spielstand.spiel = spiele[p.spielKey];
  spielstand.runde = p.runde;
  if (spielstand.rundenFragen.length !== p.anzahl) {
    spielstand.rundenFragen = new Array(p.anzahl).fill(null);
  }
  spielstand.rundenFragen[p.nr] = p.frage;
  spielstand.frageNummer = p.nr;
  spielstand.fid = p.fid;
  spielstand.punkte = p.gesamt[profil.spielerId] || 0;
  if (aktuellerBildschirm !== "spiel") {
    zeigeBildschirm("spiel");
  }
  setzeTitel(spielstand.spiel.name);
  reihumAnzeige = null;
  zeigeFrage();
}

// Eigene Antwort an den Host schicken (wird von abschliessen() in main.js aufgerufen)
function sendeAntwort(punkte, maxPunkte, details) {
  if (!laeuftOnline() || spielstand.geantwortetFid === spielstand.fid) {
    return;
  }
  spielstand.geantwortetFid = spielstand.fid;
  pausiereTimer();
  const spielfeld = document.getElementById("spielfeld");
  spielfeld.querySelectorAll("button, input").forEach(function (k) { k.disabled = true; });
  if (punkte > 0) {
    richtigTon();
  } else {
    falschTon();
  }
  zaehleAntwort(punkte > 0);
  sende("antwort", { fid: spielstand.fid, id: profil.spielerId, punkte: punkte, max: maxPunkte,
    ms: Date.now() - spielstand.frageStart, details: details || null });
  const warten = document.createElement("p");
  warten.className = "hinweis warten";
  warten.textContent = "⏳ Warte auf die anderen …";
  spielfeld.appendChild(warten);
}

function beiAntwort(p) {
  if (onlineStand) {
    onlineStand.antworten[p.fid] = onlineStand.antworten[p.fid] || {};
    onlineStand.antworten[p.fid][p.id] = p;
  }
  if (leitung && leitung.aktuell && leitung.aktuell.fid === p.fid) {
    leitung.aktuell.antworten[p.id] = p;
    pruefeObAlleFertig();
  }
}

// Ergebnis einer Frage: Punkte, Rangliste dieser Frage und Infobox
function beiErgebnis(p) {
  if (!onlineStand) {
    return;
  }
  onlineStand.ergebnisFid = p.fid;
  onlineStand.gesamt = p.gesamt;
  if (!laeuftOnline() || spielstand.fid !== p.fid) {
    return;
  }
  stoppeTimer();
  const spielfeld = document.getElementById("spielfeld");
  spielfeld.querySelectorAll("button, input").forEach(function (k) { k.disabled = true; });
  spielfeld.querySelectorAll(".warten").forEach(function (w) { w.remove(); });
  // Nicht gefundene Kärtchen grün umranden
  spielfeld.querySelectorAll(".kaertchen[data-richtig]:not(.richtig)").forEach(function (k) {
    k.classList.add("verpasst");
  });
  const richtigerKnopf = spielfeld.querySelector("[data-richtig]:not(.kaertchen)");
  if (richtigerKnopf) {
    richtigerKnopf.classList.add("richtig");
  }

  const frage = spielstand.rundenFragen[spielstand.frageNummer];
  const meine = p.punkte[profil.spielerId] || 0;
  spielstand.punkte = p.gesamt[profil.spielerId] || 0;
  spielstand.verlauf.push({ text: frage.text, punkte: meine,
    maxPunkte: Math.max(PUNKTE_PRO_FRAGE, meine), info: frage.info });

  const anzeige = document.getElementById("punkte");
  anzeige.textContent = "Punkte: " + spielstand.punkte + (meine > 0 ? "  (+" + meine + ")" : "");
  if (meine > 0) {
    anzeige.classList.remove("hochzaehlen");
    void anzeige.offsetWidth;
    anzeige.classList.add("hochzaehlen");
  }

  // Wer hat bei dieser Frage wie viele Punkte bekommen?
  const liste = document.createElement("div");
  liste.className = "runden-rangliste";
  Object.keys(p.punkte).sort(function (a, b) { return p.punkte[b] - p.punkte[a]; }).forEach(function (id, i) {
    const zeile = document.createElement("div");
    zeile.className = "rang-zeile" + (id === profil.spielerId ? " ich" : "");
    const medaille = p.punkte[id] > 0 ? (["🥇", "🥈", "🥉"][i] || "✓") : "·";
    zeile.textContent = medaille + " " + spielerName(id) + "  +" + p.punkte[id] +
      "   (" + (p.gesamt[id] || 0) + ")";
    liste.appendChild(zeile);
  });
  spielfeld.appendChild(liste);

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
}

// Pause: nur der Host kann sie an- und ausschalten
function hostPause(an) {
  if (ichBinHost()) {
    sende("pause", { an: an });
  }
}

function beiPause(an) {
  if (!laeuftOnline()) {
    return;
  }
  if (an && !spielstand.pausiert) {
    spielstand.pausiert = true;
    merkeTimer();
    pausiereLeitung();
    if (ichBinHost()) {
      zeigeFenster("⏸ Pausiert", "Das Spiel ist für alle angehalten.", "▶ Weiter", function () { hostPause(false); });
    } else {
      zeigeFenster("⏸ Pausiert", "Der Host hat das Spiel angehalten.", "OK");
    }
  } else if (!an && spielstand.pausiert) {
    document.getElementById("fenster").hidden = true;
    fortsetzeLeitung();
    fortsetzeSpiel();
  }
}

// Spielende: Treppchen mit allen Spielern
function beiEnde(p) {
  if (onlineStand) {
    onlineStand.laeuft = false;
  }
  stoppePlaene();
  leitung = null;
  if (!spielstand || !spielstand.online || spielstand.abgebrochen || spielstand.beendet) {
    return;
  }
  spielstand.beendet = true;
  stoppeTimer();
  document.getElementById("fenster").hidden = true;
  const gesamt = p.gesamt || {};
  const ids = Object.keys(gesamt).sort(function (a, b) { return gesamt[b] - gesamt[a]; });
  zeigeTreppchen(ids.map(function (id) {
    return { name: id === profil.spielerId ? profil.name + " (du)" : spielerName(id), punkte: gesamt[id] };
  }));
  const sieger = ids[0];
  let text = p.fehler ? "Spiel beendet: " + p.fehler : "Fertig! Du hast " + (gesamt[profil.spielerId] || 0) + " Punkte.";
  if (!p.fehler && sieger) {
    text = sieger === profil.spielerId ? "🏆 Du hast gewonnen! " + gesamt[sieger] + " Punkte."
      : "🏆 " + spielerName(sieger) + " gewinnt mit " + gesamt[sieger] + " Punkten. Du: " + (gesamt[profil.spielerId] || 0) + ".";
  }
  document.getElementById("ergebnis-text").textContent = text;
  profil.statistik.spiele = profil.statistik.spiele + 1;
  speichereProfil();
  zeigeBelohnung(spielstand.verlauf, spielstand.runde);
  zeigeRueckblick(spielstand.verlauf);
  document.getElementById("knopf-nochmal").textContent = "Zurück zur Lobby";
  zeigeBildschirm("ergebnis");
  sendeLobbyInfo();
}

// Nach dem Spiel: alle bleiben in der Lobby
function zurueckZurLobby() {
  if (!aktuelleLobby || !lobbyKanal) {
    zeigeBildschirm("menue");
    return;
  }
  if (ichBinHost()) {
    aktuelleLobby.host = true;
    document.getElementById("lobby-code").textContent = aktuelleLobby.code;
    zeigeLobbyWahl();
    zeigeBildschirm("einstellungen");
    zeigeLobbyDetails();
  } else {
    document.getElementById("warteraum-code").textContent = aktuelleLobby.code;
    zeigeWarteraum();
    zeigeBildschirm("warteraum");
  }
  aktualisiereLobbyAnzeige();
}

// ===== Kärtchen online: reihum wählen =====

function zeigeReihum(frage, spielfeld) {
  spielfeld.innerHTML = "";
  const titel = document.createElement("h2");
  titel.textContent = frage.text;
  spielfeld.appendChild(titel);
  const stand = document.createElement("p");
  stand.className = "hinweis reihum-stand";
  stand.textContent = "Gleich geht's los …";
  spielfeld.appendChild(stand);
  const gitter = document.createElement("div");
  gitter.className = "kaertchen-gitter";
  spielfeld.appendChild(gitter);
  const knoepfe = {};
  (frage.karten || frage.richtig.concat(frage.falsch).slice(0, 15)).forEach(function (name) {
    const karte = document.createElement("button");
    karte.className = "kaertchen";
    karte.textContent = name;
    karte.disabled = true;
    if (frage.richtig.includes(name)) {
      karte.dataset.richtig = "ja";
    }
    karte.onclick = function () {
      if (!reihumAnzeige || reihumAnzeige.dran !== profil.spielerId) {
        return;
      }
      Object.values(knoepfe).forEach(function (k) { k.disabled = true; });
      sende("wahl", { fid: reihumAnzeige.fid, id: profil.spielerId, karte: name });
    };
    knoepfe[name] = karte;
    gitter.appendChild(karte);
  });
  reihumAnzeige = { fid: spielstand.fid, dran: null, knoepfe: knoepfe, stand: stand, aufgedeckt: [], raus: [] };
}

function beiZug(p) {
  const a = reihumAnzeige;
  if (!a || a.fid !== p.fid) {
    return;
  }
  a.dran = p.dran;
  const ichDran = p.dran === profil.spielerId;
  a.stand.textContent = ichDran ? "👉 Du bist dran! Wähle ein Kärtchen (" + ZUG_SEKUNDEN + " s)."
    : "⏳ " + spielerName(p.dran) + " ist dran …";
  a.stand.classList.toggle("ich-dran", ichDran);
  Object.keys(a.knoepfe).forEach(function (name) {
    a.knoepfe[name].disabled = !ichDran || a.aufgedeckt.includes(name);
  });
  if (ichDran) {
    vibriere(80);
  }
}

function beiAufgedeckt(p) {
  if (onlineStand && onlineStand.fid === p.fid) {
    onlineStand.reihumPunkte = p.punkte || {};
  }
  const a = reihumAnzeige;
  if (!a || a.fid !== p.fid) {
    return;
  }
  a.aufgedeckt.push(p.karte);
  const karte = a.knoepfe[p.karte];
  if (karte) {
    karte.disabled = true;
    karte.classList.add(p.richtig ? "richtig" : "falsch");
    const wer = document.createElement("small");
    wer.className = "kaertchen-wer";
    wer.textContent = spielerName(p.id);
    karte.appendChild(wer);
  }
  if (p.richtig) {
    a.stand.textContent = "✓ " + spielerName(p.id) + ": richtig! +" + PUNKTE_PRO_FRAGE;
    if (p.id === profil.spielerId) {
      richtigTon();
    }
  } else {
    a.stand.textContent = "✗ " + spielerName(p.id) + ": falsch – raus!";
    if (p.id === profil.spielerId) {
      falschTon();
    }
  }
  if (p.id === profil.spielerId) {
    zaehleAntwort(p.richtig);
  }
  document.getElementById("punkte").textContent = "Punkte: " + ((onlineStand.gesamt[profil.spielerId] || 0) +
    ((p.punkte || {})[profil.spielerId] || 0));
}

// ===== Spielleitung (nur auf dem Gerät des Hosts) =====
// Zeitpläne der Leitung sind pausierbar (Pause-Knopf des Hosts)

function planen(ms, aktion) {
  if (!leitung) {
    return null;
  }
  const plan = { aktion: aktion, rest: ms, start: Date.now(), id: null };
  plan.id = setTimeout(function () {
    if (leitung) {
      leitung.plaene = leitung.plaene.filter(function (x) { return x !== plan; });
    }
    aktion();
  }, ms);
  leitung.plaene.push(plan);
  return plan;
}

function stoppePlan(plan) {
  if (plan && leitung) {
    clearTimeout(plan.id);
    leitung.plaene = leitung.plaene.filter(function (x) { return x !== plan; });
  }
}

function stoppePlaene() {
  if (leitung) {
    leitung.plaene.forEach(function (plan) { clearTimeout(plan.id); });
    leitung.plaene = [];
  }
}

function pausiereLeitung() {
  if (leitung) {
    leitung.plaene.forEach(function (plan) {
      clearTimeout(plan.id);
      plan.rest = Math.max(0, plan.rest - (Date.now() - plan.start));
    });
  }
}

function fortsetzeLeitung() {
  if (leitung) {
    const plaene = leitung.plaene;
    leitung.plaene = [];
    plaene.forEach(function (plan) {
      const neu = planen(plan.rest, plan.aktion);
      if (leitung && leitung.aktuell && leitung.aktuell.reihum && leitung.aktuell.reihum.zugPlan === plan) {
        leitung.aktuell.reihum.zugPlan = neu;
      }
    });
  }
}

function neueLeitung(stand) {
  return {
    e: stand.einstellungen,
    runde: stand.runde || 0,
    letzteSpielart: stand.spielKey ? spiele[stand.spielKey] : null,
    spielKey: stand.spielKey,
    benutzt: new Set(stand.benutzt || []),
    gesamt: Object.assign({}, stand.gesamt),
    fid: stand.fid || 0,
    fragen: [],
    aktuell: null,
    plaene: []
  };
}

function schluesselVon(spiel) {
  return Object.keys(spiele).find(function (k) { return spiele[k] === spiel; });
}

// Neue Runde aussuchen und allen schicken
async function leitungRunde() {
  const L = leitung;
  if (!L) {
    return;
  }
  let gewaehlt;
  try {
    gewaehlt = await waehleRunde(L.e, L.letzteSpielart, L.benutzt);
  } catch (fehler) {
    sende("ende", { gesamt: L.gesamt, runden: L.runde, fehler: fehler.message });
    return;
  }
  if (leitung !== L) {
    return;
  }
  L.runde = L.runde + 1;
  L.letzteSpielart = gewaehlt.spiel;
  L.spielKey = schluesselVon(gewaehlt.spiel);
  L.fragen = gewaehlt.fragen.map(function (f) {
    L.benutzt.add(f.id);
    const kopie = JSON.parse(JSON.stringify(f));
    // Kärtchen: Alle sehen dasselbe Gitter
    if (gewaehlt.spiel.mehrspieler === "reihum") {
      const falsche = mische(f.falsch).slice(0, Math.max(0, 15 - f.richtig.length));
      kopie.karten = mische(f.richtig.concat(falsche));
    }
    return kopie;
  });
  sende("runde", { runde: L.runde, spielKey: L.spielKey, anzahl: L.fragen.length });
  planen(2200, function () { leitungFrage(0); });
}

// Frage Nummer "nr" der Runde stellen
function leitungFrage(nr) {
  const L = leitung;
  if (!L) {
    return;
  }
  L.fid = L.fid + 1;
  const spiel = spiele[L.spielKey];
  const frage = L.fragen[nr];
  L.aktuell = { fid: L.fid, nr: nr, teilnehmer: lobbySpieler.map(function (s) { return s.id; }),
    antworten: {}, fertig: false, reihum: null };
  sende("frage", { fid: L.fid, runde: L.runde, nr: nr, anzahl: L.fragen.length, spielKey: L.spielKey,
    frage: frage, gesamt: L.gesamt });
  const fid = L.fid;
  const sekunden = zeitFuer(spiel);
  if (spiel.mehrspieler === "reihum") {
    starteReihum();
    planen(sekunden * 1000 + 1000, function () { werteFrage(fid); });
  } else {
    // Entweder oder: Die Zeit läuft für jede Aussage neu
    const dauer = spiel.mehrspieler === "ueberleben" ? (sekunden + 1) * frage.aussagen.length : sekunden;
    planen(dauer * 1000 + 3000, function () { werteFrage(fid); });
  }
}

// Haben alle (die noch da sind) geantwortet? Dann sofort werten.
function pruefeObAlleFertig() {
  const a = leitung && leitung.aktuell;
  if (!a || a.fertig) {
    return;
  }
  const da = lobbySpieler.map(function (s) { return s.id; });
  if (a.reihum) {
    // Kärtchen: Ist der, der dran ist, gegangen? Dann ist der Nächste dran.
    const dran = a.reihum.reihe[a.reihum.dran];
    if (dran && !da.includes(dran)) {
      stoppePlan(a.reihum.zugPlan);
      naechsterZug();
    }
    return;
  }
  const offen = a.teilnehmer.filter(function (id) { return da.includes(id) && !a.antworten[id]; });
  if (offen.length === 0) {
    werteFrage(a.fid);
  }
}

// Punkte für eine Frage verteilen
function berechnePunkte(spiel, frage, a) {
  const antworten = Object.values(a.antworten);
  const punkte = {};
  a.teilnehmer.forEach(function (id) { punkte[id] = 0; });
  antworten.forEach(function (x) { punkte[x.id] = 0; });
  function nachPlatz(liste) {
    liste.forEach(function (x, i) { punkte[x.id] = PLATZ_PUNKTE[i] || 0; });
  }
  switch (spiel.mehrspieler) {
    case "schnellste":
      nachPlatz(antworten.filter(function (x) { return x.max > 0 && x.punkte >= x.max; })
        .sort(function (x, y) { return x.ms - y.ms; }));
      break;
    case "naechste":
      nachPlatz(antworten.filter(function (x) { return x.details && typeof x.details.wert === "number"; })
        .map(function (x) { return { id: x.id, ms: x.ms, abstand: Math.abs(x.details.wert - frage.antwort) }; })
        .sort(function (x, y) { return x.abstand - y.abstand || x.ms - y.ms; }));
      break;
    case "ueberleben": {
      // Alle 5 geschafft = 50. Schafft es keiner, bekommt der Letzte, der übrig war, die 50.
      const geschafft = antworten.filter(function (x) { return x.max > 0 && x.punkte >= x.max; });
      if (geschafft.length > 0) {
        geschafft.forEach(function (x) { punkte[x.id] = PUNKTE_PRO_FRAGE; });
      } else {
        const weite = function (x) { return (x.details && x.details.richtig) || 0; };
        const beste = Math.max.apply(null, [0].concat(antworten.map(weite)));
        if (beste > 0) {
          antworten.filter(function (x) { return weite(x) === beste; })
            .forEach(function (x) { punkte[x.id] = PUNKTE_PRO_FRAGE; });
        }
      }
      break;
    }
    case "reihum":
      Object.assign(punkte, a.reihum ? a.reihum.punkte : {});
      break;
    default:
      // Reihenfolge: anteilig wie allein
      antworten.forEach(function (x) {
        punkte[x.id] = x.max > 0 ? Math.round(PUNKTE_PRO_FRAGE * x.punkte / x.max) : 0;
      });
  }
  return punkte;
}

function werteFrage(fid) {
  const L = leitung;
  if (!L || !L.aktuell || L.aktuell.fid !== fid || L.aktuell.fertig) {
    return;
  }
  L.aktuell.fertig = true;
  stoppePlaene();
  const spiel = spiele[L.spielKey];
  const frage = L.fragen[L.aktuell.nr];
  const punkte = berechnePunkte(spiel, frage, L.aktuell);
  Object.keys(punkte).forEach(function (id) { L.gesamt[id] = (L.gesamt[id] || 0) + punkte[id]; });
  lobbySpieler.forEach(function (s) {
    if (!(s.id in L.gesamt)) {
      L.gesamt[s.id] = 0;
    }
  });
  sende("ergebnis", { fid: fid, runde: L.runde, nr: L.aktuell.nr, punkte: punkte, gesamt: L.gesamt });
  planen(frage && frage.info ? 4500 : 3000, weiterNachErgebnis);
}

function weiterNachErgebnis() {
  const L = leitung;
  if (!L) {
    return;
  }
  const e = L.e;
  const hoechste = Math.max.apply(null, [0].concat(Object.values(L.gesamt)));
  if (e.modus === "punkte" && hoechste >= e.zielPunkte) {
    leitungEnde();
  } else if (L.aktuell && L.aktuell.nr + 1 < L.fragen.length) {
    leitungFrage(L.aktuell.nr + 1);
  } else if (e.modus === "runden" && L.runde >= e.runden) {
    leitungEnde();
  } else {
    leitungRunde();
  }
}

function leitungEnde() {
  const L = leitung;
  stoppePlaene();
  leitung = null;
  sende("ende", { gesamt: L.gesamt, runden: L.runde });
}

// Kärtchen: Reihenfolge festlegen (wer anfängt, wechselt mit jeder Frage)
function starteReihum() {
  const a = leitung.aktuell;
  const frage = leitung.fragen[a.nr];
  const start = leitung.fid % a.teilnehmer.length;
  a.reihum = {
    reihe: a.teilnehmer.slice(start).concat(a.teilnehmer.slice(0, start)),
    raus: [],
    offen: frage.richtig.filter(function (k) { return (frage.karten || []).includes(k); }),
    aufgedeckt: [],
    punkte: {},
    dran: -1,
    zugNr: 0,
    zugPlan: null
  };
  naechsterZug();
}

function naechsterZug() {
  const L = leitung;
  const a = L && L.aktuell;
  if (!a || a.fertig || !a.reihum) {
    return;
  }
  const r = a.reihum;
  const da = lobbySpieler.map(function (s) { return s.id; });
  const aktive = r.reihe.filter(function (id) { return !r.raus.includes(id) && da.includes(id); });
  if (r.offen.length === 0 || aktive.length === 0) {
    werteFrage(a.fid);
    return;
  }
  let i = r.dran;
  for (let n = 0; n < r.reihe.length; n++) {
    i = (i + 1) % r.reihe.length;
    if (aktive.includes(r.reihe[i])) {
      break;
    }
  }
  r.dran = i;
  r.zugNr = r.zugNr + 1;
  const zug = r.zugNr;
  sende("zug", { fid: a.fid, dran: r.reihe[i], zugNr: zug });
  // Wer nicht rechtzeitig wählt, wird übersprungen (ist aber nicht raus)
  r.zugPlan = planen(ZUG_SEKUNDEN * 1000 + 500, function () {
    if (r.zugNr === zug && !a.fertig) {
      naechsterZug();
    }
  });
}

function leitungWahl(p) {
  const a = leitung.aktuell;
  if (!a || a.fid !== p.fid || a.fertig || !a.reihum) {
    return;
  }
  const r = a.reihum;
  if (r.reihe[r.dran] !== p.id || r.aufgedeckt.includes(p.karte)) {
    return;
  }
  stoppePlan(r.zugPlan);
  r.zugNr = r.zugNr + 1;   // alter Zug-Zeitplan zählt nicht mehr
  r.aufgedeckt.push(p.karte);
  const frage = leitung.fragen[a.nr];
  const richtig = frage.richtig.includes(p.karte);
  if (richtig) {
    r.punkte[p.id] = (r.punkte[p.id] || 0) + PUNKTE_PRO_FRAGE;
    r.offen = r.offen.filter(function (k) { return k !== p.karte; });
  } else {
    r.raus.push(p.id);
  }
  sende("aufgedeckt", { fid: a.fid, karte: p.karte, id: p.id, richtig: richtig, punkte: r.punkte });
  planen(900, naechsterZug);
}

// Der Host ist während des Spiels gegangen: Ich leite ab jetzt weiter
function uebernehmeLeitung() {
  const st = onlineStand;
  if (!st || !st.laeuft) {
    return;
  }
  leitung = neueLeitung(st);
  if (laeuftOnline()) {
    const hinweisFeld = document.createElement("p");
    hinweisFeld.className = "hinweis";
    hinweisFeld.textContent = "👑 Der Host ist weg – du leitest jetzt das Spiel.";
    document.getElementById("spielfeld").appendChild(hinweisFeld);
  }
  sendeLobbyInfo();
  if (st.frage) {
    leitung.fragen[st.nr] = st.frage;
    leitung.aktuell = {
      fid: st.fid, nr: st.nr, teilnehmer: lobbySpieler.map(function (s) { return s.id; }),
      antworten: Object.assign({}, st.antworten[st.fid] || {}), fertig: st.ergebnisFid === st.fid,
      reihum: spiele[st.spielKey].mehrspieler === "reihum" ? { punkte: st.reihumPunkte || {} } : null
    };
    if (leitung.aktuell.fertig) {
      planen(1500, weiterNachErgebnis);
    } else {
      // Die Frage läuft noch: mit den Antworten werten, die schon da sind
      const fid = st.fid;
      planen(1500, function () { werteFrage(fid); });
    }
  } else {
    planen(1500, leitungRunde);
  }
}
