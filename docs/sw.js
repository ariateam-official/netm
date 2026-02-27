// sw.js - سرویس ورکر پیشرفته برای GitHub Pages
const CACHE_NAME = 'mesh-chat-pwa-v1';
const DYNAMIC_CACHE = 'mesh-chat-dynamic-v1';

// تشخیص آدرس پایه در GitHub Pages
const getBasePath = () => {
    const path = self.location.pathname;
    return path.substring(0, path.lastIndexOf('/') + 1);
};

const BASE_PATH = getBasePath();
console.log('📍 سرویس ورکر - BASE_PATH:', BASE_PATH);

// فایل‌های مورد نیاز برای کش
const STATIC_ASSETS = [
    `${BASE_PATH}`,
    `${BASE_PATH}index.html`,
    `${BASE_PATH}style.css`,
    `${BASE_PATH}app.js`,
    `${BASE_PATH}manifest.json`,
    `${BASE_PATH}libs/peerjs.min.js`,
    'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.2/peerjs.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

// نصب سرویس ورکر
self.addEventListener('install', event => {
    console.log('⚙️ سرویس ورکر در حال نصب...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 کش کردن فایل‌های استاتیک');
                return cache.addAll(STATIC_ASSETS).catch(error => {
                    console.error('❌ خطا در کش کردن:', error);
                    // ادامه می‌دهیم حتی با خطا
                });
            })
            .then(() => {
                console.log('✅ سرویس ورکر نصب شد');
                return self.skipWaiting();
            })
    );
});

// فعالسازی و پاکسازی کش‌های قدیمی
self.addEventListener('activate', event => {
    console.log('⚡ سرویس ورکر فعال شد');
    
    event.waitUntil(
        Promise.all([
            // پاکسازی کش‌های قدیمی
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
                            console.log('🗑️ حذف کش قدیمی:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // کنترل همه کلاینت‌ها
            self.clients.claim()
        ]).then(() => {
            console.log('✅ سرویس ورکر آماده است');
        })
    );
});

// استراتژی: Network First با Fallback به کش
self.addEventListener('fetch', event => {
    // درخواست‌های مربوط به PeerJS رو نادیده بگیر (برای WebRTC)
    if (event.request.url.includes('peerjs') || 
        event.request.url.includes('webrtc') ||
        event.request.url.includes('stun')) {
        return;
    }

    // برای فایل‌های HTML
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    return cacheDynamicResponse(event.request, response.clone());
                })
                .catch(() => {
                    return caches.match(`${BASE_PATH}index.html`);
                })
        );
        return;
    }

    // برای فایل‌های استاتیک (CSS, JS, تصاویر)
    if (event.request.url.match(/\.(css|js|png|jpg|jpeg|svg|ico|json)$/)) {
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return fetch(event.request)
                        .then(response => {
                            return cacheDynamicResponse(event.request, response.clone());
                        })
                        .catch(() => {
                            return new Response('آفلاین', { status: 404 });
                        });
                })
        );
        return;
    }

    // برای بقیه درخواست‌ها
    event.respondWith(
        fetch(event.request)
            .then(response => {
                return cacheDynamicResponse(event.request, response.clone());
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});

// تابع کمکی برای کش کردن پاسخ‌های پویا
async function cacheDynamicResponse(request, response) {
    if (response && response.status === 200 && response.type === 'basic') {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, response.clone());
    }
    return response;
}

// مدیریت پیام‌ها از کلاینت
self.addEventListener('message', event => {
    console.log('📨 پیام از کلاینت:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// همگام‌سازی در پس‌زمینه
self.addEventListener('sync', event => {
    if (event.tag === 'sync-messages') {
        event.waitUntil(syncMessages());
    }
});

async function syncMessages() {
    console.log('🔄 همگام‌سازی پیام‌ها...');
    // اینجا می‌تونیم پیام‌های آفلاین رو همگام کنیم
}

// پوش نوتیفیکیشن
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'پیام جدید',
        icon: `${BASE_PATH}icons/icon-192.png`,
        badge: `${BASE_PATH}icons/icon-192.png`,
        vibrate: [200, 100, 200],
        dir: 'rtl',
        lang: 'fa',
        tag: 'mesh-chat'
    };
    
    event.waitUntil(
        self.registration.showNotification('مش چت آفلاین', options)
    );
});

// کلیک روی نوتیفیکیشن
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(BASE_PATH)
    );
});

// بررسی آپدیت
self.addEventListener('updatefound', () => {
    console.log('🔄 نسخه جدید پیدا شد');
});