// ===== Als App installierbar (PWA) =====

// Service Worker anmelden (sorgt fürs Installieren und den Offline-Start)
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {
      // Nicht schlimm – die Seite funktioniert auch ohne
    });
  });
}

// Chrome/Android bietet die Installation an: Wir merken uns das Angebot
// und zeigen auf der Startseite den Knopf "App installieren".
let installAngebot = null;

window.addEventListener("beforeinstallprompt", function (e) {
  e.preventDefault();
  installAngebot = e;
  document.getElementById("knopf-installieren").hidden = false;
});

document.getElementById("knopf-installieren").onclick = function () {
  if (!installAngebot) {
    return;
  }
  installAngebot.prompt();
  installAngebot.userChoice.finally(function () {
    installAngebot = null;
    document.getElementById("knopf-installieren").hidden = true;
  });
};

// Nach dem Installieren den Knopf verstecken
window.addEventListener("appinstalled", function () {
  document.getElementById("knopf-installieren").hidden = true;
});
