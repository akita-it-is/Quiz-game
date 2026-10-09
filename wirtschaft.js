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
    return { item: "bp-ruestung", text: "👑 Goldene Rüstung" };
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
// Zeigt alles, was in sammlung.js oder bei den Outfits "freischaltung: shop" und einen Preis hat.

function shopAngebote() {
  const angebote = [];
  EMOTES.forEach(function (e) { angebote.push({ eintrag: e, art: "Emote", bild: e.bild, name: e.name }); });
  SPRUECHE.forEach(function (s) { angebote.push({ eintrag: s, art: "Spruch", bild: "💬", name: s.text }); });
  HAUSTIERE.forEach(function (h) { angebote.push({ eintrag: h, art: "Haustier", bild: h.bild, name: h.name }); });
  Object.keys(FIGUR_TEILE).forEach(function (teil) {
    FIGUR_TEILE[teil].auswahl.forEach(function (o) {
      angebote.push({ eintrag: o, art: "Outfit", bild: "👕", name: o.name });
    });
  });
  return angebote.filter(function (a) { return a.eintrag.freischaltung === "shop" && a.eintrag.preis; });
}

function zeigeShop() {
  zeigeDollar();
  const liste = document.getElementById("shop-liste");
  liste.innerHTML = "";
  shopAngebote().forEach(function (angebot) {
    const e = angebot.eintrag;
    const karte = document.createElement("div");
    karte.className = "sammel-karte shop-karte seltenheit-" + e.seltenheit;

    const bild = document.createElement("div");
    bild.className = "sammel-bild";
    bild.appendChild(emoteBild({ bild: angebot.bild, name: angebot.name }));
    const name = document.createElement("div");
    name.className = "sammel-name";
    name.textContent = angebot.name;
    const art = document.createElement("small");
    art.textContent = angebot.art + " · " + e.seltenheit;

    const knopf = document.createElement("button");
    if (besitzt(e)) {
      knopf.textContent = "✓ Gekauft";
      knopf.disabled = true;
    } else {
      knopf.textContent = e.preis + " $";
      knopf.disabled = profil.dollar < e.preis;
      knopf.onclick = function () { kaufe(e, angebot.name); };
    }

    karte.appendChild(bild);
    karte.appendChild(name);
    karte.appendChild(art);
    karte.appendChild(knopf);
    liste.appendChild(karte);
  });
  zeigeBildschirm("shop");
}

function kaufe(eintrag, name) {
  if (profil.dollar < eintrag.preis || !confirm(name + " für " + eintrag.preis + " $ kaufen?")) {
    return;
  }
  profil.dollar = profil.dollar - eintrag.preis;
  profil.besitz.push(eintrag.id);
  speichereProfil();
  zeigeShop();
}
