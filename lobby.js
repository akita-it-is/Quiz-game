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

// Lobby-Code aus dem Link merken (wird nach der Anmeldung benutzt)
let einladungsCode = null;
(function leseEinladung() {
  const code = new URLSearchParams(location.search).get("lobby");
  if (code) {
    einladungsCode = code.toUpperCase().slice(0, 5);
    // Den Code aus der Adresszeile entfernen, damit er beim Neuladen nicht nochmal greift
    history.replaceState(null, "", location.pathname);
  }
})();

// Nach Anmeldung bzw. "Als Gast": Gibt es eine Einladung? Dann direkt in die Lobby.
function nachAnmeldung() {
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
    maxSpieler: Number(document.getElementById("max-spieler").value),
    spieler: [ichAlsSpieler(true)]
  };
  document.getElementById("lobby-code").textContent = code;
  zeigeLobbyDetails();
}

function zeigeLobbyDetails() {
  zeigeSpielerliste(document.getElementById("spieler-liste"), aktuelleLobby);
  document.getElementById("spieler-zahl").textContent =
    "(" + aktuelleLobby.spieler.length + " / " + aktuelleLobby.maxSpieler + ")";
  zeigeSchnellEinladen();
}

function ichAlsSpieler(istHost) {
  return { id: profil.spielerId, name: profil.name, figur: profil.figur, host: Boolean(istHost) };
}

// Spielerliste mit Profilbild. Der Host sieht bei den anderen einen Rauswerfen-Knopf.
function zeigeSpielerliste(box, lobby) {
  box.innerHTML = "";
  lobby.spieler.forEach(function (s) {
    const zeile = document.createElement("div");
    zeile.className = "spieler-zeile";
    const bild = document.createElement("div");
    bild.className = "spieler-bild";
    bild.innerHTML = zeichneFigur(s.figur, true);
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

// Freunde mit einem Tipp einladen (schickt den Einladungslink, z. B. per WhatsApp)
function zeigeSchnellEinladen() {
  const box = document.getElementById("schnell-einladen");
  box.innerHTML = "";
  if (profil.freunde.length === 0) {
    const p = document.createElement("p");
    p.className = "hinweis";
    p.textContent = "Noch keine Freunde – füge sie über ihre Spieler-ID hinzu (Profil → Freunde).";
    box.appendChild(p);
    return;
  }
  profil.freunde.forEach(function (f) {
    const zeile = document.createElement("div");
    zeile.className = "spieler-zeile";
    const name = document.createElement("span");
    name.textContent = f.name || f.id;
    const knopf = document.createElement("button");
    knopf.className = "klein";
    knopf.textContent = "Einladen";
    knopf.onclick = function () { teileLobby(aktuelleLobby.code, knopf); };
    zeile.appendChild(name);
    zeile.appendChild(knopf);
    box.appendChild(zeile);
  });
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

function fuegeFreundHinzu() {
  const eingabe = document.getElementById("freund-id-eingabe");
  // Kleinbuchstaben und fehlenden Bindestrich erlauben: "k7q2x9ma" → "K7Q2-X9MA"
  let id = eingabe.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  id = id.slice(0, 4) + "-" + id.slice(4, 8);
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(id)) {
    hinweis("freunde-hinweis", "Eine Spieler-ID sieht so aus: K7Q2-X9MA");
    return;
  }
  if (id === profil.spielerId) {
    hinweis("freunde-hinweis", "Das ist deine eigene ID 😄");
    return;
  }
  if (profil.freunde.some(function (f) { return f.id === id; })) {
    hinweis("freunde-hinweis", "Diese ID hast du schon hinzugefügt.");
    return;
  }
  profil.freunde.push({ id: id, name: null });
  speichereProfil();
  eingabe.value = "";
  zeigeFreunde(freundeZurueckZu);
  hinweis("freunde-hinweis", "Hinzugefügt! (Namen und Online-Status gibt es mit Supabase.)");
}
