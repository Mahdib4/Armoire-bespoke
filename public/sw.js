// Armoire Bespoke — service worker for admin Web Push notifications.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Armoire Bespoke", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Armoire Bespoke";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/apple-icon.png",
      badge: "/icon.png",
      tag: data.tag || undefined,
      data: { url: data.url || "/admin" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
