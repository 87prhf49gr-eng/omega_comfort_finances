import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging.js";

export async function enablePushNotifications(firebaseConfig, vapidKey) {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;
  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  if (await Notification.requestPermission() !== "granted") return null;
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  onMessage(messaging, ({ notification }) => notification && new Notification(notification.title, { body: notification.body, icon: "/pwa-icons/icon-192.png" }));
  return token;
}
