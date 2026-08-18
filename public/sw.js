self.addEventListener('push',event=>{
 const data=event.data?event.data.json():{};
 event.waitUntil(self.registration.showNotification(data.title||'Neighborly KC',{body:data.body||'You have a new message.',icon:'/icon-192.png',badge:'/favicon-64.png',tag:data.tag||'neighborlykc-message',data:{url:data.url||'/dms'}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=new URL(event.notification.data?.url||'/dms',self.location.origin).href;
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const client of list){if('focus' in client){client.navigate(target);return client.focus();}}return clients.openWindow(target);}));
});
