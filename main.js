document.getElementById("spielfeld").textContent = "main.js läuft";

let punkte = 0;
let fragenzaehler = 0;
const anzahlFragen = 5;
const fragenSpeicher = {};

// Lädt die Fragen einer Spielart aus der Tabelle (nur beim ersten Mal)
async function ladeFragen(spiel) {
  if (fragenSpeicher[spiel.name]) {
    return fragenSpeicher[spiel.name];
  }
  const antwort = await fetch(spiel.fragenQuelle);
  const text = await antwort.text();
  const tabelle = Papa.parse(text, { header: true, skipEmptyLines: true });
  const fragen = tabelle.data.map(spiel.zeileZuFrage);
  fragenSpeicher[spiel.name] = fragen;
  return fragen;
}

// Wählt Spielart und Frage und startet die Runde
async function starteRunde() {
  const alleSpiele = Object.values(spiele);
  if (alleSpiele.length === 0) {
    throw new Error("Keine Spielart angemeldet");
  }
  const spiel = alleSpiele[Math.floor(Math.random() * alleSpiele.length)];

  const fragen = await ladeFragen(spiel);
  if (fragen.length === 0) {
    throw new Error("Keine Fragen in der Tabelle für " + spiel.name + " gefunden");
  }
  const frage = fragen[Math.floor(Math.random() * fragen.length)];

  spiel.zeige(frage, document.getElementById("spielfeld"), rundeBeendet);
}

// Wird aufgerufen, wenn eine Frage beantwortet wurde
function rundeBeendet(erreichtePunkte) {
  punkte = punkte + erreichtePunkte;
  fragenzaehler = fragenzaehler + 1;
  document.getElementById("punkte").textContent = "Punkte: " + punkte;

  if (fragenzaehler >= anzahlFragen) {
    document.getElementById("spielfeld").innerHTML =
      "<h2>Fertig! Du hast " + punkte + " Punkte.</h2>";
  } else {
    starteRunde().catch(zeigeFehler);
  }
}

// Zeigt eine Fehlermeldung auf der Seite an
function zeigeFehler(fehler) {
  document.getElementById("spielfeld").textContent = "Fehler: " + fehler;
}

starteRunde().catch(zeigeFehler);