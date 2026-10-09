// ===== Ton, Musik und Vibration (provisorisch) =====
// Alle Töne werden im Browser erzeugt (keine Sounddateien nötig).
// Später können hier eigene Sounds und echte Musik eingebaut werden.

// Einstellungen gelten für das Gerät (auch schon vor der Anmeldung)
const tonEinstellungen = (function () {
  const standard = { ton: true, musik: true, vibration: true };
  try {
    return Object.assign(standard, JSON.parse(localStorage.getItem("quiz-ton") || "{}"));
  } catch (e) {
    return standard;
  }
})();

function speichereTonEinstellungen() {
  try {
    localStorage.setItem("quiz-ton", JSON.stringify(tonEinstellungen));
  } catch (e) {
    // nicht schlimm
  }
}

// Browser erlauben Ton erst nach dem ersten Antippen – deshalb wird er erst dann gestartet
let audio = null;
function audioBereit() {
  if (!audio) {
    const AudioKlasse = window.AudioContext || window.webkitAudioContext;
    if (!AudioKlasse) {
      return null;
    }
    audio = new AudioKlasse();
  }
  if (audio.state === "suspended") {
    audio.resume();
  }
  return audio;
}

// Spielt einen kurzen Ton: Höhe (Hz), Dauer (Sekunden), Lautstärke, Klangform, Startverzögerung
function ton(hoehe, dauer, lautstaerke, form, verzoegerung) {
  const a = audioBereit();
  if (!a) {
    return;
  }
  const start = a.currentTime + (verzoegerung || 0);
  const osz = a.createOscillator();
  const laut = a.createGain();
  osz.type = form || "sine";
  osz.frequency.value = hoehe;
  laut.gain.setValueAtTime(lautstaerke, start);
  laut.gain.exponentialRampToValueAtTime(0.0001, start + dauer);
  osz.connect(laut).connect(a.destination);
  osz.start(start);
  osz.stop(start + dauer);
}

// ===== Geräusche =====

function klickTon() {
  if (tonEinstellungen.ton) {
    ton(900, 0.05, 0.08, "square");
  }
}

function richtigTon() {
  if (tonEinstellungen.ton) {
    ton(660, 0.12, 0.15, "triangle");
    ton(990, 0.2, 0.15, "triangle", 0.1);
  }
  vibriere(40);
}

function falschTon() {
  if (tonEinstellungen.ton) {
    ton(180, 0.3, 0.15, "sawtooth");
  }
  vibriere([70, 50, 70]);
}

// Vibration (geht auf Android, nicht auf iPhone)
function vibriere(muster) {
  if (tonEinstellungen.vibration && navigator.vibrate) {
    navigator.vibrate(muster);
  }
}

// Bei jedem Antippen eines Knopfs ein leises Klicken
document.addEventListener("click", function (e) {
  if (e.target.closest("button")) {
    klickTon();
  }
  starteMusikFallsAn();
});

// ===== Hintergrundmusik (einfache Melodie-Schleife) =====

// Akkorde, die nacheinander leise als Arpeggio gespielt werden
const MUSIK_AKKORDE = [
  [262, 330, 392, 494],   // C
  [220, 262, 330, 392],   // a
  [175, 220, 262, 330],   // F
  [196, 247, 294, 349]    // G
];
let musikTimer = null;
let musikSchritt = 0;

function starteMusikFallsAn() {
  if (tonEinstellungen.musik && !musikTimer && audioBereit() && !document.hidden) {
    musikTimer = setInterval(function () {
      const akkord = MUSIK_AKKORDE[Math.floor(musikSchritt / 8) % MUSIK_AKKORDE.length];
      ton(akkord[musikSchritt % 4], 0.5, 0.025, "triangle");
      musikSchritt = musikSchritt + 1;
    }, 300);
  }
}

function stoppeMusik() {
  clearInterval(musikTimer);
  musikTimer = null;
}

// Musik anhalten, wenn die Seite im Hintergrund ist
document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    stoppeMusik();
  } else {
    starteMusikFallsAn();
  }
});

// ===== Schalter für die Einstellungen =====
// Baut die drei Schalter. Wird im Spiel (⚙ oben rechts) und in den Profil-Einstellungen benutzt.
function baueTonSchalter() {
  const box = document.createElement("div");
  [
    { schluessel: "ton", text: "🔊 Ton & Klickgeräusche" },
    { schluessel: "musik", text: "🎵 Hintergrundmusik" },
    { schluessel: "vibration", text: "📳 Vibration" }
  ].forEach(function (eintrag) {
    const label = document.createElement("label");
    label.className = "schalter-zeile";
    const text = document.createElement("span");
    text.textContent = eintrag.text;
    const schalter = document.createElement("input");
    schalter.type = "checkbox";
    schalter.className = "schalter";
    schalter.checked = tonEinstellungen[eintrag.schluessel];
    schalter.onchange = function () {
      tonEinstellungen[eintrag.schluessel] = schalter.checked;
      speichereTonEinstellungen();
      if (eintrag.schluessel === "musik") {
        if (schalter.checked) {
          starteMusikFallsAn();
        } else {
          stoppeMusik();
        }
      }
      if (eintrag.schluessel === "vibration" && schalter.checked) {
        vibriere(60); // kurz zeigen, wie es sich anfühlt
      }
    };
    label.appendChild(text);
    label.appendChild(schalter);
    box.appendChild(label);
  });
  return box;
}
