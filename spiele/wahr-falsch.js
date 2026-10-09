spiele.wahrFalsch = {
  name: "Wahr oder Falsch",
  // CSV-Link des Tabellenblatts "wahr-falsch" (gleicher Link wie bei Multiple Choice, nur andere gid)
  // Steht hier "", wird diese Spielart einfach übersprungen.
  fragenQuelle: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR8OYp4uAniqpn3dj2qzpyahA2Rg59EVSV1kLrskYtLjICQOwfTqm34D3A5aMVUbIo6bJUKCznYyieT/pub?gid=1479838760&single=true&output=csv",

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
