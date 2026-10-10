spiele.mathe = {
  name: "Mathe",
  // Kurze Erklärung (erscheint vor der Runde und beim „i“ neben dem Spielnamen)
  beschreibung: "Rechne schnell! Tippe das Ergebnis auf dem Tastenfeld ein und drücke OK. Jede richtige Aufgabe gibt 50 Punkte.",
  fragenProRunde: 3,
  // Zeit pro Aufgabe: 15 Sekunden, wenn in der Lobby 30 oder weniger eingestellt ist, sonst 20
  festeZeit: function (lobbyZeit) {
    return lobbyZeit <= 30 ? 15 : 20;
  },

  // Die Aufgaben werden ausgedacht, nicht aus der Tabelle gelesen
  erzeugeFragen: function () {
    function zufall(von, bis) {
      return von + Math.floor(Math.random() * (bis - von + 1));
    }
    const aufgaben = [];
    // Je 60 Aufgaben für "casual" und "schwer" (Plus, Minus, Mal, Geteilt im Wechsel)
    ["casual", "schwer"].forEach(function (stufe) {
      const schwer = stufe === "schwer";
      for (let i = 0; i < 60; i++) {
        const art = i % 4;
        let a, b, text, ergebnis;
        if (art === 0) {
          a = schwer ? zufall(120, 999) : zufall(12, 99);
          b = schwer ? zufall(120, 999) : zufall(12, 99);
          text = a + " + " + b; ergebnis = a + b;
        } else if (art === 1) {
          a = schwer ? zufall(200, 999) : zufall(20, 99);
          b = zufall(schwer ? 50 : 5, a - 1);
          text = a + " − " + b; ergebnis = a - b;
        } else if (art === 2) {
          a = schwer ? zufall(12, 25) : zufall(2, 12);
          b = schwer ? zufall(3, 12) : zufall(2, 12);
          text = a + " × " + b; ergebnis = a * b;
        } else {
          b = schwer ? zufall(3, 12) : zufall(2, 12);
          ergebnis = schwer ? zufall(11, 25) : zufall(2, 12);
          a = b * ergebnis;
          text = a + " ÷ " + b;
        }
        aufgaben.push({ kategorie: "mathe", schwierigkeit: stufe, text: text + " = ?", ergebnis: ergebnis });
      }
    });
    return aufgaben;
  },


  // Zeigt die Aufgabe, ein Anzeigefeld und ein Zahlen-Tastenfeld
  zeige: function (frage, spielfeld, fertig) {
    spielfeld.innerHTML = "";

    const titel = document.createElement("h2");
    titel.className = "mathe-aufgabe";
    titel.textContent = frage.text;
    spielfeld.appendChild(titel);

    const anzeige = document.createElement("div");
    anzeige.className = "mathe-anzeige";
    spielfeld.appendChild(anzeige);

    let eingabe = "";
    function aktualisiere() {
      anzeige.textContent = eingabe || " ";
    }
    aktualisiere();

    function taste(zeichen) {
      if (gewertet) {
        return;
      }
      if (zeichen === "⌫") {
        eingabe = eingabe.slice(0, -1);
      } else if (zeichen === "OK") {
        werten();
        return;
      } else if (eingabe.length < 5) {
        eingabe = eingabe + zeichen;
      }
      aktualisiere();
    }

    // Tastenfeld: 1–9, dann ⌫ 0 OK
    const feld = document.createElement("div");
    feld.className = "tastenfeld";
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"].forEach(function (zeichen) {
      const knopf = document.createElement("button");
      knopf.textContent = zeichen;
      if (zeichen === "OK") {
        knopf.className = "ok";
      } else if (zeichen === "⌫") {
        knopf.className = "zweitrangig";
      }
      knopf.onclick = function () { taste(zeichen); };
      feld.appendChild(knopf);
    });
    spielfeld.appendChild(feld);

    // Am Computer kann man auch mit der normalen Tastatur tippen
    function tastatur(e) {
      if (/^[0-9]$/.test(e.key)) {
        taste(e.key);
      } else if (e.key === "Backspace") {
        taste("⌫");
      } else if (e.key === "Enter") {
        taste("OK");
      }
    }
    document.addEventListener("keydown", tastatur);

    let gewertet = false;
    function werten() {
      if (gewertet) {
        return;
      }
      gewertet = true;
      document.removeEventListener("keydown", tastatur);

      const istRichtig = eingabe !== "" && Number(eingabe) === frage.ergebnis;
      anzeige.classList.add(istRichtig ? "richtig" : "falsch");
      const box = document.createElement("div");
      box.className = "aufloesung";
      box.textContent = istRichtig ? "Richtig!" : "Richtig wäre: " + frage.ergebnis;
      feld.replaceWith(box);

      abschliessen(istRichtig ? 1 : 0, 1, fertig);
    }

    // Läuft die Zeit ab, wird das bisher Eingetippte gewertet
    return werten;
  }
};
