spiele.kaertchen = {
  name: "Kärtchen",
  // Kurze Erklärung (erscheint vor der Runde und beim „i“ neben dem Spielnamen)
  beschreibung: "Finde alle richtigen Kärtchen. Jedes richtige gibt 50 Punkte – aber ein falsches und du bist raus bis zur nächsten Frage!",
  fragenProRunde: 3,
  // 50 Punkte für jedes richtige Kärtchen (statt 50 für die ganze Frage)
  punkteJeTreffer: true,
  // Feste Zeit pro Frage – gilt immer, egal was in der Lobby eingestellt ist
  festeZeit: 60,
  // Name der Tabelle in Supabase (ist sie leer, kommen die Fragen aus "fragenQuelle")
  tabelle: "kaertchen",
  // CSV-Link des Tabellenblatts "kaertchen" (gleicher Link wie bei Multiple Choice, nur andere gid)
  // Steht hier "", wird diese Spielart einfach übersprungen.
  fragenQuelle: "",

  // Wandelt eine Tabellenzeile in eine Frage um
  // Spalten im Blatt: id, kategorie, text, richtig, falsch, info
  // In "richtig" und "falsch" stehen mehrere Namen, getrennt mit Semikolon:
  //   Kit Harington; Emilia Clarke; Peter Dinklage
  zeileZuFrage: function (zeile) {
    function trenne(text) {
      return String(text || "").split(/[;\n]/)
        .map(function (t) { return t.trim(); })
        .filter(function (t) { return t; });
    }
    return {
      id: zeile.id,
      kategorie: zeile.kategorie,
      text: zeile.text,
      richtig: trenne(zeile.richtig),
      falsch: trenne(zeile.falsch)
    };
  },

  // 15 Kärtchen (3 nebeneinander, 5 untereinander). Jedes richtige gibt 1 Punkt.
  // Ein falsches Kärtchen und man ist raus bis zur nächsten Frage.
  zeige: function (frage, spielfeld, fertig) {
    spielfeld.innerHTML = "";

    const titel = document.createElement("h2");
    titel.textContent = frage.text;
    spielfeld.appendChild(titel);

    const stand = document.createElement("p");
    stand.className = "hinweis";
    spielfeld.appendChild(stand);

    // Alle richtigen Kärtchen und so viele falsche, dass es 15 sind
    const richtige = frage.richtig;
    const falsche = mische(frage.falsch).slice(0, Math.max(0, 15 - richtige.length));
    const gitter = document.createElement("div");
    gitter.className = "kaertchen-gitter";
    spielfeld.appendChild(gitter);

    let gefunden = 0;
    function zeigeStand() {
      stand.textContent = "Gefunden: " + gefunden + " von " + richtige.length +
        " – ein Fehler und du bist raus!";
    }
    zeigeStand();

    let vorbei = false;
    function beenden() {
      if (vorbei) {
        return;
      }
      vorbei = true;
      // Verpasste richtige Kärtchen grün umranden
      gitter.querySelectorAll("[data-richtig]:not(.richtig)").forEach(function (k) {
        k.classList.add("verpasst");
      });
      abschliessen(gefunden, richtige.length, fertig);
    }

    mische(richtige.concat(falsche)).forEach(function (name) {
      const karte = document.createElement("button");
      karte.className = "kaertchen";
      karte.textContent = name;
      const istRichtig = richtige.includes(name);
      if (istRichtig) {
        karte.dataset.richtig = "ja";
      }
      karte.onclick = function () {
        karte.disabled = true;
        if (istRichtig) {
          karte.classList.add("richtig");
          gefunden = gefunden + 1;
          zeigeStand();
          if (gefunden === richtige.length) {
            stand.textContent = "Alle gefunden! 🎉";
            beenden();
          }
        } else {
          karte.classList.add("falsch");
          stand.textContent = "Falsch – du bist raus! " + gefunden + " von " + richtige.length + " gefunden.";
          beenden();
        }
      };
      gitter.appendChild(karte);
    });

    // Wenn die Zeit abläuft, zählen die bis dahin gefundenen Kärtchen
    return beenden;
  }
};
