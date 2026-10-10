spiele.entwederOder = {
  name: "Entweder oder",
  // Kurze Erklärung (erscheint vor der Runde und beim „i“ neben dem Spielnamen)
  beschreibung: "Zu welcher der beiden Möglichkeiten passt die Aussage? Ein Fehler und du bist raus. Schaffst du alle 5, gibt es 50 Punkte.",
  fragenProRunde: 3,
  // Online: Wer alle schafft (oder am längsten durchhält), bekommt 50 (siehe mehrspieler.js)
  mehrspieler: "ueberleben",
  // Name der Tabelle in Supabase, aus der die Fragen kommen
  tabelle: "entweder_oder",

  // Wandelt eine Tabellenzeile in eine Frage um
  // Spalten in der Tabelle: id, kategorie, option1, option2, aussage1 … aussage5, zu1 … zu5, info
  // In "zuX" steht 1 oder 2: zu welcher Option die Aussage gehört
  zeileZuFrage: function (zeile) {
    const option1 = String(zeile.option1 || "").trim();
    const option2 = String(zeile.option2 || "").trim();
    const aussagen = [];
    for (let i = 1; i <= 5; i++) {
      const text = String(zeile["aussage" + i] || "").trim();
      const zu = String(zeile["zu" + i] || "").trim();
      if (text) {
        // "2" oder der Name der zweiten Option zählt als Option 2, alles andere als Option 1
        aussagen.push({ text: text, zu: (zu === "2" || zu.toLowerCase() === option2.toLowerCase()) ? 2 : 1 });
      }
    }
    return {
      id: zeile.id,
      kategorie: zeile.kategorie,
      text: zeile.text || option1 + " oder " + option2 + "?",
      optionen: [option1, option2],
      aussagen: aussagen
    };
  },

  // Zeigt die Aussagen nacheinander. Bei jeder wählt man Option 1 oder 2.
  // Ein Fehler und man ist raus. Wer alle Aussagen richtig hat, bekommt 1 Punkt.
  // (Online bekommt später auch der Letzte, der übrig bleibt, den Punkt.)
  zeige: function (frage, spielfeld, fertig) {
    spielfeld.innerHTML = "";

    const titel = document.createElement("h2");
    titel.textContent = frage.text;
    spielfeld.appendChild(titel);

    const bereich = document.createElement("div");
    spielfeld.appendChild(bereich);

    let nummer = 0;
    let vorbei = false;

    // Zeigt die aktuelle Aussage mit den zwei Knöpfen
    function zeigeAussage() {
      const aussage = frage.aussagen[nummer];
      bereich.innerHTML = "";
      bereich.className = "eo-bereich";
      void bereich.offsetWidth; // startet die Einblend-Animation neu
      bereich.classList.add("neu");

      const fortschritt = document.createElement("p");
      fortschritt.className = "hinweis";
      fortschritt.textContent = "Aussage " + (nummer + 1) + " von " + frage.aussagen.length + "  " +
        frage.aussagen.map(function (a, i) { return i < nummer ? "●" : "○"; }).join("");
      bereich.appendChild(fortschritt);

      const text = document.createElement("div");
      text.className = "eo-aussage";
      text.textContent = aussage.text;
      bereich.appendChild(text);

      const reihe = document.createElement("div");
      reihe.className = "reihe";
      frage.optionen.forEach(function (option, i) {
        const knopf = document.createElement("button");
        knopf.textContent = option;
        if (aussage.zu === i + 1) {
          knopf.dataset.richtig = "ja";
        }
        knopf.onclick = function () { antworten(knopf); };
        reihe.appendChild(knopf);
      });
      bereich.appendChild(reihe);

      // Ab der zweiten Aussage startet der Timer für jede Aussage neu
      if (nummer > 0) {
        starteTimer(zeitFuer(spiele.entwederOder), zuSpaet);
      }
    }

    // Wertet die gewählte Option aus (gewaehlterKnopf = null: Zeit abgelaufen)
    function antworten(gewaehlterKnopf) {
      if (vorbei) {
        return;
      }
      pausiereTimer();
      const knoepfe = bereich.querySelectorAll("button");
      knoepfe.forEach(function (k) { k.disabled = true; });
      const richtigerKnopf = bereich.querySelector("[data-richtig]");
      richtigerKnopf.classList.add("richtig");

      if (gewaehlterKnopf === richtigerKnopf) {
        nummer = nummer + 1;
        if (nummer === frage.aussagen.length) {
          vorbei = true;
          melde("Alle richtig! 🎉");
          abschliessen(1, 1, fertig, { richtig: nummer });
        } else {
          // Kurz grün zeigen, dann die nächste Aussage
          setTimeout(zeigeAussage, 700);
        }
      } else {
        vorbei = true;
        if (gewaehlterKnopf) {
          gewaehlterKnopf.classList.add("falsch");
        }
        melde((gewaehlterKnopf ? "Falsch" : "Zeit um") + " – du bist raus! " +
          nummer + " von " + frage.aussagen.length + " geschafft.");
        abschliessen(0, 1, fertig, { richtig: nummer });
      }
    }

    function melde(text) {
      const p = document.createElement("p");
      p.className = "eo-meldung";
      p.textContent = text;
      bereich.appendChild(p);
    }

    function zuSpaet() {
      antworten(null);
    }

    zeigeAussage();
    // Läuft die Zeit ab, ist man raus
    return zuSpaet;
  }
};
