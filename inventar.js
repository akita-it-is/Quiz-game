// ===== Inventar: Emotes und Sprüche =====
// Was es alles gibt, steht in sammlung.js.

// Hat der Spieler diesen Eintrag schon?
function besitzt(eintrag) {
  const f = eintrag.freischaltung;
  if (f === "start") {
    return true;
  }
  if (f.startsWith("erfolg:")) {
    return Boolean(profil.erfolge[f.slice(7)]);
  }
  return false; // "shop" usw.: kommt später
}

// Text, wie man einen gesperrten Eintrag bekommt
function freischaltungText(eintrag) {
  const f = eintrag.freischaltung;
  if (f.startsWith("erfolg:")) {
    const erfolg = ERFOLGE.find(function (e) { return e.id === f.slice(7); });
    return "Erfolg: " + (erfolg ? erfolg.text : f.slice(7));
  }
  if (f === "shop") {
    return "Bald im Shop";
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

// Zeigt Emotes ("emote") oder Sprüche ("spruch") als Sammlung. Antippen rüstet aus.
function zeigeSammlung(art) {
  const eintraege = art === "emote" ? EMOTES : SPRUECHE;
  document.getElementById("sammlung-titel").textContent = art === "emote" ? "Emotes" : "Sprüche";

  const liste = document.getElementById("sammlung-liste");
  liste.innerHTML = "";
  liste.className = "sammlung-liste " + (art === "emote" ? "emote-gitter" : "spruch-liste");

  eintraege.forEach(function (eintrag) {
    const hatEs = besitzt(eintrag);
    const istAusgeruestet = profil.ausgeruestet[art] === eintrag.id;

    const knopf = document.createElement("button");
    knopf.className = "sammel-karte seltenheit-" + eintrag.seltenheit +
      (hatEs ? "" : " gesperrt") + (istAusgeruestet ? " ausgeruestet" : "");

    if (art === "emote") {
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
      profil.ausgeruestet[art] = istAusgeruestet ? null : eintrag.id;
      speichereProfil();
      zeigeSammlung(art);
    };
    liste.appendChild(knopf);
  });
  zeigeBildschirm("sammlung");
}
