spiele.schaetzfrage = {
  name: "Schätzfrage",
  // Kurze Erklärung (erscheint vor der Runde und beim „i“ neben dem Spielnamen)
  beschreibung: "Tippe eine Zahl ein, die möglichst nah an der richtigen Antwort liegt. Genau richtig: 3 Punkte, bis 10 % daneben: 2, bis 25 % daneben: 1.",
  fragenProRunde: 3,
  // CSV-Link des Tabellenblatts "schaetzfrage" (gleicher Link wie bei Multiple Choice, nur andere gid)
  // Steht hier "", wird diese Spielart einfach übersprungen.
  fragenQuelle: "",

  // Wandelt eine Tabellenzeile in eine Frage um
  // Spalten im Blatt: id, kategorie, text, antwort (eine Zahl), einheit (optional, z. B. "Meter"), info
  zeileZuFrage: function (zeile) {
    return {
      id: zeile.id,
      kategorie: zeile.kategorie,
      text: zeile.text,
      antwort: leseZahl(zeile.antwort),
      einheit: String(zeile.einheit || "").trim()
    };
  },

  // Zeigt die Frage mit einem Zahlen-Eingabefeld an
  zeige: function (frage, spielfeld, fertig) {
    spielfeld.innerHTML = "";

    const titel = document.createElement("h2");
    titel.textContent = frage.text;
    spielfeld.appendChild(titel);

    const reihe = document.createElement("div");
    reihe.className = "reihe schaetz-reihe";
    const eingabe = document.createElement("input");
    eingabe.type = "text";
    // inputmode "decimal" öffnet auf Handy und Tablet die Zahlen-Tastatur
    eingabe.inputMode = "decimal";
    eingabe.placeholder = "Deine Schätzung";
    eingabe.className = "schaetz-eingabe";
    reihe.appendChild(eingabe);
    if (frage.einheit) {
      const einheit = document.createElement("span");
      einheit.className = "einheit";
      einheit.textContent = frage.einheit;
      reihe.appendChild(einheit);
    }
    spielfeld.appendChild(reihe);

    const knopf = document.createElement("button");
    knopf.textContent = "Bestätigen";
    spielfeld.appendChild(knopf);

    let gewertet = false;
    function werten() {
      if (gewertet) {
        return;
      }
      gewertet = true;
      const schaetzung = leseZahl(eingabe.value);
      const punkte = spiele.schaetzfrage.punkteFuer(schaetzung, frage.antwort);

      // Eingabefeld einfärben und Auflösung anzeigen
      eingabe.classList.add(punkte === 3 ? "richtig" : punkte > 0 ? "teilweise" : "falsch");
      const box = document.createElement("div");
      box.className = "aufloesung";
      let text = "Richtige Antwort: " + zahlText(frage.antwort) + " " + frage.einheit;
      if (isNaN(schaetzung)) {
        text = text + "\nKeine Schätzung abgegeben.";
      } else {
        text = text + "\nDeine Schätzung: " + zahlText(schaetzung) + " " + frage.einheit +
          " (" + abweichungText(schaetzung, frage.antwort) + ")";
      }
      box.textContent = text + "\n+" + punkte + " Punkte";
      knopf.replaceWith(box);

      abschliessen(punkte, 3, fertig);
    }

    knopf.onclick = werten;
    // Enter/OK auf der Tastatur bestätigt auch
    eingabe.onkeydown = function (e) {
      if (e.key === "Enter") {
        werten();
      }
    };
    setTimeout(function () { eingabe.focus(); }, 350);

    // Wenn die Zeit abläuft, wird das bisher Eingetippte gewertet
    return werten;
  },

  // Punkte allein: genau richtig = 3, höchstens 10 % daneben = 2, höchstens 25 % daneben = 1
  // (Online bekommt später der Nächste die meisten Punkte: bei 4 Spielern 4, 3, 2, 1.)
  punkteFuer: function (schaetzung, antwort) {
    if (isNaN(schaetzung)) {
      return 0;
    }
    if (schaetzung === antwort) {
      return 3;
    }
    const abweichung = Math.abs(schaetzung - antwort) / Math.abs(antwort || 1);
    if (abweichung <= 0.10) {
      return 2;
    }
    if (abweichung <= 0.25) {
      return 1;
    }
    return 0;
  }
};

// Zeigt, wie weit die Schätzung daneben lag, z. B. "7 % daneben"
function abweichungText(schaetzung, antwort) {
  if (schaetzung === antwort) {
    return "genau richtig!";
  }
  const prozent = Math.round(Math.abs(schaetzung - antwort) / Math.abs(antwort || 1) * 100);
  return prozent + " % daneben";
}
