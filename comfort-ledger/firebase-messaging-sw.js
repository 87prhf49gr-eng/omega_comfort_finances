importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "FIREBASE_API_KEY",
  authDomain: "FIREBASE_AUTH_DOMAIN",
  projectId: "FIREBASE_PROJECT_ID",
  messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID",
  appId: "FIREBASE_APP_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(({ notification }) => {
  self.registration.showNotification(notification?.title || "Comfort Ledger", {
    body: notification?.body || "Tienes un recordatorio pendiente.",
    icon: "/pwa-icons/icon-192.png",
    badge: "/pwa-icons/icon-192.png",
    data: { url: "/COMFORT-LEDGER-abrir-aqui.html" }
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/COMFORT-LEDGER-abrir-aqui.html"));
});
