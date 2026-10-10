spiele.multipleChoice = {
  name: "Multiple Choice",
  // Kurze Erklärung (erscheint vor der Runde und beim „i“ neben dem Spielnamen)
  beschreibung: "Wähle aus vier Antworten die richtige aus. Jede richtige Antwort gibt 50 Punkte.",
  fragenProRunde: 5,
  // Name der Tabelle in Supabase, aus der die Fragen kommen
  tabelle: "multiple_choice",

  // Wandelt eine Tabellenzeile in eine Frage um
  zeileZuFrage: function (zeile) {
    const antworten = [zeile.antwort1, zeile.antwort2, zeile.antwort3, zeile.antwort4]
      .filter(function (a) { return a; });
    return {
      id: zeile.id,
      kategorie: zeile.kategorie,
      text: zeile.text,
      antworten: antworten,
      richtig: Number(zeile.richtig) - 1
    };
  },

  // Zeigt die Frage an und meldet die Punkte zurück
  zeige: function (frage, spielfeld, fertig) {
    spielfeld.innerHTML = "";

    const titel = document.createElement("h2");
    titel.textContent = frage.text;
    spielfeld.appendChild(titel);

    frage.antworten.forEach(function (antwort, nummer) {
      const knopf = document.createElement("button");
      knopf.textContent = antwort;
      // Den richtigen Knopf markieren, damit er nach der Antwort grün wird
      if (nummer === frage.richtig) {
        knopf.dataset.richtig = "ja";
      }
      knopf.onclick = function () {
        auswerten(knopf, fertig);
      };
      spielfeld.appendChild(knopf);
    });
  }
};