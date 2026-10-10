// ===== Lobby: Code, Einladungslink, Spieler-ID, Freunde =====
// Hinweis: Echte Online-Lobbys (andere Geräte sehen, Rauswerfen wirkt bei allen)
// kommen mit Supabase. Hier ist alles schon so vorbereitet, dass dann nur noch
// die Verbindung dazukommt.

// Zeichen für Codes und IDs – ohne leicht verwechselbare wie 0/O oder 1/I
const CODE_ZEICHEN = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function zufallsCode(laenge) {
  let code = "";
  for (let i = 0; i < laenge; i++) {
    code = code + CODE_ZEICHEN[Math.floor(Math.random() * CODE_ZEICHEN.length)];
  }
  return code;
}

// Spieler-ID wie "K7Q2-X9MA" – darüber fügen dich Freunde hinzu
function neueSpielerId() {
  return zufallsCode(4) + "-" + zufallsCode(4);
}

// ===== Einladungslink =====

// Link, der direkt in die Lobby führt, z. B. https://dietafelrunde.netlify.app/?lobby=K7QX2
function lobbyLink(code) {
  return location.origin + location.pathname + "?lobby=" + code;
}

function teileLobby(code, knopf) {
  teile("Die Tafelrunde – Quiz", "Komm in meine Quiz-Lobby! Code: " + code, lobbyLink(code), knopf);
}

// Freundes-Link: Wer ihn öffnet, ist danach mit dir befreundet,
// z. B. https://dietafelrunde.netlify.app/?freund=K7Q2-X9MA
function freundesLink() {
  return location.origin + location.pathname + "?freund=" + profil.spielerId;
}

function teileFreundesLink(knopf) {
  teile("Die Tafelrunde – Quiz", "Lass uns befreundet sein und zusammen quizzen!", freundesLink(), knopf);
}

// Lobby-Code bzw. Freundes-ID aus dem Link merken (wird nach der Anmeldung benutzt)
let einladungsCode = null;
let freundesEinladung = null;
(function leseEinladung() {
  const parameter = new URLSearchParams(location.search);
  const code = parameter.get("lobby");
  const freund = parameter.get("freund");
  if (code) {
    einladungsCode = code.toUpperCase().slice(0, 5);
  }
  if (freund) {
    freundesEinladung = freund;
  }
  if (code || freund) {
    // Aus der Adresszeile entfernen, damit es beim Neuladen nicht nochmal greift
    history.replaceState(null, "", location.pathname);
  }
})();

// Nach Anmeldung bzw. "Als Gast": Gibt es eine Einladung? Dann direkt in die Lobby.
function nachAnmeldung() {
  if (freundesEinladung) {
    const ergebnis = fuegeFreundIdHinzu(freundesEinladung);
    freundesEinladung = null;
    zeigeFenster("👥 Freundes-Link", ergebnis.ok
      ? "Ihr seid jetzt befreundet! Du findest " + ergebnis.id + " in deiner Freundesliste."
      : ergebnis.text);
  }
  if (einladungsCode) {
    const code = einladungsCode;
    einladungsCode = null;
    betreteLobby(code);
  } else {
    zeigeHome();
  }
}

// ===== Lobby beitreten (Warteraum) =====

let aktuelleLobby = null;

function betreteLobby(code) {
  code = String(code || "").trim().toUpperCase();
  if (code.length !== 5) {
    hinweis("menue-hinweis", "Ein Lobby-Code hat 5 Zeichen.");
    zeigeBildschirm("menue");
    return;
  }
  aktuelleLobby = { code: code, host: false, maxSpieler: 6, spieler: [ichAlsSpieler()] };
  document.getElementById("warteraum-code").textContent = code;
  zeigeSpielerliste(document.getElementById("warteraum-spieler"), aktuelleLobby);
  zeigeBildschirm("warteraum");
}

// ===== Lobby erstellen (Host) =====

// Wird beim Öffnen der Lobby-Einstellungen aufgerufen
function erstelleLobby() {
  const code = zufallsCode(5);
  aktuelleLobby = {
    code: code,
    host: true,
    maxSpieler: lobbyWahl.maxSpieler,
    spieler: [ichAlsSpieler(true)]
  };
  document.getElementById("lobby-code").textContent = code;
  zeigeLobbyDetails();
}

function zeigeLobbyDetails() {
  zeigeSpielerliste(document.getElementById("spieler-liste"), aktuelleLobby);
  document.getElementById("spieler-zahl").textContent =
    "(" + aktuelleLobby.spieler.length + " / " + aktuelleLobby.maxSpieler + ")";
}

function ichAlsSpieler(istHost) {
  return { id: profil.spielerId, name: profil.name, charakter: profil.charakter,
    skin: profil.skins[profil.charakter] || null, host: Boolean(istHost) };
}

// Spielerliste mit Profilbild. Der Host sieht bei den anderen einen Rauswerfen-Knopf.
function zeigeSpielerliste(box, lobby) {
  box.innerHTML = "";
  lobby.spieler.forEach(function (s) {
    const zeile = document.createElement("div");
    zeile.className = "spieler-zeile";
    const bild = document.createElement("div");
    bild.className = "spieler-bild";
    bild.innerHTML = charakterBild(s.charakter, s.skin);
    const name = document.createElement("span");
    name.textContent = (s.host ? "👑 " : "") + s.name + (s.id === profil.spielerId ? " (du)" : "");
    zeile.appendChild(bild);
    zeile.appendChild(name);
    if (lobby.host && s.id !== profil.spielerId) {
      const raus = document.createElement("button");
      raus.className = "gefahr klein";
      raus.textContent = "Rauswerfen";
      raus.onclick = function () { werfeRaus(s.id); };
      zeile.appendChild(raus);
    }
    box.appendChild(zeile);
  });
  // Freie Plätze anzeigen
  for (let i = lobby.spieler.length; i < lobby.maxSpieler; i++) {
    const frei = document.createElement("div");
    frei.className = "spieler-zeile frei";
    frei.textContent = "Freier Platz …";
    box.appendChild(frei);
  }
}

function werfeRaus(id) {
  const s = aktuelleLobby.spieler.find(function (x) { return x.id === id; });
  if (s && confirm(s.name + " aus der Lobby werfen?")) {
    aktuelleLobby.spieler = aktuelleLobby.spieler.filter(function (x) { return x.id !== id; });
    zeigeLobbyDetails();
  }
}

// Fenster "Freund einladen": Freundesliste, Freundes-Link, Code eingeben, eigener Code
function zeigeFreundEinladen() {
  const box = document.createElement("div");

  const liste = document.createElement("div");
  liste.className = "freundes-liste";
  if (profil.freunde.length === 0) {
    liste.innerHTML = '<p class="hinweis">Noch keine Freunde – teile deinen Freundes-Link oder gib einen Code ein.</p>';
  }
  profil.freunde.forEach(function (f) {
    const zeile = document.createElement("div");
    zeile.className = "spieler-zeile";
    const bild = document.createElement("div");
    bild.className = "spieler-bild";
    bild.textContent = "👤";
    const name = document.createElement("span");
    name.textContent = f.name || f.id;
    const knopf = document.createElement("button");
    knopf.className = "klein";
    knopf.textContent = "Einladen";
    knopf.onclick = function () { teileLobby(aktuelleLobby.code, knopf); };
    zeile.appendChild(bild);
    zeile.appendChild(name);
    zeile.appendChild(knopf);
    liste.appendChild(zeile);
  });
  box.appendChild(liste);

  const meldung = document.createElement("p");
  meldung.className = "hinweis";

  // Bereich, der je nach Knopf "Code eingeben" bzw. "Eigener Freundecode" zeigt
  const extra = document.createElement("div");

  const knoepfe = document.createElement("div");
  knoepfe.className = "einladen-knoepfe";
  const link = document.createElement("button");
  link.textContent = "🔗 Freundes-Link";
  link.onclick = function () { teileFreundesLink(link); };
  const eingeben = document.createElement("button");
  eingeben.className = "zweitrangig";
  eingeben.textContent = "⌨️ Code eingeben";
  eingeben.onclick = function () {
    extra.innerHTML = '<div class="reihe"><input type="text" placeholder="z. B. K7Q2-X9MA" maxlength="9">' +
      '<button class="klein">Hinzufügen</button></div>';
    const feld = extra.querySelector("input");
    extra.querySelector("button").onclick = function () {
      const ergebnis = fuegeFreundIdHinzu(feld.value);
      if (ergebnis.ok) {
        zeigeFreundEinladen();
      } else {
        meldung.textContent = ergebnis.text;
      }
    };
    feld.focus();
  };
  const eigener = document.createElement("button");
  eigener.className = "zweitrangig";
  eigener.textContent = "🆔 Eigener Freundecode";
  eigener.onclick = function () {
    extra.innerHTML = '<div class="id-zeile"><span>Dein Code: <strong></strong></span>' +
      '<button class="zweitrangig klein">📋 Kopieren</button></div>';
    extra.querySelector("strong").textContent = profil.spielerId;
    const kopieren = extra.querySelector("button");
    kopieren.onclick = function () { kopiere(profil.spielerId, kopieren); };
  };
  knoepfe.appendChild(link);
  knoepfe.appendChild(eingeben);
  knoepfe.appendChild(eigener);
  box.appendChild(knoepfe);
  box.appendChild(extra);
  box.appendChild(meldung);

  zeigeFenster("Freundesliste", box);
}

// ===== Freunde =====

let freundeZurueckZu = "profil";

function zeigeFreunde(zurueckZu) {
  freundeZurueckZu = zurueckZu;
  document.querySelectorAll(".eigene-id").forEach(function (f) { f.textContent = profil.spielerId; });
  document.getElementById("freunde-hinweis").textContent = "";
  const liste = document.getElementById("freunde-liste");
  liste.innerHTML = "";
  if (profil.freunde.length === 0) {
    liste.innerHTML = '<p class="hinweis">Du hast noch keine Freunde hinzugefügt.</p>';
  }
  profil.freunde.forEach(function (f) {
    const zeile = document.createElement("div");
    zeile.className = "spieler-zeile";
    const name = document.createElement("span");
    // Den Namen kennen wir erst mit Supabase – bis dahin steht die ID da
    name.textContent = (f.name || "Spieler") + " · " + f.id;
    const weg = document.createElement("button");
    weg.className = "zweitrangig klein";
    weg.textContent = "Entfernen";
    weg.onclick = function () {
      profil.freunde = profil.freunde.filter(function (x) { return x.id !== f.id; });
      speichereProfil();
      zeigeFreunde(freundeZurueckZu);
    };
    zeile.appendChild(name);
    zeile.appendChild(weg);
    liste.appendChild(zeile);
  });
  zeigeBildschirm("freunde");
}

// Fügt einen Freund über seine Spieler-ID hinzu.
// Gibt zurück: { ok: true/false, id, text } – "text" erklärt, was nicht geklappt hat.
function fuegeFreundIdHinzu(roheId) {
  // Kleinbuchstaben und fehlenden Bindestrich erlauben: "k7q2x9ma" → "K7Q2-X9MA"
  let id = String(roheId || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  id = id.slice(0, 4) + "-" + id.slice(4, 8);
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(id)) {
    return { ok: false, text: "Eine Spieler-ID sieht so aus: K7Q2-X9MA" };
  }
  if (id === profil.spielerId) {
    return { ok: false, text: "Das ist deine eigene ID 😄" };
  }
  if (profil.freunde.some(function (f) { return f.id === id; })) {
    return { ok: false, text: "Diese ID hast du schon hinzugefügt." };
  }
  profil.freunde.push({ id: id, name: null });
  speichereProfil();
  return { ok: true, id: id, text: "Hinzugefügt! (Namen und Online-Status gibt es mit Supabase.)" };
}

// Freunde-Bildschirm: "+ Hinzufügen"
function fuegeFreundHinzu() {
  const eingabe = document.getElementById("freund-id-eingabe");
  const ergebnis = fuegeFreundIdHinzu(eingabe.value);
  if (ergebnis.ok) {
    eingabe.value = "";
    zeigeFreunde(freundeZurueckZu);
  }
  hinweis("freunde-hinweis", ergebnis.text);
}
