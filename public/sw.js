self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {title:'New DM', body:'You have a new message'};
  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {url: '/'}
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
