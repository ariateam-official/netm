// sw.js - سرویس ورکر کاملاً بهینه برای PWA
const CACHE_NAME = 'mesh-chat-v3';
const API_CACHE_NAME = 'mesh-chat-api-v3';

// تشخیص آدرس پایه
const getBasePath = () => {
    const path = self.location.pathname;
    // حذف sw.js از آخر مسیر
    return path.substring(0, path.lastIndexOf('/') + 1);
};

const BASE_PATH = getBasePath();
const IS_GITHUB_PAGES = self.location.hostname.includes('github.io');

console.log('📍 سرویس ورکر - BASE_PATH:', BASE_PATH);
console.log('📍 محیط:', IS_GITHUB_PAGES ? 'GitHub Pages' : 'محلی');

// فایل‌های ضروری برای حالت آفلاین
const CORE_ASSETS = [
    `${BASE_PATH}`,
    `${BASE_PATH}index.html`,
    `${BASE_PATH}style.css`,
    `${BASE_PATH}app.js`,
    `${BASE_PATH}manifest.json`,
    `${BASE_PATH}libs/peerjs.min.js`
];

// منابع خارجی
const EXTERNAL_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.2/peerjs.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    'https://fonts.gstatic.com/s/inter/v12/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2'
];

// نصب سرویس ورکر - این مرحله حیاتی برای PWA
self.addEventListener('install', event => {
    console.log('📦 نصب سرویس ورکر...');
    
    // Force waiting to become active
    self.skipWaiting();
    
    event.waitUntil(
        (async () => {
            try {
                const cache = await caches.open(CACHE_NAME);
                console.log('✅ کش ایجاد شد');
                
                // کش کردن فایل‌های اصلی
                for (const asset of CORE_ASSETS) {
                    try {
                        await cache.add(asset);
                        console.log(`✅ کش شد: ${asset}`);
                    } catch (e) {
                        console.log(`⚠️ خطا در کش ${asset}:`, e);
                    }
                }
                
                // کش کردن منابع خارجی (اختیاری)
                for (const asset of EXTERNAL_ASSETS) {
                    try {
                        await cache.add(asset);
                        console.log(`✅ کش خارجی: ${asset}`);
                    } catch (e) {
                        // برای منابع خارجی خطا مهم نیست
                    }
                }
                
                console.log('🎉 نصب کامل شد');
            } catch (error) {
                console.error('❌ خطا در نصب:', error);
            }
        })()
    );
});

// فعالسازی و کنترل کلاینت‌ها
self.addEventListener('activate', event => {
    console.log('⚡ فعالسازی سرویس ورکر...');
    
    event.waitUntil(
        (async () => {
            // پاکسازی کش‌های قدیمی
            const keys = await caches.keys();
            await Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
                        console.log('🗑️ حذف کش قدیمی:', key);
                        return caches.delete(key);
                    }
                })
            );
            
            // کنترل همه کلاینت‌ها
            await self.clients.claim();
            console.log('✅ سرویس ورکر فعال و در کنترل کلاینت‌ها');
            
            // اطلاع به کلاینت‌ها
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'SW_ACTIVATED',
                    version: 'v3'
                });
            });
        })()
    );
});

// استراتژی: Cache First with Network Fallback
self.addEventListener('fetch', event => {
    // نادیده گرفتن درخواست‌های WebRTC/STUN
    if (event.request.url.includes('stun') || 
        event.request.url.includes('turn') ||
        event.request.url.includes('peerjs')) {
        return;
    }
    
    // برای درخواست‌های HTML
    if (event.request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                try {
                    // اول سعی کن از شبکه بگیر
                    const networkResponse = await fetch(event.request);
                    if (networkResponse && networkResponse.status === 200) {
                        const cache = await caches.open(CACHE_NAME);
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    }
                } catch (error) {
                    console.log('📴 آفلاین - استفاده از کش برای:', event.request.url);
                }
                
                // اگر نت‌ورک خطا داد، از کش استفاده کن
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // آخرین راهکار: صفحه اصلی از کش
                return caches.match(`${BASE_PATH}index.html`);
            })()
        );
        return;
    }
    
    // برای فایل‌های استاتیک (Cache First)
    if (event.request.url.match(/\.(css|js|json|png|jpg|jpeg|svg|ico|woff2?)$/)) {
        event.respondWith(
            (async () => {
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                try {
                    const networkResponse = await fetch(event.request);
                    if (networkResponse && networkResponse.status === 200) {
                        const cache = await caches.open(CACHE_NAME);
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                } catch (error) {
                    return new Response('', { status: 404, statusText: 'Not Found' });
                }
            })()
        );
        return;
    }
    
    // برای بقیه درخواست‌ها (Network First)
    event.respondWith(
        (async () => {
            try {
                const networkResponse = await fetch(event.request);
                if (networkResponse && networkResponse.status === 200) {
                    const cache = await caches.open(API_CACHE_NAME);
                    cache.put(event.request, networkResponse.clone());
                }
                return networkResponse;
            } catch (error) {
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                return new Response('آفلاین', { status: 503 });
            }
        })()
    );
});

// مدیریت پیام‌ها از کلاینت
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_STATUS') {
        event.ports[0].postMessage({
            status: 'active',
            cache: CACHE_NAME,
            basePath: BASE_PATH
        });
    }
});

// پشتیبانی از Background Sync
self.addEventListener('sync', event => {
    if (event.tag === 'sync-messages') {
        event.waitUntil(syncMessages());
    }
});

async function syncMessages() {
    console.log('🔄 همگام‌سازی پیام‌های آفلاین...');
    // اینجا می‌تونیم پیام‌های ذخیره شده رو ارسال کنیم
}

// پوش نوتیفیکیشن
self.addEventListener('push', event => {
    const options = {
        body: event.data?.text() || 'پیام جدید',
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
