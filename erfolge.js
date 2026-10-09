// ===== Erfolge (Achievements) =====
// Neue Erfolge einfach hier in die Liste eintragen.
// "fortschritt" sagt, wie weit man ist; "ziel" ist die Zahl, die man erreichen muss.
const ERFOLGE = [
  {
    id: "serie5",
    titel: "Auf einer Welle",
    text: "Beantworte 5 Fragen hintereinander richtig",
    ziel: 5,
    fortschritt: function (s) { return s.besteSerie; }
  },
  {
    id: "richtig10",
    titel: "Wissensdurst",
    text: "Beantworte 10 Fragen richtig",
    ziel: 10,
    fortschritt: function (s) { return s.richtigGesamt; }
  }
];

// Wird nach jeder Frage aufgerufen (aus main.js).
// Als "richtig" zählt jede Frage, bei der man Punkte bekommen hat.
function zaehleAntwort(richtig) {
  const s = profil.statistik;
  if (richtig) {
    s.richtigGesamt = s.richtigGesamt + 1;
    s.serie = s.serie + 1;
    s.besteSerie = Math.max(s.besteSerie, s.serie);
  } else {
    s.serie = 0;
  }
  pruefeErfolge();
  speichereProfil();
}

// Schaut, ob ein neuer Erfolg geschafft ist, und zeigt dann die Box oben rechts
function pruefeErfolge() {
  ERFOLGE.forEach(function (erfolg) {
    if (!profil.erfolge[erfolg.id] && erfolg.fortschritt(profil.statistik) >= erfolg.ziel) {
      profil.erfolge[erfolg.id] = new Date().toISOString().slice(0, 10);
      zeigeErfolgBox(erfolg);
    }
  });
}

// Box oben rechts: erst der Erfolg, dann erscheint ein Haken mit "Completed"
function zeigeErfolgBox(erfolg) {
  const box = document.createElement("div");
  box.className = "erfolg-meldung";
  box.innerHTML =
    '<div class="erfolg-text"><small>🏆 Erfolg</small><strong></strong></div>' +
    '<div class="erfolg-haken">' +
    '<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="23"/><path d="M14 27 l8 8 l16 -17"/></svg>' +
    '<span>Completed</span></div>';
  box.querySelector("strong").textContent = erfolg.text;
  document.getElementById("erfolg-box").appendChild(box);

  // Nach 4 Sekunden wieder herausgleiten und entfernen
  setTimeout(function () { box.classList.add("weg"); }, 4000);
  setTimeout(function () { box.remove(); }, 4600);
}

// Erfolge-Bildschirm: alle Erfolge mit Fortschritt
function zeigeErfolge() {
  const liste = document.getElementById("erfolge-liste");
  liste.innerHTML = "";
  ERFOLGE.forEach(function (erfolg) {
    const geschafft = profil.erfolge[erfolg.id];
    const stand = Math.min(erfolg.fortschritt(profil.statistik), erfolg.ziel);
    const eintrag = document.createElement("div");
    eintrag.className = "erfolg-eintrag" + (geschafft ? " geschafft" : "");

    const titel = document.createElement("strong");
    titel.textContent = (geschafft ? "✅ " : "🔒 ") + erfolg.titel;
    const text = document.createElement("p");
    text.textContent = erfolg.text;
    const balken = document.createElement("div");
    balken.className = "erfolg-balken";
    balken.innerHTML = "<div></div>";
    balken.firstChild.style.width = (stand / erfolg.ziel * 100) + "%";
    const zahl = document.createElement("small");
    zahl.textContent = geschafft ? "Geschafft am " + geschafft : stand + " / " + erfolg.ziel;

    eintrag.appendChild(titel);
    eintrag.appendChild(text);
    eintrag.appendChild(balken);
    eintrag.appendChild(zahl);
    liste.appendChild(eintrag);
  });
  zeigeBildschirm("erfolge");
}
