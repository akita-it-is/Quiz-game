// ===== Inventar: Emotes und Sprüche (provisorisch) =====
// Später kommen hier Dinge aus dem Shop dazu.
const EMOTES = ["👋 Winken", "😂 Lachen", "🎉 Jubeln", "😎 Cool", "🤔 Grübeln", "😭 Weinen"];
const SPRUECHE = ["Zu leicht!", "Glück gehabt …", "GG!", "Das wusste ich!", "Nächstes Mal!", "Ich bin der König der Tafelrunde!"];

// Zeigt Emotes ("emote") oder Sprüche ("spruch") an. Antippen rüstet aus.
function zeigeSammlung(art) {
  const eintraege = art === "emote" ? EMOTES : SPRUECHE;
  document.getElementById("sammlung-titel").textContent = art === "emote" ? "Emotes" : "Sprüche";

  const liste = document.getElementById("sammlung-liste");
  liste.innerHTML = "";
  eintraege.forEach(function (eintrag) {
    const knopf = document.createElement("button");
    knopf.className = "zweitrangig";
    const istAusgeruestet = profil.ausgeruestet[art] === eintrag;
    knopf.textContent = eintrag + (istAusgeruestet ? "  ✓" : "");
    if (istAusgeruestet) {
      knopf.classList.add("ausgeruestet");
    }
    knopf.onclick = function () {
      // Nochmal antippen legt es wieder ab
      profil.ausgeruestet[art] = istAusgeruestet ? null : eintrag;
      speichereProfil();
      zeigeSammlung(art);
    };
    liste.appendChild(knopf);
  });
  zeigeBildschirm("sammlung");
}
