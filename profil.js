// ===== Profil: Name, Charakter, Statistik =====
// Das Profil liegt online in Supabase (siehe konto.js). Auf dem Gerät liegt eine Kopie.

// Liest die Kopie vom Gerät (oder null, wenn es noch keine gibt)
function ladeProfil() {
  try {
    const text = localStorage.getItem("quiz-profil");
    return text ? JSON.parse(text) : null;
  } catch (e) {
    return null;
  }
}

// Speichert das Profil: auf dem Gerät und online in Supabase
function speichereProfil() {
  merkeProfilAufGeraet();
  speichereOnline();
}

// Nur die Kopie auf dem Gerät aktualisieren
function merkeProfilAufGeraet() {
  try {
    localStorage.setItem("quiz-profil", JSON.stringify(profil));
  } catch (e) {
    // Speichern nicht möglich (z. B. privater Modus) – dann gilt es nur bis zum Neuladen
  }
}

// Löscht die Kopie vom Gerät (beim Abmelden und Konto-Löschen)
function loescheProfil() {
  try {
    localStorage.removeItem("quiz-profil");
  } catch (e) {
    // nichts gespeichert – nichts zu löschen
  }
  profil = null;
}

// Leeres Profil (Vorlage für fehlende Felder)
function neuesProfil() {
  return {
    name: zufallsName(),
    charakter: null,                 // id des gespielten Charakters (siehe charaktere.js)
    skins: {},                       // welcher Skin pro Charakter an ist: { erling: "erling-gold" }
    statistik: { richtigGesamt: 0, serie: 0, besteSerie: 0, spiele: 0 },
    erfolge: {},
    dollar: 0,                       // Spielgeld
    xp: 0,                           // Erfahrungspunkte für den Battlepass
    besitz: [],                      // gekaufte oder freigespielte Dinge (ids von Charakteren, Skins, …)
    deck: { emote: [], spruch: [] }, // je bis zu 4 fürs Online-Spiel
    haustier: null,                  // id des ausgerüsteten Haustiers
    battlepass: { premium: false, abgeholt: { gratis: [], premium: [] } },
    angemeldet: false,               // mit E-Mail angemeldet (dann gibt es Hannes und Chiara geschenkt)
    spielerId: null                  // z. B. K7Q2-X9MA – darüber fügen dich Freunde hinzu (kommt von Supabase)
  };
}

// Bringt ein altes Geräte-Profil (aus der Zeit vor den Konten) auf den neuesten Stand,
// bevor es einmalig ins Online-Konto übernommen wird
function bereinigeAltesProfil(alt) {
  delete alt.figur;          // altes Figur-/Outfit-System
  delete alt.ausgeruestet;   // alte Version (nur 1 Emote/Spruch) – jetzt gibt es das Deck
  alt.skins = alt.skins || {};
  if (alt.haustier && !HAUSTIERE.some(function (h) { return h.id === alt.haustier; })) {
    alt.haustier = null;     // Haustiere sind jetzt Insekten
  }
  // "bp-ruestung" heißt jetzt "koenig" (Skin). Der Spruch "koenig" heißt jetzt "koenig-spruch".
  alt.besitz = (alt.besitz || []).map(function (id) {
    return id === "bp-ruestung" ? "koenig" : id;
  });
  return alt;
}

// Erfindet einen Namen wie "Flinker Fuchs 42" (höchstens 16 Zeichen)
function zufallsName() {
  const eigenschaften = ["Flinker", "Schlauer", "Mutiger", "Lustiger", "Wilder", "Edler", "Tapferer", "Kluger", "Listiger", "Fröhlicher"];
  const wesen = ["Fuchs", "Drache", "Ritter", "Falke", "Bär", "Wolf", "Luchs", "Panda", "Zauberer", "Greif"];
  function eins(liste) { return liste[Math.floor(Math.random() * liste.length)]; }
  let name;
  do {
    name = eins(eigenschaften) + " " + eins(wesen) + " " + (10 + Math.floor(Math.random() * 90));
  } while (name.length > 16);
  return name;
}

// Zeichnet den eigenen Charakter (mit Skin) und daneben das ausgerüstete Haustier
function zeigeFigurMitHaustier(container) {
  container.innerHTML = meinCharakterBild();
  const tier = HAUSTIERE.find(function (h) { return h.id === profil.haustier; });
  if (tier) {
    const platz = document.createElement("div");
    platz.className = "haustier";
    platz.appendChild(emoteBild(tier));
    container.appendChild(platz);
  }
}

// ===== Charakter-Bildschirm =====
// Zwei Arten:
//   "start"    – beim ersten Mal: einen Charakter aussuchen (geschenkt), Namen würfeln
//   "inventar" – eigene Charaktere wechseln und Skins anziehen

let charakterZurueckZu = "home";
let charakterAuswahl = null;   // gerade angetippter Charakter (id)

function oeffneCharakter(zurueckZu) {
  charakterZurueckZu = zurueckZu;
  // Ein Charakter, den man (als Gast) nicht spielen darf, ist nicht vorausgewählt
  charakterAuswahl = profil.charakter && darfCharakterSpielen(profil.charakter) ? profil.charakter : null;
  zeigeCharakter();
  zeigeBildschirm("charakter");
}

function zeigeCharakter() {
  const start = charakterZurueckZu !== "inventar";
  document.getElementById("charakter-name").textContent = profil.name;
  document.getElementById("knopf-neuer-name").hidden = !start;
  document.getElementById("charakter-hinweis").textContent = start
    ? (istAngemeldet()
      ? "Such dir deinen Charakter aus. Weitere gibt es im Shop."
      : "Als Gast spielst du Hannes oder Chiara. Melde dich an, dann bekommst du beide – und kannst im Shop weitere Charaktere kaufen.")
    : "Tippe einen deiner Charaktere an, um ihn zu spielen. Darunter wählst du seinen Skin.";

  // Vorschau des angetippten Charakters
  const vorschau = document.getElementById("charakter-vorschau");
  vorschau.innerHTML = "";
  const c = findeCharakter(charakterAuswahl);
  if (c) {
    const bild = document.createElement("div");
    bild.className = "figur-gross";
    if (!start && c.id === profil.charakter) {
      zeigeFigurMitHaustier(bild);
    } else {
      bild.innerHTML = charakterBild(c.id, profil.skins[c.id]);
    }
    const infos = document.createElement("div");
    infos.className = "charakter-infos";
    infos.innerHTML = "<strong></strong><small></small><p></p>";
    infos.querySelector("strong").textContent = c.name;
    infos.querySelector("small").textContent = c.tier + " · Spezialgebiet: " + kategorieText(c.kategorie);
    infos.querySelector("p").textContent = c.text;
    vorschau.appendChild(bild);
    vorschau.appendChild(infos);
  }

  // Alle Charaktere als Gitter
  const liste = document.getElementById("charakter-liste");
  liste.innerHTML = "";
  // Beim ersten Start (als Gast) gibt es nur Hund und Katze zur Auswahl
  const auswahlListe = start && !istAngemeldet()
    ? CHARAKTERE.filter(function (ch) { return GAST_CHARAKTERE.includes(ch.id); })
    : CHARAKTERE;
  auswahlListe.forEach(function (ch) {
    const hatIhn = darfCharakterSpielen(ch.id);
    const karte = document.createElement("button");
    karte.className = "charakter-karte" + (ch.id === charakterAuswahl ? " gewaehlt" : "") +
      (!start && !hatIhn ? " gesperrt" : "");
    karte.innerHTML = '<div class="karten-bild">' + charakterBild(ch.id, profil.skins[ch.id]) + '</div><small></small>';
    karte.querySelector("small").textContent = (!start && !hatIhn ? "🔒 " : "") + ch.name;
    karte.onclick = function () {
      if (!start && !hatIhn) {
        hinweis("charakter-hinweis", istAngemeldet() || !ch.preis
          ? ch.name + (ch.preis ? " gibt es im Shop für " + ch.preis + " $." : " gibt es mit der Anmeldung.")
          : "Als Gast kannst du nur Hannes oder Chiara spielen. Melde dich an, um " + ch.name + " freizuschalten.");
        return;
      }
      charakterAuswahl = ch.id;
      if (!start) {
        profil.charakter = ch.id;   // im Inventar sofort wechseln
        speichereProfil();
      }
      zeigeCharakter();
    };
    liste.appendChild(karte);
  });

  // Skins (nur im Inventar, für den aktiven Charakter)
  const skinBereich = document.getElementById("skin-bereich");
  skinBereich.hidden = start || !profil.charakter;
  if (!start && profil.charakter) {
    zeigeSkins();
  }

  const fertig = document.getElementById("knopf-charakter-fertig");
  fertig.textContent = start ? "Los geht's" : "Fertig";
  fertig.disabled = start && !charakterAuswahl;
}

// Skins des aktiven Charakters: Standard + alle passenden
function zeigeSkins() {
  const charId = profil.charakter;
  const liste = document.getElementById("skin-liste");
  liste.innerHTML = "";
  const skins = [{ id: null, name: "Standard", seltenheit: "gewöhnlich" }].concat(skinsFuer(charId));
  skins.forEach(function (skin) {
    const hatIhn = skin.id === null || besitzt(skin);
    const aktiv = (profil.skins[charId] || null) === skin.id;
    const karte = document.createElement("button");
    karte.className = "sammel-karte seltenheit-" + skin.seltenheit +
      (hatIhn ? "" : " gesperrt") + (aktiv ? " ausgeruestet" : "");
    karte.innerHTML = '<div class="karten-bild">' + charakterBild(charId, skin.id) + '</div>' +
      '<div class="sammel-name"></div><small></small>';
    karte.querySelector(".sammel-name").textContent = (hatIhn ? "" : "🔒 ") + skin.name + (aktiv ? " ✓" : "");
    karte.querySelector("small").textContent = hatIhn ? skin.seltenheit : freischaltungText(skin);
    karte.onclick = function () {
      if (!hatIhn) {
        return;
      }
      profil.skins[charId] = skin.id;
      speichereProfil();
      zeigeCharakter();
    };
    liste.appendChild(karte);
  });
}

// "Los geht's" bzw. "Fertig"
function charakterFertig() {
  if (charakterZurueckZu !== "inventar") {
    if (!charakterAuswahl) {
      return;
    }
    // Der erste Charakter ist geschenkt
    profil.charakter = charakterAuswahl;
    if (!profil.besitz.includes(charakterAuswahl)) {
      profil.besitz.push(charakterAuswahl);
    }
  }
  speichereProfil();
  if (charakterZurueckZu === "inventar") {
    zeigeBildschirm("inventar");
  } else {
    nachAnmeldung();
  }
}

// ===== Startseite und Profil =====

function zeigeHome() {
  document.getElementById("home-name").textContent = profil.name;
  document.getElementById("knopf-profilbild").innerHTML = meinCharakterBild();
  zeigeDollar();
  zeigeBildschirm("home");
}

function zeigeProfil() {
  zeigeFigurMitHaustier(document.getElementById("profil-figur"));
  document.getElementById("profil-name").textContent = profil.name;
  document.getElementById("profil-id").textContent = profil.spielerId;
  document.getElementById("profil-status").textContent = istAngemeldet()
    ? "✉️ Angemeldet mit " + ((sitzung && sitzung.user.email) || "E-Mail")
    : "👤 Du spielst als Gast";
  document.getElementById("knopf-verbinden").textContent = istAngemeldet()
    ? "🔑 Passwort festlegen / ändern" : "🔗 Account mit E-Mail verbinden";
  document.getElementById("profil-info").hidden = true;
  document.getElementById("profil-hinweis").textContent = "";
  zeigeBildschirm("profil");
}

// Text für "Profilinformationen"
function profilInfoText() {
  const s = profil.statistik;
  const geschafft = Object.keys(profil.erfolge).length;
  return "Spiele gespielt: " + s.spiele +
    "\nFragen richtig: " + s.richtigGesamt +
    "\nBeste Serie: " + s.besteSerie + " richtig hintereinander" +
    "\nErfolge: " + geschafft + " von " + ERFOLGE.length +
    "\nSpielgeld: " + profil.dollar + " $" +
    "\nBattlepass-Level: " + battlepassLevel();
}

// Das aktuelle Profil (wird nach dem Anmelden aus Supabase geladen, siehe konto.js)
let profil = null;
