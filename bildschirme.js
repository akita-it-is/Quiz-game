// ===== Was passiert, wenn man auf einen Knopf tippt =====
// (zeigeBildschirm, Kopfzeile und Fenster stehen in oberflaeche.js)

// --- Kopfzeile und Fenster ---
document.getElementById("knopf-zurueck-oben").onclick = geheZurueck;
document.getElementById("fenster-schliessen").onclick = schliesseFenster;
document.getElementById("knopf-pause").onclick = function () {
  pausiereSpiel("⏸ Pausiert", pauseInhalt("Das Spiel ist angehalten. Im Online-Spiel kann nur der Host pausieren."));
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
document.getElementById("knopf-anmelden").onclick = function () {
  hinweis("start-hinweis", "Anmelden kommt bald – spiel solange als Gast.");
};
document.getElementById("knopf-google").onclick = function () {
  hinweis("start-hinweis", "Google-Anmeldung kommt bald – spiel solange als Gast.");
};
document.getElementById("knopf-gast").onclick = function () {
  if (profil && profil.charakter) {
    // Schon mal als Gast gespielt: direkt zur Startseite (oder in die Lobby, falls eingeladen)
    nachAnmeldung();
  } else if (profil) {
    // Altes Profil aus der Zeit vor den Tier-Charakteren: einmal Charakter aussuchen
    oeffneCharakter("home");
  } else {
    // Zum ersten Mal: Charakter wählen, zufälliger Name
    profil = neuesProfil();
    oeffneCharakter("home");
  }
};

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
  hinweis("profil-hinweis", "Account verbinden kommt bald – dann bleibt dein Fortschritt auf allen Geräten.");
};
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
document.getElementById("knopf-profil-loeschen").onclick = function () {
  // Sicherheitsfrage, damit man nicht aus Versehen alles löscht
  if (confirm("Willst du dein Profil wirklich löschen? Name, Charakter, Statistik und Erfolge sind dann weg.")) {
    loescheProfil();
    zeigeBildschirm("start");
  }
};

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
  if (einstellungen.kategorien.length === 0) {
    alert("Bitte mindestens eine Kategorie auswählen.");
    return;
  }
  starteSpiel(einstellungen).catch(zeigeFehler);
};

// --- Ergebnis ---
document.getElementById("knopf-nochmal").onclick = function () {
  starteSpiel(spielstand.einstellungen).catch(zeigeFehler);
};
document.getElementById("knopf-zum-menue").onclick = zeigeHome;

// Älteren Profilen fehlende Felder ergänzen (falls später neue dazukommen)
if (profil) {
  const vorlage = neuesProfil();
  profil = Object.assign(vorlage, profil);
  delete profil.figur; // altes Figur-/Outfit-System – jetzt gibt es Tier-Charaktere mit Skins
  profil.skins = profil.skins || {};
  // Haustiere sind jetzt Insekten – ein altes Haustier (Hund, Katze …) gibt es nicht mehr
  if (profil.haustier && !HAUSTIERE.some(function (h) { return h.id === profil.haustier; })) {
    profil.haustier = null;
  }
  // Battlepass-Belohnung war früher die "Goldene Rüstung" – jetzt ist es der Königs-Skin
  profil.besitz = profil.besitz.map(function (id) { return id === "bp-ruestung" ? "koenig" : id; });
  profil.statistik = Object.assign(neuesProfil().statistik, profil.statistik);
  profil.deck = Object.assign(neuesProfil().deck, profil.deck);
  // vorlage enthält schon eine neue spielerId, falls das alte Profil noch keine hatte – gleich speichern
  speichereProfil();
  delete profil.ausgeruestet; // alte Version (nur 1 Emote/Spruch) – jetzt gibt es das Deck
}

// Beim Öffnen der Seite mit dem Startbildschirm beginnen
zeigeBildschirm("start");
if (einladungsCode) {
  hinweis("start-hinweis", "Du wurdest in die Lobby " + einladungsCode +
    " eingeladen! Melde dich an oder spiel als Gast – dann geht's direkt los.");
}
