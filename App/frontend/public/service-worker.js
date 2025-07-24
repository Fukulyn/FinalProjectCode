const CACHE_NAME = 'pet-health-cache-v2';
const STATIC_ASSETS = [
    '/manifest.json',
    '/Gemini_Generated_Image_192.png',
    '/Gemini_Generated_Image_512.png',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
            );
        })
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    // index.html 採用 network first
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, response.clone());
                        return response;
                    });
                })
                .catch(() => caches.match(request))
        );
        return;
    }
    // 其他靜態資源 cache first
    event.respondWith(
        caches.match(request).then(response => {
            return response || fetch(request);
        })
    );
});

// FCM 推播事件處理
self.addEventListener('push', function (event) {
    let data = {};
    if (event.data) {
        data = event.data.json();
    }
    const title = data.notification?.title || '新通知';
    const options = {
        body: data.notification?.body || '',
        icon: data.notification?.icon || '/Gemini_Generated_Image_192.png',
        data: data.notification?.click_action ? { url: data.notification.click_action } : {},
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

// 點擊通知時導向對應網址
self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    const url = event.notification.data && event.notification.data.url;
    if (url) {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
                for (let client of windowClients) {
                    if (client.url === url && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
        );
    }
}); 