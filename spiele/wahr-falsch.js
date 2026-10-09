spiele.wahrFalsch = {
  name: "Wahr oder Falsch",
  // Hier den CSV-Link des Tabellenblatts "wahr-falsch" eintragen.
  // Solange hier "" steht, wird diese Spielart einfach übersprungen.
  fragenQuelle: "",

  // Wandelt eine Tabellenzeile in eine Frage um
  // Spalten im Blatt: id, kategorie, text, richtig (richtig = wahr oder falsch)
  zeileZuFrage: function (zeile) {
    const richtig = String(zeile.richtig).trim().toLowerCase();
    return {
      id: zeile.id,
      kategorie: zeile.kategorie,
      text: zeile.text,
      istWahr: richtig === "wahr"
    };
  },

  // Zeigt die Aussage mit zwei Knöpfen an und meldet die Punkte zurück
  zeige: function (frage, spielfeld, fertig) {
    spielfeld.innerHTML = "";

    const titel = document.createElement("h2");
    titel.textContent = frage.text;
    spielfeld.appendChild(titel);

    [true, false].forEach(function (wert) {
      const knopf = document.createElement("button");
      knopf.textContent = wert ? "Wahr" : "Falsch";
      knopf.onclick = function () {
        fertig(wert === frage.istWahr ? 1 : 0);
      };
      spielfeld.appendChild(knopf);
    });
  }
};
