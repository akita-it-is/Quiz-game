// ===== Was passiert, wenn man auf einen Knopf tippt =====
// (zeigeBildschirm, Kopfzeile und Fenster stehen in oberflaeche.js)

// --- Kopfzeile und Fenster ---
document.getElementById("knopf-zurueck-oben").onclick = geheZurueck;
document.getElementById("fenster-schliessen").onclick = schliesseFenster;
document.getElementById("knopf-pause").onclick = function () {
  if (spielstand && spielstand.online) {
    // Online: Nur der Host kann pausieren – dann für alle
    hostPause(true);
    return;
  }
  pausiereSpiel("⏸ Pausiert", pauseInhalt("Das Spiel ist angehalten."));
};
document.getElementById("knopf-spiel-info").onclick = function () {
  if (spielstand && spielstand.spiel) {
    // Während man liest, läuft die Zeit nicht weiter
    pausiereSpiel(spielstand.spiel.name, spielstand.spiel.beschreibung, "Verstanden");
  }
};
document.getElementById("knopf-ton").onclick = function () {
  zeigeFenster("Einstellungen", baueTonSchalter());
};

// --- Startbildschirm ---
document.getElementById("knopf-anmelden").onclick = anmelden;
document.getElementById("knopf-registrieren").onclick = registrieren;
document.getElementById("knopf-passwort-vergessen").onclick = passwortVergessen;
document.getElementById("knopf-google").onclick = function () {
  hinweis("start-hinweis", "Google-Anmeldung kommt bald – melde dich solange mit E-Mail an oder spiel als Gast.");
};
document.getElementById("knopf-gast").onclick = alsGastSpielen;

// --- Charakter ---
document.getElementById("knopf-neuer-name").onclick = function () {
  profil.name = zufallsName();
  zeigeCharakter();
};
document.getElementById("knopf-charakter-fertig").onclick = charakterFertig;

// --- Startseite ---
document.getElementById("knopf-profilbild").onclick = zeigeProfil;
document.getElementById("knopf-quiz").onclick = function () {
  hinweis("menue-hinweis", "");
  zeigeBildschirm("menue");
};
document.getElementById("knopf-shop").onclick = zeigeShop;
document.getElementById("knopf-battlepass").onclick = zeigeBattlepass;
document.getElementById("knopf-bp-kaufen").onclick = kaufeBattlepass;
document.getElementById("knopf-bp-alle").onclick = holeAlleBelohnungen;
document.getElementById("knopf-inventar").onclick = function () {
  zeigeBildschirm("inventar");
};

// --- Profil ---
document.getElementById("knopf-profil-info").onclick = function () {
  const info = document.getElementById("profil-info");
  info.textContent = profilInfoText();
  info.hidden = !info.hidden;
};
document.getElementById("knopf-verbinden").onclick = function () {
  // Gast: E-Mail verbinden. Mit E-Mail: Passwort festlegen oder ändern.
  if (istAngemeldet()) {
    zeigeNeuesPasswort();
  } else {
    zeigeAccountVerbinden();
  }
};
document.getElementById("knopf-name-aendern").onclick = zeigeNameAendern;
document.getElementById("knopf-abmelden").onclick = abmelden;
document.getElementById("knopf-id-kopieren").onclick = function () {
  kopiere(profil.spielerId, this);
};
document.getElementById("knopf-freunde-profil").onclick = function () {
  zeigeFreunde("profil");
};
document.getElementById("knopf-einstellungen-profil").onclick = function () {
  const box = document.getElementById("ton-einstellungen");
  box.innerHTML = "";
  box.appendChild(baueTonSchalter());
  zeigeBildschirm("app-einstellungen");
};

// --- Einstellungen ---
document.getElementById("knopf-profil-loeschen").onclick = kontoLoeschen;

// --- Inventar ---
document.getElementById("knopf-outfits").onclick = function () {
  oeffneCharakter("inventar");
};
document.getElementById("knopf-emotes").onclick = function () {
  zeigeSammlung("emote");
};
document.getElementById("knopf-sprueche").onclick = function () {
  zeigeSammlung("spruch");
};
document.getElementById("knopf-haustiere").onclick = function () {
  zeigeSammlung("haustier");
};
document.getElementById("knopf-erfolge").onclick = zeigeErfolge;

// --- Menü ---
document.getElementById("knopf-lobby-erstellen").onclick = function () {
  oeffneEinstellungen().catch(zeigeFehler);
};
document.getElementById("knopf-beitreten").onclick = function () {
  betreteLobby(document.getElementById("lobby-code-eingabe").value);
};
document.getElementById("knopf-freunde-menue").onclick = function () {
  zeigeFreunde("menue");
};

// --- Freunde ---
document.getElementById("knopf-id-kopieren-2").onclick = function () {
  kopiere(profil.spielerId, this);
};
document.getElementById("knopf-freund-hinzufuegen").onclick = fuegeFreundHinzu;
document.getElementById("knopf-freundes-link").onclick = function () {
  teileFreundesLink(this);
};
document.getElementById("knopf-freund-einladen").onclick = zeigeFreundEinladen;

// --- Lobby-Code kopieren und Link teilen (Host und Mitspieler) ---
document.getElementById("knopf-code-kopieren").onclick = function () {
  kopiere(aktuelleLobby.code, this);
};
document.getElementById("knopf-link-teilen").onclick = function () {
  teileLobby(aktuelleLobby.code, this);
};
document.getElementById("knopf-warteraum-code").onclick = function () {
  kopiere(aktuelleLobby.code, this);
};
document.getElementById("knopf-warteraum-link").onclick = function () {
  teileLobby(aktuelleLobby.code, this);
};
document.getElementById("knopf-daily").onclick = function () {
  hinweis("menue-hinweis", "Das Daily Quiz kommt bald.");
};

// --- Einstellungen ---
document.getElementById("knopf-spiel-starten").onclick = function () {
  const einstellungen = leseEinstellungen();
  if (Object.keys(einstellungen.kategorien).length === 0) {
    alert("Bitte mindestens eine Kategorie auswählen.");
    return;
  }
  // Mit anderen in der Lobby: online spielen, allein: wie bisher
  if (lobbySpieler.length > 1) {
    starteOnline(einstellungen);
  } else {
    starteSpiel(einstellungen).catch(zeigeFehler);
  }
};

// --- Ergebnis ---
document.getElementById("knopf-nochmal").onclick = function () {
  if (spielstand && spielstand.online) {
    zurueckZurLobby();
    return;
  }
  starteSpiel(spielstand.einstellungen).catch(zeigeFehler);
};
document.getElementById("knopf-zum-menue").onclick = function () {
  // Nach einem Online-Spiel: Lobby verlassen
  trenneLobby();
  zeigeHome();
};

// Beim Öffnen der Seite: Ist man schon angemeldet? Dann direkt weiter, sonst Startbildschirm.
zeigeBildschirm("start");
kontoStart();
