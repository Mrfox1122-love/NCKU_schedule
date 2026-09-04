// ============================================================
// ⚡ TimeFlow PWA Service Worker (sw.js)
// ============================================================

const CACHE_NAME = 'timeflow-cache-v3.2.7';

const STATIC_ASSETS = [
    './',
    './index.html',
    './css/tokens.css',
    './css/components.css',
    './css/style.css',
    './js/core/security.js',
    './js/core/store.js',
    './js/core/modal.js',
    './js/core/icons.js',
    './js/core/config.js',
    './js/core/data.js',
    './js/analytics/grade.js',
    './js/analytics/chart.js',
    './js/analytics/report.js',
    './js/graduation/graduation-rules.js',
    './js/graduation/rules-data/eecs.js',
    './js/graduation/rules-data/engineering.js',
    './js/graduation/rules-data/sciences.js',
    './js/graduation/rules-data/medicine.js',
    './js/graduation/rules-data/management.js',
    './js/graduation/rules-data/social-sciences.js',
    './js/graduation/rules-data/planning-design.js',
    './js/graduation/rules-data/liberal-arts.js',
    './js/graduation/rules-data/bioscience.js',
    './js/graduation/rules-data/interdisciplinary.js',
    './js/graduation/graduation.js',
    './js/graduation/graduation-ui.js',
    './js/schedule/conflict.js',
    './js/schedule/schedule.js',
    './js/schedule/schedule-export.js',
    './js/course/course.js',
    './js/course/wishlist.js',
    './js/app.js',
    './manifest.webmanifest',
    // 🌟 本機化函式庫（原本為 CDN 網址）
    './js/libs/chart.min.js',
    './js/libs/html2canvas.min.js'
];

// 安裝事件：下載並快取靜態資源
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// 啟用事件：清理舊版快取
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// 攔截請求：Stale-While-Revalidate 策略（優先使用快取，背景更新）
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                // 背景向網路發送請求更新快取
                fetch(event.request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
                    }
                }).catch(() => {});
                return cachedResponse;
            }
            return fetch(event.request);
        })
    );
});
