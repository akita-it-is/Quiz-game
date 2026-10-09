// Erstellt einen zufälligen Lobby-Code wie "K7QX2" (ohne leicht verwechselbare Zeichen wie 0/O oder 1/I)
function neuerLobbyCode() {
  const zeichen = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code = code + zeichen[Math.floor(Math.random() * zeichen.length)];
  }
  return code;
}

// Öffnet den Einstellungs-Bildschirm und lädt die Kategorien aus der Tabelle
async function oeffneEinstellungen() {
  zeigeBildschirm("einstellungen");
  document.getElementById("lobby-code").textContent = neuerLobbyCode();

  const box = document.getElementById("kategorien");
  box.textContent = "Kategorien werden geladen …";

  // Alle Kategorien aus allen Spielarten sammeln
  const kategorien = new Set();
  for (const spiel of aktiveSpiele()) {
    const fragen = await ladeFragen(spiel);
    fragen.forEach(function (f) { kategorien.add(f.kategorie); });
  }

  // Für jede Kategorie ein Kästchen (am Anfang alle angehakt)
  box.innerHTML = "";
  Array.from(kategorien).sort().forEach(function (kategorie) {
    const label = document.createElement("label");
    label.className = "auswahl";
    const kaestchen = document.createElement("input");
    kaestchen.type = "checkbox";
    kaestchen.value = kategorie;
    kaestchen.checked = true;
    label.appendChild(kaestchen);
    // Ersten Buchstaben groß schreiben: "anime" wird zu "Anime"
    label.appendChild(document.createTextNode(" " + kategorie.charAt(0).toUpperCase() + kategorie.slice(1)));
    box.appendChild(label);
  });
}

// Liest aus, was auf dem Einstellungs-Bildschirm gewählt ist
function leseEinstellungen() {
  const kategorien = Array.from(document.querySelectorAll("#kategorien input:checked"))
    .map(function (k) { return k.value; });
  return {
    modus: document.querySelector("input[name='modus']:checked").value,
    anzahl: Number(document.getElementById("anzahl").value),
    kategorien: kategorien
  };
}

// Schieberegler: Zahl daneben sofort anpassen
document.getElementById("anzahl").oninput = function () {
  document.getElementById("anzahl-anzeige").textContent = this.value;
};
