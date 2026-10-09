// ===== Oberfläche: Bildschirme, Kopfzeile, Fenster, Ladeanzeige =====

// Für jeden Bildschirm: Titel oben und wohin "Zurück" führt.
// zurueck: Name eines Bildschirms, eine Funktion, die ihn ausrechnet, oder fehlt (= kein Zurück)
const KOPF = {
  start:               { titel: "Quiz" },
  charakter:           { titel: "Dein Charakter", zurueck: function () { return charakterZurueckZu === "inventar" ? "inventar" : null; } },
  home:                { titel: "Quiz" },
  profil:              { titel: "Profil", zurueck: "home" },
  "app-einstellungen": { titel: "Einstellungen", zurueck: "profil" },
  freunde:             { titel: "Freunde", zurueck: function () { return freundeZurueckZu; } },
  shop:                { titel: "Shop", zurueck: "home" },
  battlepass:          { titel: "Battlepass", zurueck: "home" },
  inventar:            { titel: "Inventar", zurueck: "home" },
  sammlung:            { titel: "Inventar", zurueck: "inventar" },
  erfolge:             { titel: "Erfolge", zurueck: "inventar" },
  menue:               { titel: "Spielen", zurueck: "home" },
  einstellungen:       { titel: "Lobby", zurueck: "menue" },
  warteraum:           { titel: "Lobby", zurueck: "menue" },
  spiel:               { titel: "", zurueck: "spiel-verlassen" },
  ergebnis:            { titel: "Ergebnis", zurueck: "home" }
};

let aktuellerBildschirm = "start";

// Zeigt einen Bildschirm an, versteckt alle anderen und passt die Kopfzeile an
function zeigeBildschirm(id) {
  document.querySelectorAll(".bildschirm").forEach(function (b) {
    b.classList.remove("aktiv");
  });
  document.getElementById(id).classList.add("aktiv");
  aktuellerBildschirm = id;

  const kopf = KOPF[id] || { titel: "Quiz" };
  const imSpiel = id === "spiel";
  document.getElementById("kopf-titel").textContent = imSpiel && spielstand && spielstand.spiel
    ? spielstand.spiel.name : kopf.titel;
  document.getElementById("knopf-zurueck-oben").hidden = !zurueckZiel();
  document.getElementById("knopf-spiel-info").hidden = !imSpiel;
  document.getElementById("knopf-pause").hidden = !imSpiel;
  document.getElementById("knopf-ton").hidden = !imSpiel;
  window.scrollTo(0, 0);
}

// Wohin führt "Zurück" auf dem aktuellen Bildschirm?
function zurueckZiel() {
  const kopf = KOPF[aktuellerBildschirm];
  if (!kopf || !kopf.zurueck) {
    return null;
  }
  return typeof kopf.zurueck === "function" ? kopf.zurueck() : kopf.zurueck;
}

// Der Zurück-Knopf oben links
function geheZurueck() {
  const ziel = zurueckZiel();
  if (ziel === "spiel-verlassen") {
    if (confirm("Spiel wirklich verlassen? Der Fortschritt dieses Spiels geht verloren.")) {
      brichSpielAb();
      zeigeHome();
    }
  } else if (ziel === "home") {
    zeigeHome();
  } else if (ziel === "profil") {
    zeigeProfil();
  } else if (ziel) {
    zeigeBildschirm(ziel);
  }
}

// Setzt den Titel in der Kopfzeile (z. B. den Namen der Spielart)
function setzeTitel(text) {
  document.getElementById("kopf-titel").textContent = text;
}

// Zeigt kurz einen Hinweistext an (z. B. "kommt bald")
function hinweis(id, text) {
  document.getElementById(id).textContent = text;
}

// ===== Fenster (liegt über allem) =====

let fensterBeimSchliessen = null;

// Öffnet ein Fenster. "inhalt" ist Text oder ein HTML-Element.
function zeigeFenster(titel, inhalt, knopfText, beimSchliessen) {
  document.getElementById("fenster-titel").textContent = titel;
  const box = document.getElementById("fenster-inhalt");
  box.innerHTML = "";
  if (typeof inhalt === "string") {
    const p = document.createElement("p");
    p.textContent = inhalt;
    box.appendChild(p);
  } else {
    box.appendChild(inhalt);
  }
  document.getElementById("fenster-schliessen").textContent = knopfText || "Schließen";
  fensterBeimSchliessen = beimSchliessen || null;
  document.getElementById("fenster").hidden = false;
}

function schliesseFenster() {
  document.getElementById("fenster").hidden = true;
  const danach = fensterBeimSchliessen;
  fensterBeimSchliessen = null;
  if (danach) {
    danach();
  }
}

// ===== Ladeanzeige =====
// Zählt mit, wie viele Dinge gerade laden – die Anzeige verschwindet erst, wenn alles fertig ist.

let ladeZaehler = 0;

function ladenStart() {
  ladeZaehler = ladeZaehler + 1;
  document.getElementById("laden").hidden = false;
}

function ladenEnde() {
  ladeZaehler = Math.max(0, ladeZaehler - 1);
  if (ladeZaehler === 0) {
    document.getElementById("laden").hidden = true;
  }
}

// ===== Kopieren und Teilen =====

// Kopiert Text in die Zwischenablage und zeigt kurz "Kopiert!" auf dem Knopf
function kopiere(text, knopf) {
  function fertig() {
    if (knopf) {
      const vorher = knopf.textContent;
      knopf.textContent = "✓ Kopiert!";
      setTimeout(function () { knopf.textContent = vorher; }, 1500);
    }
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(fertig, function () { prompt("Zum Kopieren:", text); });
  } else {
    prompt("Zum Kopieren:", text);
  }
}

// Öffnet das Teilen-Menü des Handys (WhatsApp usw.) – sonst wird kopiert
function teile(titel, text, link, knopf) {
  if (navigator.share) {
    navigator.share({ title: titel, text: text, url: link }).catch(function () { /* abgebrochen */ });
  } else {
    kopiere(link, knopf);
  }
}
