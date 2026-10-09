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
  zeigeBildschirm("menue");
};

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
document.getElementById("knopf-zum-menue").onclick = function () {
  zeigeBildschirm("menue");
};

// Beim Öffnen der Seite mit dem Startbildschirm beginnen
zeigeBildschirm("start");
