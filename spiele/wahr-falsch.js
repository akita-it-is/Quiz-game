spiele.wahrFalsch = {
  name: "Wahr oder Falsch",
  // Kurze Erklärung (erscheint vor der Runde und beim „i“ neben dem Spielnamen)
  beschreibung: "Stimmt die Aussage oder nicht? Tippe auf „Wahr“ oder „Falsch“. Jede richtige Antwort gibt 50 Punkte.",
  fragenProRunde: 5,
  // Online: Wer zuerst richtig antwortet, bekommt die meisten Punkte (siehe mehrspieler.js)
  mehrspieler: "schnellste",
  // Name der Tabelle in Supabase, aus der die Fragen kommen
  tabelle: "wahr_falsch",

  // Wandelt eine Tabellenzeile in eine Frage um
  // Spalten in der Tabelle: id, kategorie, text, richtig (richtig = wahr oder falsch)
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
      // Den richtigen Knopf markieren, damit er nach der Antwort grün wird
      if (wert === frage.istWahr) {
        knopf.dataset.richtig = "ja";
      }
      knopf.onclick = function () {
        auswerten(knopf, fertig);
      };
      spielfeld.appendChild(knopf);
    });
  }
};
