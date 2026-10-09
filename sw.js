// ===== Service Worker: macht die Seite installierbar und offline startfähig =====
// Strategie "zuerst Internet": Online gibt es immer die neueste Version.
// Ohne Internet wird die zuletzt gespeicherte Version aus dem Zwischenspeicher genommen.
//
// Wenn neue Dateien dazukommen, hier in die Liste eintragen und VERSION um 1 erhöhen.

const VERSION = 2;
const SPEICHER = "tafelrunde-v" + VERSION;

const DATEIEN = [
  "./",
  "bilder/icons/apple-touch-icon.png",
  "bilder/icons/favicon-48.png",
  "bilder/icons/icon-192.png",
  "bilder/icons/icon-512.png",
  "bilder/icons/icon-maskable-512.png",
  "bildschirme.js",
  "charaktere.js",
  "datenschutz.html",
  "einstellungen.js",
  "erfolge.js",
  "impressum.html",
  "index.html",
  "inventar.js",
  "lib/papaparse.min.js",
  "lobby.js",
  "main.js",
  "manifest.webmanifest",
  "oberflaeche.js",
  "pwa.js",
  "profil.js",
  "sammlung.js",
  "spiele/entweder-oder.js",
  "spiele/kaertchen.js",
  "spiele/mathe.js",
  "spiele/multiple-choice.js",
  "spiele/reihenfolge.js",
  "spiele/schaetzfrage.js",
  "spiele/wahr-falsch.js",
  "style.css",
  "ton.js",
  "wirtschaft.js",
];

// Beim Installieren: alle Dateien für offline speichern
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(SPEICHER).then(function (speicher) { return speicher.addAll(DATEIEN); })
  );
  self.skipWaiting();
});

// Alte Zwischenspeicher (frühere Versionen) aufräumen
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (namen) {
      return Promise.all(namen.filter(function (n) { return n !== SPEICHER; })
        .map(function (n) { return caches.delete(n); }));
    })
  );
  self.clients.claim();
});

// Jede Anfrage: erst aus dem Internet holen (und speichern), sonst aus dem Speicher
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") {
    return;
  }
  e.respondWith(
    fetch(e.request).then(function (antwort) {
      // Eigene Dateien und die Fragen aus Google Sheets für offline merken
      if (antwort.ok && (e.request.url.startsWith(self.location.origin) || e.request.url.includes("docs.google.com"))) {
        const kopie = antwort.clone();
        caches.open(SPEICHER).then(function (speicher) { speicher.put(e.request, kopie); });
      }
      return antwort;
    }).catch(function () {
      return caches.match(e.request, { ignoreSearch: e.request.mode === "navigate" });
    })
  );
});
