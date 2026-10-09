// Zeigt einen Bildschirm an und versteckt alle anderen
function zeigeBildschirm(id) {
  document.querySelectorAll(".bildschirm").forEach(function (b) {
    b.classList.remove("aktiv");
  });
  document.getElementById(id).classList.add("aktiv");
}

// Zeigt kurz einen Hinweistext an (z. B. "kommt bald")
function hinweis(id, text) {
  document.getElementById(id).textContent = text;
}

// --- Startbildschirm ---
document.getElementById("knopf-anmelden").onclick = function () {
  hinweis("start-hinweis", "Anmelden kommt bald – spiel solange als Gast.");
};
document.getElementById("knopf-google").onclick = function () {
  hinweis("start-hinweis", "Google-Anmeldung kommt bald – spiel solange als Gast.");
};
document.getElementById("knopf-gast").onclick = function () {
  if (profil) {
    // Schon mal als Gast gespielt: direkt zur Startseite
    zeigeHome();
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
document.getElementById("knopf-charakter-fertig").onclick = function () {
  speichereProfil();
  if (charakterZurueckZu === "inventar") {
    zeigeBildschirm("inventar");
  } else {
    zeigeHome();
  }
};

// --- Startseite ---
document.getElementById("knopf-profilbild").onclick = zeigeProfil;
document.getElementById("knopf-quiz").onclick = function () {
  hinweis("menue-hinweis", "");
  zeigeBildschirm("menue");
};
document.getElementById("knopf-shop").onclick = function () {
  zeigeBildschirm("shop");
};
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
document.getElementById("knopf-einstellungen-profil").onclick = function () {
  zeigeBildschirm("app-einstellungen");
};

// --- Einstellungen ---
document.getElementById("knopf-einstellungen-zurueck").onclick = zeigeProfil;
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
document.getElementById("knopf-erfolge").onclick = zeigeErfolge;

// --- Zurück-Knöpfe (es gibt mehrere davon) ---
document.querySelectorAll(".zurueck-home").forEach(function (knopf) {
  knopf.onclick = zeigeHome;
});
document.querySelectorAll(".zurueck-inventar").forEach(function (knopf) {
  knopf.onclick = function () { zeigeBildschirm("inventar"); };
});

// --- Menü ---
document.getElementById("knopf-lobby-erstellen").onclick = function () {
  oeffneEinstellungen().catch(zeigeFehler);
};
document.getElementById("knopf-beitreten").onclick = function () {
  hinweis("menue-hinweis", "Lobbys beitreten kommt bald (Online-Spiel).");
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
document.getElementById("knopf-zurueck").onclick = function () {
  zeigeBildschirm("menue");
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
  profil.figur = Object.assign(neuesProfil().figur, profil.figur);
  profil.statistik = Object.assign(neuesProfil().statistik, profil.statistik);
}

// Beim Öffnen der Seite mit dem Startbildschirm beginnen
zeigeBildschirm("start");
