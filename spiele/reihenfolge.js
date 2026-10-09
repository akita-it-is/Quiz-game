spiele.reihenfolge = {
  name: "Richtige Reihenfolge",
  fragenProRunde: 3,
  // CSV-Link des Tabellenblatts "reihenfolge" (gleicher Link wie bei Multiple Choice, nur andere gid)
  // Steht hier "", wird diese Spielart einfach übersprungen.
  fragenQuelle: "",

  // Wandelt eine Tabellenzeile in eine Frage um
  // Spalten im Blatt: id, kategorie, text, antwort1 … antwort6, info
  // antwort1 ist Platz 1, antwort2 ist Platz 2 usw. (also schon in der richtigen Reihenfolge eintragen!)
  zeileZuFrage: function (zeile) {
    const antworten = [zeile.antwort1, zeile.antwort2, zeile.antwort3,
      zeile.antwort4, zeile.antwort5, zeile.antwort6]
      .map(function (a) { return String(a || "").trim(); })
      .filter(function (a) { return a; });
    return {
      id: zeile.id,
      kategorie: zeile.kategorie,
      text: zeile.text,
      antworten: antworten
    };
  },

  // Zeigt die Antworten durcheinander an. Man tippt sie der Reihe nach an (Platz 1 zuerst).
  zeige: function (frage, spielfeld, fertig) {
    spielfeld.innerHTML = "";

    const titel = document.createElement("h2");
    titel.textContent = frage.text;
    spielfeld.appendChild(titel);

    const hinweisText = document.createElement("p");
    hinweisText.className = "hinweis";
    hinweisText.textContent = "Tippe die Antworten der Reihe nach an – Platz 1 zuerst. Nochmal tippen nimmt sie wieder raus.";
    spielfeld.appendChild(hinweisText);

    const liste = document.createElement("div");
    spielfeld.appendChild(liste);

    const bestaetigen = document.createElement("button");
    bestaetigen.textContent = "Bestätigen";
    bestaetigen.disabled = true;

    // Reihenfolge, in der der Spieler die Antworten angetippt hat
    const auswahl = [];

    mische(frage.antworten).forEach(function (antwort) {
      const knopf = document.createElement("button");
      knopf.className = "sortier-knopf";
      const platz = document.createElement("span");
      platz.className = "platz";
      knopf.appendChild(platz);
      knopf.appendChild(document.createTextNode(antwort));
      knopf.onclick = function () {
        const stelle = auswahl.indexOf(antwort);
        if (stelle === -1) {
          auswahl.push(antwort);
        } else {
          auswahl.splice(stelle, 1);
        }
        aktualisiere();
      };
      knopf.dataset.antwort = antwort;
      liste.appendChild(knopf);
    });
    spielfeld.appendChild(bestaetigen);

    // Zeigt auf jedem Knopf die gewählte Platznummer
    function aktualisiere() {
      liste.querySelectorAll(".sortier-knopf").forEach(function (knopf) {
        const stelle = auswahl.indexOf(knopf.dataset.antwort);
        knopf.querySelector(".platz").textContent = stelle === -1 ? "" : (stelle + 1) + ".";
        knopf.classList.toggle("gewaehlt", stelle !== -1);
      });
      bestaetigen.disabled = auswahl.length < frage.antworten.length;
    }

    let gewertet = false;
    function werten() {
      if (gewertet) {
        return;
      }
      gewertet = true;
      const ergebnis = spiele.reihenfolge.punkteFuer(auswahl, frage.antworten);

      // Auflösung: die eigene Reihenfolge mit Punkten, darunter die richtige Reihenfolge
      liste.innerHTML = "";
      hinweisText.textContent = "Deine Reihenfolge:";
      auswahl.forEach(function (antwort, stelle) {
        const zeile = document.createElement("div");
        const p = ergebnis.proAntwort[stelle];
        zeile.className = "sortier-ergebnis " + (p === 2 ? "richtig" : p === 1 ? "teilweise" : "falsch");
        zeile.textContent = (stelle + 1) + ". " + antwort + "   +" + p;
        liste.appendChild(zeile);
      });
      const richtig = document.createElement("div");
      richtig.className = "aufloesung";
      richtig.textContent = "Richtige Reihenfolge:\n" + frage.antworten.map(function (a, i) {
        return (i + 1) + ". " + a;
      }).join("\n");
      bestaetigen.replaceWith(richtig);

      abschliessen(ergebnis.punkte, frage.antworten.length * 2, fertig);
    }
    bestaetigen.onclick = werten;

    // Wenn die Zeit abläuft, wird gewertet, was bis dahin einsortiert ist
    return werten;
  },

  // Punkte pro Antwort: genau der richtige Platz = 2 Punkte.
  // Sonst 1 Punkt, wenn direkt davor die Antwort steht, die auch richtig direkt davor kommt.
  punkteFuer: function (auswahl, richtig) {
    const proAntwort = auswahl.map(function (antwort, stelle) {
      const richtigerPlatz = richtig.indexOf(antwort);
      if (richtigerPlatz === stelle) {
        return 2;
      }
      if (stelle > 0 && richtig.indexOf(auswahl[stelle - 1]) === richtigerPlatz - 1) {
        return 1;
      }
      return 0;
    });
    const punkte = proAntwort.reduce(function (summe, p) { return summe + p; }, 0);
    return { punkte: punkte, proAntwort: proAntwort };
  }
};
