/* Comfort Ledger PWA registration (Hito D phase 2) */
(function registerComfortLedgerPwa() {
  if (!("serviceWorker" in navigator)) return;
  var loc = window.location;
  var host = loc.hostname;
  var secure =
    loc.protocol === "https:" ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]";
  if (!secure) return;
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("comfort-ledger-sw.js", { scope: "./" })
      .catch(function (err) {
        console.warn("Comfort Ledger: service worker no registrado", err);
      });
  });
  if (navigator.serviceWorker && navigator.serviceWorker.addEventListener) {
    navigator.serviceWorker.addEventListener("message", function (ev) {
      if (ev && ev.data && ev.data.type === "push-subscription-change") {
        if (typeof window.scheduleHostedPushSync === "function") {
          window.scheduleHostedPushSync();
        }
      }
    });
  }
})();
