// ===== Lobby: Code, Einladungslink, Freunde =====
// Die Echtzeit-Verbindung der Lobby (wer ist drin, Spiel starten …) steht in mehrspieler.js.
// Die Freunde liegen in Supabase (Tabelle "freundschaft", siehe supabase/03_freunde_und_lobby.sql).

// Zeichen für Codes und IDs – ohne leicht verwechselbare wie 0/O oder 1/I
const CODE_ZEICHEN = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function zufallsCode(laenge) {
  let code = "";
  for (let i = 0; i < laenge; i++) {
    code = code + CODE_ZEICHEN[Math.floor(Math.random() * CODE_ZEICHEN.length)];
  }
  return code;
}

// ===== Einladungslink =====

// Link, der direkt in die Lobby führt, z. B. https://dietafelrunde.pages.dev/?lobby=K7QX2
function lobbyLink(code) {
  return location.origin + location.pathname + "?lobby=" + code;
}

function teileLobby(code, knopf) {
  teile("Die Tafelrunde – Quiz", "Komm in meine Quiz-Lobby! Code: " + code, lobbyLink(code), knopf);
}

// Freundes-Link: Wer ihn öffnet, ist danach mit dir befreundet,
// z. B. https://dietafelrunde.pages.dev/?freund=K7Q2-X9MA
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
    const code = freundesEinladung;
    freundesEinladung = null;
    freundAnfragen(code, true).then(function (text) { zeigeFenster("👥 Freundes-Link", text); });
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

// { code, host, maxSpieler } – wer drin ist, steht in lobbySpieler (mehrspieler.js)
let aktuelleLobby = null;

function betreteLobby(code) {
  code = String(code || "").trim().toUpperCase();
  if (code.length !== 5) {
    hinweis("menue-hinweis", "Ein Lobby-Code hat 5 Zeichen.");
    zeigeBildschirm("menue");
    return;
  }
  aktuelleLobby = { code: code, host: false, maxSpieler: 6 };
  document.getElementById("warteraum-code").textContent = code;
  document.getElementById("warteraum-info").textContent = "Verbinde mit der Lobby …";
  verbindeLobby(code);
  zeigeWarteraum();
  zeigeBildschirm("warteraum");
}

function zeigeWarteraum() {
  zeigeSpielerliste(document.getElementById("warteraum-spieler"));
}

// ===== Lobby erstellen (Host) =====

// Wird beim Öffnen der Lobby-Einstellungen aufgerufen
function erstelleLobby() {
  const code = zufallsCode(5);
  aktuelleLobby = { code: code, host: true, maxSpieler: lobbyWahl.maxSpieler };
  document.getElementById("lobby-code").textContent = code;
  verbindeLobby(code);
  zeigeLobbyDetails();
}

function zeigeLobbyDetails() {
  zeigeSpielerliste(document.getElementById("spieler-liste"));
  document.getElementById("spieler-zahl").textContent =
    "(" + lobbySpieler.length + " / " + aktuelleLobby.maxSpieler + ")";
}

// Spielerliste mit Profilbild. Der Host sieht bei den anderen einen Rauswerfen-Knopf.
function zeigeSpielerliste(box) {
  box.innerHTML = "";
  const ichHost = ichBinHost();
  lobbySpieler.forEach(function (s, i) {
    const zeile = document.createElement("div");
    zeile.className = "spieler-zeile";
    const bild = document.createElement("div");
    bild.className = "spieler-bild";
    bild.innerHTML = charakterBild(s.charakter, s.skin);
    const name = document.createElement("span");
    name.textContent = (i === 0 ? "👑 " : "") + s.name + (s.id === profil.spielerId ? " (du)" : "");
    zeile.appendChild(bild);
    zeile.appendChild(name);
    if (ichHost && s.id !== profil.spielerId) {
      const raus = document.createElement("button");
      raus.className = "gefahr klein";
      raus.textContent = "Rauswerfen";
      raus.onclick = function () { werfeRaus(s); };
      zeile.appendChild(raus);
    }
    box.appendChild(zeile);
  });
  // Freie Plätze anzeigen
  for (let i = lobbySpieler.length; i < aktuelleLobby.maxSpieler; i++) {
    const frei = document.createElement("div");
    frei.className = "spieler-zeile frei";
    frei.textContent = "Freier Platz …";
    box.appendChild(frei);
  }
}

function werfeRaus(spieler) {
  if (confirm(spieler.name + " aus der Lobby werfen?")) {
    wirfSpielerRaus(spieler.id);
  }
}

// ===== Freunde =====

// Schickt eine Freundschaftsanfrage (oder wird sofort Freund, bei "sofort" = Freundes-Link).
// Gibt einen Text zurück, der erklärt, was passiert ist.
async function freundAnfragen(roheId, sofort) {
  const id = String(roheId || "").trim();
  if (id.replace(/[^A-Za-z0-9]/g, "").length !== 8) {
    return "Eine Spieler-ID sieht so aus: K7Q2-X9MA";
  }
  const antwort = await db.rpc("freund_anfrage", { code: id, sofort: Boolean(sofort) });
  if (antwort.error) {
    return fehlerText(antwort.error);
  }
  return {
    gesendet: "✓ Anfrage gesendet! Sobald sie angenommen wird, seid ihr Freunde.",
    schon_gesendet: "Du hast schon eine Anfrage geschickt – warte, bis sie angenommen wird.",
    freunde: "🎉 Ihr seid jetzt befreundet!",
    schon_freunde: "Ihr seid schon befreundet.",
    selbst: "Das ist deine eigene ID 😄",
    nicht_gefunden: "Diese Spieler-ID gibt es nicht. Hast du dich vertippt?"
  }[antwort.data] || antwort.data;
}

// Lädt die Freundesliste aus Supabase: [{ uid, spieler_id, name, charakter, skin, status, online }]
async function ladeFreunde() {
  const antwort = await db.rpc("meine_freunde");
  if (antwort.error) {
    throw new Error(fehlerText(antwort.error));
  }
  return antwort.data || [];
}

// Eine Zeile mit Bild, Name und Online-Punkt
function freundZeile(f) {
  const zeile = document.createElement("div");
  zeile.className = "spieler-zeile";
  const bild = document.createElement("div");
  bild.className = "spieler-bild";
  bild.innerHTML = charakterBild(f.charakter, f.skin);
  const name = document.createElement("span");
  name.className = "freund-name";
  name.textContent = f.name;
  if (f.status === "freund") {
    const punkt = document.createElement("span");
    punkt.className = "online-punkt" + (f.online ? " online" : "");
    punkt.title = f.online ? "online" : "offline";
    name.prepend(punkt);
  }
  zeile.appendChild(bild);
  zeile.appendChild(name);
  return zeile;
}

function kleinerKnopf(text, klasse, aktion) {
  const knopf = document.createElement("button");
  knopf.className = "klein " + (klasse || "");
  knopf.textContent = text;
  knopf.onclick = aktion;
  return knopf;
}

// Fenster "Freund einladen" in der Lobby: Freunde (online zuerst), Freundes-Link, Code eingeben, eigener Code
async function zeigeFreundEinladen() {
  const box = document.createElement("div");
  const liste = document.createElement("div");
  liste.className = "freundes-liste";
  liste.innerHTML = '<p class="hinweis">Lädt …</p>';
  box.appendChild(liste);

  const meldung = document.createElement("p");
  meldung.className = "hinweis";
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
    extra.querySelector("button").onclick = async function () {
      meldung.textContent = await freundAnfragen(feld.value);
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
  zeigeFenster("Freund einladen", box);

  try {
    const freunde = (await ladeFreunde()).filter(function (f) { return f.status === "freund"; });
    liste.innerHTML = "";
    if (freunde.length === 0) {
      liste.innerHTML = '<p class="hinweis">Noch keine Freunde – teile deinen Freundes-Link oder gib einen Code ein.</p>';
    }
    freunde.forEach(function (f) {
      const zeile = freundZeile(f);
      // Online: Einladung erscheint sofort bei ihm. Offline: Link teilen.
      const knopf = kleinerKnopf(f.online ? "Einladen" : "Link senden", f.online ? "" : "zweitrangig", function () {
        if (f.online) {
          ladeFreundEin(f, knopf);
        } else {
          teileLobby(aktuelleLobby.code, knopf);
        }
      });
      zeile.appendChild(knopf);
      liste.appendChild(zeile);
    });
  } catch (fehler) {
    liste.innerHTML = "";
    meldung.textContent = fehler.message;
  }
}

// Freunde-Bildschirm: Anfragen, Freunde (online zuerst) und gesendete Anfragen
let freundeZurueckZu = "profil";

async function zeigeFreunde(zurueckZu) {
  if (zurueckZu) {
    freundeZurueckZu = zurueckZu;
  }
  document.querySelectorAll(".eigene-id").forEach(function (f) { f.textContent = profil.spielerId; });
  const liste = document.getElementById("freunde-liste");
  if (aktuellerBildschirm !== "freunde") {
    document.getElementById("freunde-hinweis").textContent = "";
    liste.innerHTML = '<p class="hinweis">Lädt …</p>';
    zeigeBildschirm("freunde");
  }
  let freunde;
  try {
    freunde = await ladeFreunde();
  } catch (fehler) {
    liste.innerHTML = "";
    hinweis("freunde-hinweis", fehler.message);
    return;
  }
  liste.innerHTML = "";
  const gruppen = [
    { status: "eingehend", titel: "📬 Anfragen an dich" },
    { status: "freund", titel: "👥 Deine Freunde" },
    { status: "ausgehend", titel: "⏳ Gesendete Anfragen" }
  ];
  gruppen.forEach(function (gruppe) {
    const passende = freunde.filter(function (f) { return f.status === gruppe.status; })
      .sort(function (a, b) { return (b.online ? 1 : 0) - (a.online ? 1 : 0); });
    if (passende.length === 0) {
      return;
    }
    const titel = document.createElement("h3");
    titel.textContent = gruppe.titel;
    liste.appendChild(titel);
    passende.forEach(function (f) {
      const zeile = freundZeile(f);
      async function aktion(funktion, werte) {
        const antwort = await db.rpc(funktion, werte);
        if (antwort.error) {
          hinweis("freunde-hinweis", fehlerText(antwort.error));
        }
        zeigeFreunde();
      }
      if (f.status === "eingehend") {
        zeile.appendChild(kleinerKnopf("Annehmen", "", function () {
          aktion("freund_antwort", { code: f.spieler_id, annehmen: true });
        }));
        zeile.appendChild(kleinerKnopf("Ablehnen", "zweitrangig", function () {
          aktion("freund_antwort", { code: f.spieler_id, annehmen: false });
        }));
      } else {
        zeile.appendChild(kleinerKnopf(f.status === "freund" ? "Entfernen" : "Zurückziehen", "zweitrangig", function () {
          if (f.status !== "freund" || confirm(f.name + " aus deiner Freundesliste entfernen?")) {
            aktion("freund_entfernen", { code: f.spieler_id });
          }
        }));
      }
      liste.appendChild(zeile);
    });
  });
  if (freunde.length === 0) {
    liste.innerHTML = '<p class="hinweis">Du hast noch keine Freunde. Teile deinen Freundes-Link ' +
      'oder gib die Spieler-ID eines Freundes ein.</p>';
  }
}

// Freunde-Bildschirm: "+ Hinzufügen"
async function fuegeFreundHinzu() {
  const eingabe = document.getElementById("freund-id-eingabe");
  const text = await freundAnfragen(eingabe.value);
  if (/^[✓🎉]/.test(text)) {
    eingabe.value = "";
  }
  zeigeFreunde();
  hinweis("freunde-hinweis", text);
}
