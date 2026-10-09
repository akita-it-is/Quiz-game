// ===== Wirtschaft: Spielgeld ($), Erfahrung (XP), Battlepass und Shop =====
// Achtung: Solange alles im Browser gespeichert wird, kann man hier schummeln.
// Sicher wird es erst, wenn Supabase das Geld verwaltet.

// Belohnung pro Spiel
const BELOHNUNG = {
  dollarProSpiel: 5,      // fürs Mitspielen
  dollarProRichtig: 1,    // pro richtiger Antwort
  xpProFrage: 10,         // pro beantworteter Frage
  xpProRichtig: 10        // zusätzlich pro richtiger Antwort
};

// Battlepass (Platzhalter-Werte)
const BATTLEPASS = {
  level: 50,          // so viele Level gibt es
  xpProLevel: 100,    // so viele XP braucht man pro Level
  preis: 1000         // Premium kostet so viele $
};

// Was gibt es auf welchem Level? Platzhalter: überall 1 $, Premium Level 50 = Skin
function battlepassBelohnung(level, leiste) {
  if (leiste === "premium" && level === BATTLEPASS.level) {
    return { item: "koenig", text: "👑 Königs-Skin" };
  }
  return { dollar: 1, text: "1 $" };
}

// Aktuelles Battlepass-Level aus den XP
function battlepassLevel() {
  return Math.min(BATTLEPASS.level, Math.floor(profil.xp / BATTLEPASS.xpProLevel));
}

// Zeigt das Spielgeld oben auf der Startseite
function zeigeDollar() {
  document.querySelectorAll(".dollar-anzeige").forEach(function (feld) {
    feld.textContent = "💰 " + profil.dollar + " $";
  });
}

// Wird am Spielende aufgerufen: $ und XP gutschreiben, Text zurückgeben
function spielBelohnung(verlauf) {
  const richtige = verlauf.filter(function (v) { return v.punkte > 0; }).length;
  const dollar = BELOHNUNG.dollarProSpiel + richtige * BELOHNUNG.dollarProRichtig;
  const xp = verlauf.length * BELOHNUNG.xpProFrage + richtige * BELOHNUNG.xpProRichtig;

  const levelVorher = battlepassLevel();
  profil.dollar = profil.dollar + dollar;
  profil.xp = profil.xp + xp;
  speichereProfil();

  let text = "+" + dollar + " $   ·   +" + xp + " XP";
  if (battlepassLevel() > levelVorher) {
    text = text + "\n⬆️ Battlepass-Level " + battlepassLevel() + " erreicht!";
  }
  return text;
}

// ===== Battlepass-Bildschirm =====

function zeigeBattlepass() {
  const level = battlepassLevel();
  const bp = profil.battlepass;
  zeigeDollar();

  // Fortschritt zum nächsten Level
  document.getElementById("bp-level").textContent = "Level " + level + " / " + BATTLEPASS.level;
  const imLevel = level >= BATTLEPASS.level ? BATTLEPASS.xpProLevel : profil.xp % BATTLEPASS.xpProLevel;
  document.getElementById("bp-balken").style.width = (imLevel / BATTLEPASS.xpProLevel * 100) + "%";
  document.getElementById("bp-xp").textContent = imLevel + " / " + BATTLEPASS.xpProLevel + " XP";

  // Premium kaufen
  const kaufen = document.getElementById("knopf-bp-kaufen");
  kaufen.hidden = bp.premium;
  kaufen.textContent = "Premium freischalten – " + BATTLEPASS.preis + " $";
  kaufen.disabled = profil.dollar < BATTLEPASS.preis;
  document.getElementById("bp-hinweis").textContent = bp.premium
    ? "⭐ Premium ist aktiv"
    : (profil.dollar < BATTLEPASS.preis ? "Dir fehlen noch " + (BATTLEPASS.preis - profil.dollar) + " $." : "");

  // "Alle abholen" nur zeigen, wenn es etwas abzuholen gibt
  document.getElementById("knopf-bp-alle").hidden = offeneBelohnungen().length === 0;

  // Alle Level: links Gratis, rechts Premium
  const liste = document.getElementById("bp-liste");
  liste.innerHTML = "";
  for (let l = 1; l <= BATTLEPASS.level; l++) {
    const zeile = document.createElement("div");
    zeile.className = "bp-zeile" + (l <= level ? " erreicht" : "");
    const nummer = document.createElement("div");
    nummer.className = "bp-nummer";
    nummer.textContent = l;
    zeile.appendChild(nummer);
    zeile.appendChild(bpFeld(l, "gratis", level));
    zeile.appendChild(bpFeld(l, "premium", level));
    liste.appendChild(zeile);
  }
  zeigeBildschirm("battlepass");
}

// Ein Feld im Battlepass: gesperrt, abholbar oder schon abgeholt
function bpFeld(level, leiste, aktuellesLevel) {
  const belohnung = battlepassBelohnung(level, leiste);
  const abgeholt = profil.battlepass.abgeholt[leiste].includes(level);
  const erreichbar = level <= aktuellesLevel && (leiste === "gratis" || profil.battlepass.premium);

  const feld = document.createElement("button");
  feld.className = "bp-feld " + leiste;
  if (abgeholt) {
    feld.textContent = "✓ " + belohnung.text;
    feld.classList.add("abgeholt");
    feld.disabled = true;
  } else if (erreichbar) {
    feld.textContent = "🎁 " + belohnung.text + " abholen";
    feld.classList.add("abholbar");
    feld.onclick = function () { holeBelohnung(level, leiste); };
  } else {
    feld.textContent = (leiste === "premium" && !profil.battlepass.premium ? "🔒 " : "") + belohnung.text;
    feld.disabled = true;
  }
  return feld;
}

// Alle Belohnungen, die man schon erreicht, aber noch nicht abgeholt hat
function offeneBelohnungen() {
  const offen = [];
  for (let l = 1; l <= battlepassLevel(); l++) {
    ["gratis", "premium"].forEach(function (leiste) {
      const erlaubt = leiste === "gratis" || profil.battlepass.premium;
      if (erlaubt && !profil.battlepass.abgeholt[leiste].includes(l)) {
        offen.push({ level: l, leiste: leiste });
      }
    });
  }
  return offen;
}

function holeAlleBelohnungen() {
  offeneBelohnungen().forEach(function (o) { holeBelohnung(o.level, o.leiste, true); });
  speichereProfil();
  zeigeBattlepass();
}

// "still" = nicht nach jeder einzelnen Belohnung neu zeichnen (bei "Alle abholen")
function holeBelohnung(level, leiste, still) {
  const belohnung = battlepassBelohnung(level, leiste);
  if (belohnung.dollar) {
    profil.dollar = profil.dollar + belohnung.dollar;
  }
  if (belohnung.item && !profil.besitz.includes(belohnung.item)) {
    profil.besitz.push(belohnung.item);
  }
  profil.battlepass.abgeholt[leiste].push(level);
  if (!still) {
    speichereProfil();
    zeigeBattlepass();
  }
}

function kaufeBattlepass() {
  if (profil.battlepass.premium || profil.dollar < BATTLEPASS.preis) {
    return;
  }
  if (!confirm("Premium-Battlepass für " + BATTLEPASS.preis + " $ freischalten?")) {
    return;
  }
  profil.dollar = profil.dollar - BATTLEPASS.preis;
  profil.battlepass.premium = true;
  speichereProfil();
  zeigeBattlepass();
}

// ===== Shop =====
// Zeigt alles mit "freischaltung: shop" und Preis – nach Bereichen sortiert.
// Antippen öffnet ein Fenster mit Infos und dem Kaufen-Knopf.

function shopBereiche() {
  // Skins nur für Charaktere, die man hat (oder Skins, die zu allen passen)
  const meineSkins = SKINS.filter(function (skin) {
    return skin.charakter === "alle" || profil.besitz.includes(skin.charakter);
  });
  return [
    { titel: "🎭 Charaktere", eintraege: CHARAKTERE.map(function (c) {
      return { eintrag: c, art: "Charakter", name: c.name, bildHtml: charakterBild(c.id, null) };
    }) },
    { titel: "✨ Skins für deine Charaktere", eintraege: meineSkins.map(function (skin) {
      const fuer = skin.charakter === "alle" ? profil.charakter : skin.charakter;
      const c = findeCharakter(fuer);
      return { eintrag: skin, art: "Skin", name: skin.name + (c ? " – " + c.name : ""),
        bildHtml: charakterBild(fuer, skin.id) };
    }) },
    { titel: "😄 Emotes", eintraege: EMOTES.map(function (e) {
      return { eintrag: e, art: "Emote", name: e.name, bild: e.bild };
    }) },
    { titel: "💬 Sprüche", eintraege: SPRUECHE.map(function (sp) {
      return { eintrag: sp, art: "Spruch", name: sp.text, bild: "💬" };
    }) },
    { titel: "🐾 Haustiere", eintraege: HAUSTIERE.map(function (h) {
      return { eintrag: h, art: "Haustier", name: h.name, bild: h.bild };
    }) }
  ].map(function (bereich) {
    bereich.eintraege = bereich.eintraege.filter(function (a) {
      return a.eintrag.freischaltung === "shop" && a.eintrag.preis;
    });
    return bereich;
  }).filter(function (bereich) { return bereich.eintraege.length > 0; });
}

// Bild eines Angebots als Element
function angebotsBild(angebot) {
  const bild = document.createElement("div");
  if (angebot.bildHtml) {
    bild.className = "karten-bild";
    bild.innerHTML = angebot.bildHtml;
  } else {
    bild.className = "sammel-bild";
    bild.appendChild(emoteBild({ bild: angebot.bild, name: angebot.name }));
  }
  return bild;
}

function zeigeShop() {
  zeigeDollar();
  const box = document.getElementById("shop-liste");
  box.innerHTML = "";
  shopBereiche().forEach(function (bereich) {
    const titel = document.createElement("h3");
    titel.textContent = bereich.titel;
    const gitter = document.createElement("div");
    gitter.className = "emote-gitter";
    bereich.eintraege.forEach(function (angebot) {
      const e = angebot.eintrag;
      const gekauft = besitzt(e);
      const karte = document.createElement("button");
      karte.className = "sammel-karte shop-karte seltenheit-" + e.seltenheit + (gekauft ? " gekauft" : "");
      karte.appendChild(angebotsBild(angebot));
      const name = document.createElement("div");
      name.className = "sammel-name";
      name.textContent = angebot.name;
      const preis = document.createElement("small");
      preis.textContent = gekauft ? "✓ Gekauft" : e.preis + " $";
      karte.appendChild(name);
      karte.appendChild(preis);
      karte.onclick = function () { zeigeShopDetail(angebot); };
      gitter.appendChild(karte);
    });
    box.appendChild(titel);
    box.appendChild(gitter);
  });
  zeigeBildschirm("shop");
}

// Fenster mit großem Bild, Infos, Text und Kaufen-Knopf
function zeigeShopDetail(angebot) {
  const e = angebot.eintrag;
  const box = document.createElement("div");
  box.className = "shop-detail";
  const bild = angebotsBild(angebot);
  bild.classList.add("detail-bild");
  box.appendChild(bild);

  const infos = document.createElement("p");
  infos.className = "hinweis";
  if (angebot.art === "Charakter") {
    infos.textContent = e.tier + " · Spezialgebiet: " + kategorieText(e.kategorie);
  } else {
    infos.textContent = angebot.art + " · " + e.seltenheit;
  }
  box.appendChild(infos);
  if (e.text && angebot.art === "Charakter") {
    const text = document.createElement("p");
    text.className = "detail-text";
    text.textContent = e.text;
    box.appendChild(text);
  }

  const knopf = document.createElement("button");
  if (besitzt(e)) {
    knopf.textContent = "✓ Schon in deinem Inventar";
    knopf.disabled = true;
  } else if (profil.dollar < e.preis) {
    knopf.textContent = e.preis + " $ – dir fehlen " + (e.preis - profil.dollar) + " $";
    knopf.disabled = true;
  } else {
    knopf.textContent = "Kaufen für " + e.preis + " $";
    knopf.onclick = function () { kaufe(e, angebot.name); };
  }
  box.appendChild(knopf);
  zeigeFenster(angebot.name, box);
}

function kaufe(eintrag, name) {
  if (profil.dollar < eintrag.preis || besitzt(eintrag)) {
    return;
  }
  profil.dollar = profil.dollar - eintrag.preis;
  profil.besitz.push(eintrag.id);
  speichereProfil();
  zeigeFenster("🎉 Gekauft!", name + " gehört jetzt dir. Du findest es in deinem Inventar.");
  zeigeShop();
}
