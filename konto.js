// ===== Konto: Anmeldung und Online-Profil (Supabase) =====
// Jeder Spieler hat ein Konto – auch Gäste (ein "anonymes" Konto ohne E-Mail).
// Das Profil liegt in der Supabase-Tabelle "profil". Auf dem Gerät liegt nur eine Kopie,
// damit die Seite schnell startet und auch ohne Internet etwas anzeigen kann.
//
// Geld, Besitz, XP und Battlepass ändert das Spiel NIE selbst – nur die geschützten
// Funktionen in Supabase (kaufe, spiel_belohnung, …). So kann niemand schummeln.

// Diese Felder darf das Spiel selbst speichern (alles andere verwaltet Supabase)
const EIGENE_FELDER = ["name", "charakter", "skins", "deck", "haustier", "statistik", "erfolge"];

// Wandelt eine Zeile aus der Tabelle "profil" in unser Profil-Objekt um
function zeileZuProfil(zeile, angemeldet) {
  return {
    uid: zeile.id,
    spielerId: zeile.spieler_id,
    name: zeile.name,
    charakter: zeile.charakter,
    skins: zeile.skins || {},
    deck: Object.assign({ emote: [], spruch: [] }, zeile.deck),
    haustier: zeile.haustier,
    statistik: Object.assign(neuesProfil().statistik, zeile.statistik),
    erfolge: zeile.erfolge || {},
    dollar: zeile.dollar,
    xp: zeile.xp,
    besitz: zeile.besitz || [],
    battlepass: { premium: zeile.bp_premium, abgeholt: Object.assign({ gratis: [], premium: [] }, zeile.bp_abgeholt) },
    angemeldet: angemeldet
  };
}

// Übernimmt Geld, Besitz, XP und Battlepass aus einer Antwort von Supabase
function uebernimmServerWerte(zeile) {
  if (!zeile || !profil) {
    return;
  }
  const neu = zeileZuProfil(zeile, profil.angemeldet);
  ["dollar", "xp", "besitz", "battlepass", "spielerId"].forEach(function (feld) {
    profil[feld] = neu[feld];
  });
  merkeProfilAufGeraet();
}

// Ist gerade jemand angemeldet (Gast oder mit E-Mail)?
let sitzung = null;

// Wird beim Öffnen der Seite aufgerufen
async function kontoStart() {
  db.auth.onAuthStateChange(function (ereignis, neueSitzung) {
    sitzung = neueSitzung;
    if (ereignis === "PASSWORD_RECOVERY") {
      // Kommt vom Link "Passwort vergessen" aus der E-Mail
      setTimeout(zeigeNeuesPasswort, 300);
    }
  });
  try {
    const ergebnis = await db.auth.getSession();
    sitzung = ergebnis.data.session;
  } catch (e) {
    sitzung = null;
  }
  if (!sitzung) {
    zeigeStartHinweise();
    return;
  }
  // Schon angemeldet: direkt weiter (ohne Startbildschirm)
  await nachDemEinloggen();
}

// Lädt das Profil aus Supabase (oder ohne Internet die Kopie vom Gerät)
async function ladeOnlineProfil() {
  const angemeldet = !sitzung.user.is_anonymous;
  const antwort = await db.from("profil").select("*").eq("id", sitzung.user.id).single();
  if (antwort.error) {
    // Ohne Internet: die Kopie vom Gerät nehmen (wenn sie zu diesem Konto gehört)
    const kopie = ladeProfil();
    if (kopie && kopie.uid === sitzung.user.id) {
      profil = kopie;
      profil.angemeldet = angemeldet;
      return;
    }
    throw new Error("Dein Profil konnte nicht geladen werden. Bist du mit dem Internet verbunden?");
  }
  let zeile = antwort.data;

  // Altes Profil, das nur auf diesem Gerät lag (aus der Zeit vor den Konten)? Einmal übernehmen.
  const altes = ladeProfil();
  if (!zeile.importiert && altes && !altes.uid) {
    bereinigeAltesProfil(altes);
    const uebernahme = await db.rpc("importiere_profil", { daten: altes });
    if (!uebernahme.error) {
      zeile = uebernahme.data;
    }
  }
  profil = zeileZuProfil(zeile, angemeldet);

  // Neues Konto: zufälliger Name statt "Neuer Spieler"
  if (profil.name === "Neuer Spieler") {
    profil.name = zufallsName();
    speichereProfil();
  }
  merkeProfilAufGeraet();
}

// Nach dem Anmelden (oder "Als Gast"): Profil laden, dann Charakter wählen oder zur Startseite
async function nachDemEinloggen() {
  ladenStart();
  try {
    await ladeOnlineProfil();
  } catch (fehler) {
    hinweis("start-hinweis", fehler.message);
    zeigeBildschirm("start");
    return;
  } finally {
    ladenEnde();
  }
  starteOnlineDienste();
  if (!profil.charakter || !darfCharakterSpielen(profil.charakter)) {
    oeffneCharakter("home");
  } else {
    nachAnmeldung();
  }
}

// Hinweise auf dem Startbildschirm (z. B. "Du wurdest eingeladen")
function zeigeStartHinweise() {
  zeigeBildschirm("start");
  if (freundesEinladung) {
    hinweis("start-hinweis", "Jemand möchte mit dir befreundet sein! Melde dich an oder spiel als Gast.");
  }
  if (einladungsCode) {
    hinweis("start-hinweis", "Du wurdest in die Lobby " + einladungsCode +
      " eingeladen! Melde dich an oder spiel als Gast – dann geht's direkt los.");
  }
}

// ===== Anmelden, Registrieren, Gast =====

// Übersetzt die häufigsten Fehlermeldungen von Supabase
function fehlerText(fehler) {
  const text = String((fehler && fehler.message) || fehler || "");
  if (/invalid login credentials/i.test(text)) return "E-Mail oder Passwort stimmt nicht.";
  if (/email not confirmed/i.test(text)) return "Bitte bestätige zuerst deine E-Mail (schau in dein Postfach).";
  if (/already registered|already been registered|already exists/i.test(text)) return "Diese E-Mail ist schon registriert – melde dich an.";
  if (/password should be at least|weak password/i.test(text)) return "Das Passwort ist zu kurz (mindestens 6 Zeichen).";
  if (/rate limit|too many/i.test(text)) return "Zu viele Versuche – warte bitte ein paar Minuten.";
  if (/valid email|invalid email|unable to validate email/i.test(text)) return "Bitte gib eine gültige E-Mail-Adresse ein.";
  if (/fetch|network/i.test(text)) return "Keine Verbindung zum Server. Bist du online?";
  return text || "Das hat nicht geklappt.";
}

// Wohin die Links in den E-Mails führen (zurück zum Spiel)
function zurueckLink() {
  return location.origin + location.pathname;
}

function leseAnmeldeFelder() {
  return {
    email: document.getElementById("email").value.trim(),
    passwort: document.getElementById("passwort").value
  };
}

async function anmelden() {
  const felder = leseAnmeldeFelder();
  if (!felder.email || !felder.passwort) {
    hinweis("start-hinweis", "Gib E-Mail und Passwort ein.");
    return;
  }
  ladenStart();
  const antwort = await db.auth.signInWithPassword({ email: felder.email, password: felder.passwort });
  ladenEnde();
  if (antwort.error) {
    hinweis("start-hinweis", fehlerText(antwort.error));
    return;
  }
  sitzung = antwort.data.session;
  await nachDemEinloggen();
}

async function registrieren() {
  const felder = leseAnmeldeFelder();
  if (!felder.email || !felder.passwort) {
    hinweis("start-hinweis", "Gib eine E-Mail und ein Passwort (mindestens 6 Zeichen) ein.");
    return;
  }
  ladenStart();
  const antwort = await db.auth.signUp({
    email: felder.email, password: felder.passwort,
    options: { emailRedirectTo: zurueckLink() }
  });
  ladenEnde();
  if (antwort.error) {
    hinweis("start-hinweis", fehlerText(antwort.error));
    return;
  }
  if (antwort.data.session) {
    sitzung = antwort.data.session;
    await nachDemEinloggen();
  } else {
    hinweis("start-hinweis", "📧 Fast geschafft! Wir haben dir eine E-Mail geschickt. " +
      "Tippe auf den Link darin – dann bist du angemeldet.");
  }
}

async function passwortVergessen() {
  const email = leseAnmeldeFelder().email;
  if (!email) {
    hinweis("start-hinweis", "Gib oben deine E-Mail ein, dann schicken wir dir einen Link.");
    return;
  }
  ladenStart();
  const antwort = await db.auth.resetPasswordForEmail(email, { redirectTo: zurueckLink() });
  ladenEnde();
  hinweis("start-hinweis", antwort.error ? fehlerText(antwort.error)
    : "📧 Wenn es ein Konto mit dieser E-Mail gibt, ist jetzt ein Link zum Zurücksetzen unterwegs.");
}

async function alsGastSpielen() {
  ladenStart();
  const antwort = await db.auth.signInAnonymously();
  ladenEnde();
  if (antwort.error) {
    hinweis("start-hinweis", fehlerText(antwort.error));
    return;
  }
  sitzung = antwort.data.session;
  await nachDemEinloggen();
}

// Fenster: neues Passwort festlegen (nach "Passwort vergessen" oder im Profil)
function zeigeNeuesPasswort() {
  const box = document.createElement("div");
  box.innerHTML = '<input type="password" placeholder="Neues Passwort (mind. 6 Zeichen)">' +
    '<button>Speichern</button><p class="hinweis"></p>';
  const meldung = box.querySelector("p");
  box.querySelector("button").onclick = async function () {
    const antwort = await db.auth.updateUser({ password: box.querySelector("input").value });
    meldung.textContent = antwort.error ? fehlerText(antwort.error) : "✓ Dein neues Passwort ist gespeichert.";
  };
  zeigeFenster("🔑 Neues Passwort", box);
}

// Gast-Konto mit einer E-Mail verbinden: Der Fortschritt bleibt erhalten
function zeigeAccountVerbinden() {
  const box = document.createElement("div");
  box.innerHTML = '<p>Mit einer E-Mail bleibt dein Fortschritt erhalten – auch auf anderen Geräten. ' +
    'Außerdem bekommst du Hannes UND Chiara und kannst im Shop Charaktere kaufen.</p>' +
    '<input type="email" placeholder="E-Mail"><button>E-Mail verbinden</button><p class="hinweis"></p>';
  const meldung = box.querySelector(".hinweis");
  box.querySelector("button").onclick = async function () {
    const email = box.querySelector("input").value.trim();
    const antwort = await db.auth.updateUser({ email: email }, { emailRedirectTo: zurueckLink() });
    meldung.textContent = antwort.error ? fehlerText(antwort.error)
      : "📧 Wir haben dir eine E-Mail geschickt. Tippe auf den Link darin. " +
        "Danach kannst du hier im Profil ein Passwort festlegen.";
  };
  zeigeFenster("🔗 Account verbinden", box);
}

async function abmelden() {
  const text = istAngemeldet()
    ? "Wirklich abmelden?"
    : "Du spielst als Gast. Wenn du dich abmeldest, ist dein Fortschritt weg! " +
      "Verbinde vorher deinen Account mit einer E-Mail. Trotzdem abmelden?";
  if (!confirm(text)) {
    return;
  }
  stoppeOnlineDienste();
  await db.auth.signOut();
  sitzung = null;
  loescheProfil();
  zeigeBildschirm("start");
}

async function kontoLoeschen() {
  if (!confirm("Willst du dein Konto wirklich löschen? Name, Charakter, Spielgeld, Inventar, " +
      "Freunde und Erfolge sind dann für immer weg.")) {
    return;
  }
  ladenStart();
  const antwort = await db.rpc("loesche_mein_konto");
  ladenEnde();
  if (antwort.error) {
    alert("Das Konto konnte nicht gelöscht werden: " + fehlerText(antwort.error));
    return;
  }
  stoppeOnlineDienste();
  await db.auth.signOut();
  sitzung = null;
  loescheProfil();
  zeigeBildschirm("start");
}

// ===== Profil speichern =====
// Änderungen werden kurz gesammelt und dann in einem Rutsch an Supabase geschickt.

let speicherTimer = null;

function speichereOnline() {
  if (!sitzung || !profil || !profil.uid) {
    return;
  }
  clearTimeout(speicherTimer);
  speicherTimer = setTimeout(async function () {
    const daten = {};
    EIGENE_FELDER.forEach(function (feld) { daten[feld] = profil[feld]; });
    const antwort = await db.from("profil").update(daten).eq("id", profil.uid).select().single();
    if (antwort.error) {
      // Z. B. einen Charakter gewählt, den man nicht besitzt: den Stand von Supabase zurückholen
      console.warn("Profil nicht gespeichert:", antwort.error.message);
      const stand = await db.from("profil").select("*").eq("id", profil.uid).single();
      if (!stand.error) {
        profil.charakter = stand.data.charakter;
        profil.skins = stand.data.skins || {};
        uebernimmServerWerte(stand.data);
      }
      return;
    }
    uebernimmServerWerte(antwort.data);
  }, 400);
}

// Name ändern (3–16 Zeichen)
function zeigeNameAendern() {
  const box = document.createElement("div");
  box.innerHTML = '<input type="text" maxlength="16"><button>Speichern</button><p class="hinweis"></p>';
  const feld = box.querySelector("input");
  feld.value = profil.name;
  box.querySelector("button").onclick = function () {
    const name = feld.value.trim();
    if (name.length < 3 || name.length > 16) {
      box.querySelector("p").textContent = "Der Name muss 3 bis 16 Zeichen lang sein.";
      return;
    }
    profil.name = name;
    speichereProfil();
    schliesseFenster();
    zeigeProfil();
  };
  zeigeFenster("✏️ Name ändern", box);
}

// ===== Online-Dienste: "Ich bin online" und Einladungen empfangen =====

let onlineTimer = null;
let einladungsKanal = null;

function starteOnlineDienste() {
  stoppeOnlineDienste();
  if (!sitzung) {
    return;
  }
  function online() { db.rpc("ich_bin_online").then(function () {}, function () {}); }
  online();
  onlineTimer = setInterval(online, 60000);
  // Eigener Kanal: hier kommen Einladungen von Freunden an
  einladungsKanal = db.channel("einladung:" + sitzung.user.id, { config: { private: true } });
  einladungsKanal.on("broadcast", { event: "einladung" }, function (nachricht) {
    zeigeEinladung(nachricht.payload);
  }).subscribe();
}

function stoppeOnlineDienste() {
  clearInterval(onlineTimer);
  onlineTimer = null;
  if (einladungsKanal) {
    db.removeChannel(einladungsKanal);
    einladungsKanal = null;
  }
}

// Pop-up "Anna lädt dich ein"
function zeigeEinladung(einladung) {
  if (!einladung || !einladung.code || aktuellerBildschirm === "spiel") {
    return;
  }
  const box = document.createElement("div");
  const text = document.createElement("p");
  text.textContent = (einladung.name || "Ein Freund") + " lädt dich in die Lobby " + einladung.code + " ein.";
  const knopf = document.createElement("button");
  knopf.textContent = "Beitreten";
  knopf.onclick = function () {
    schliesseFenster();
    betreteLobby(einladung.code);
  };
  box.appendChild(text);
  box.appendChild(knopf);
  zeigeFenster("🎮 Einladung", box);
}

// Schickt einem Freund (der gerade online ist) eine Einladung in die eigene Lobby
async function ladeFreundEin(freund, knopf) {
  const kanal = db.channel("einladung:" + freund.uid, { config: { private: true } });
  knopf.disabled = true;
  kanal.subscribe(function (status) {
    if (status !== "SUBSCRIBED") {
      return;
    }
    kanal.send({ type: "broadcast", event: "einladung",
      payload: { code: aktuelleLobby.code, name: profil.name } }).then(function () {
      knopf.textContent = "✓ Eingeladen";
      setTimeout(function () { db.removeChannel(kanal); }, 1000);
    });
  });
}
