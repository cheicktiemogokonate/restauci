self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { message: event.data ? event.data.text() : "" };
  }

  const title = payload.titre || "Toutci";
  const options = {
    body: payload.message || "Vous avez une nouvelle notification.",
    icon: payload.icon || "/web-app-manifest-192x192.png",
    badge: payload.badge || "/web-app-manifest-192x192.png",
    data: {
      url: payload.url || "/restaurateur/notifications",
      ...(payload.data || {}),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(
    event.notification.data?.url || "/restaurateur/notifications",
    self.location.origin,
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url === targetUrl);
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    }),
  );
});
