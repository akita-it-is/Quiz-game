// ===== Inventar: Emotes, Sprüche und Haustiere =====
// Was es alles gibt, steht in sammlung.js.

// So viele Emotes bzw. Sprüche passen ins Deck fürs Online-Spiel
const DECK_GROESSE = 4;

// Hat der Spieler diesen Eintrag schon? (gilt auch für Outfit-Teile)
function besitzt(eintrag) {
  const f = eintrag.freischaltung;
  if (!f || f === "start") {
    return true;
  }
  if (profil.besitz.includes(eintrag.id)) {
    return true; // gekauft oder aus dem Battlepass
  }
  if (f.startsWith("erfolg:")) {
    return Boolean(profil.erfolge[f.slice(7)]);
  }
  return false;
}

// Text, wie man einen gesperrten Eintrag bekommt
function freischaltungText(eintrag) {
  const f = eintrag.freischaltung;
  if (f.startsWith("erfolg:")) {
    const erfolg = ERFOLGE.find(function (e) { return e.id === f.slice(7); });
    return "Erfolg: " + (erfolg ? erfolg.text : f.slice(7));
  }
  if (f === "shop") {
    return "Im Shop: " + eintrag.preis + " $";
  }
  if (f === "battlepass") {
    return "Battlepass Level " + BATTLEPASS.level;
  }
  return f;
}

// Zeigt das Bild: Emoji als Text, eigene Bilder als <img>
function emoteBild(emote) {
  if (emote.bild.includes("/") || emote.bild.includes(".")) {
    const img = document.createElement("img");
    img.src = emote.bild;
    img.alt = emote.name;
    return img;
  }
  return document.createTextNode(emote.bild);
}

// Ist der Eintrag gerade ausgerüstet? (Emotes/Sprüche: im Deck, Haustier: das eine aktive)
function istAusgeruestetEintrag(art, id) {
  return art === "haustier" ? profil.haustier === id : profil.deck[art].includes(id);
}

// Ausrüsten bzw. ablegen
function wechsleAusruestung(art, id) {
  const hinweisFeld = document.getElementById("sammlung-hinweis");
  if (art === "haustier") {
    profil.haustier = profil.haustier === id ? null : id;
  } else {
    const deck = profil.deck[art];
    if (deck.includes(id)) {
      deck.splice(deck.indexOf(id), 1);
    } else if (deck.length >= DECK_GROESSE) {
      hinweisFeld.textContent = "Dein Deck ist voll – tippe erst ein ausgerüstetes an, um es abzulegen.";
      return;
    } else {
      deck.push(id);
    }
  }
  speichereProfil();
  zeigeSammlung(art);
}

// Zeigt Emotes ("emote"), Sprüche ("spruch") oder Haustiere ("haustier") als Sammlung
function zeigeSammlung(art) {
  const eintraege = { emote: EMOTES, spruch: SPRUECHE, haustier: HAUSTIERE }[art];
  document.getElementById("sammlung-titel").textContent =
    { emote: "Emotes", spruch: "Sprüche", haustier: "Haustiere" }[art];
  document.getElementById("sammlung-hinweis").textContent = art === "haustier"
    ? "Tippe zum Ausrüsten – dein Haustier begleitet dich überall."
    : "Dein Deck: " + profil.deck[art].length + " / " + DECK_GROESSE +
      " – diese kannst du im Online-Spiel benutzen (kommt bald).";

  const liste = document.getElementById("sammlung-liste");
  liste.innerHTML = "";
  liste.className = "sammlung-liste " + (art === "spruch" ? "spruch-liste" : "emote-gitter");

  eintraege.forEach(function (eintrag) {
    const hatEs = besitzt(eintrag);
    const istAusgeruestet = istAusgeruestetEintrag(art, eintrag.id);

    const knopf = document.createElement("button");
    knopf.className = "sammel-karte seltenheit-" + eintrag.seltenheit +
      (hatEs ? "" : " gesperrt") + (istAusgeruestet ? " ausgeruestet" : "");

    if (art !== "spruch") {
      const bild = document.createElement("div");
      bild.className = "sammel-bild";
      bild.appendChild(emoteBild(eintrag));
      knopf.appendChild(bild);
    }
    const name = document.createElement("div");
    name.className = "sammel-name";
    name.textContent = (hatEs ? "" : "🔒 ") + (eintrag.name || eintrag.text) + (istAusgeruestet ? " ✓" : "");
    knopf.appendChild(name);

    const unten = document.createElement("small");
    unten.textContent = hatEs ? eintrag.seltenheit : freischaltungText(eintrag);
    knopf.appendChild(unten);

    knopf.onclick = function () {
      if (!hatEs) {
        return;
      }
      // Nochmal antippen legt es wieder ab
      wechsleAusruestung(art, eintrag.id);
    };
    liste.appendChild(knopf);
  });
  zeigeBildschirm("sammlung");
}
