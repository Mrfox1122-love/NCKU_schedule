// ============================================================
// ⚡ TimeFlow PWA Service Worker (sw.js)
// ============================================================

const CACHE_NAME = 'timeflow-cache-v3.6.4';

const STATIC_ASSETS = [
    './',
    './index.html',
    './css/tokens.css',
    './css/components.css',
    './css/style.css',
    './js/core/security.js',
    './js/core/actions.js',
    './js/core/boot.js',
    './js/core/inline-styles.js',
    './js/core/sw-register.js',
    './js/core/store.js',
    './js/core/modal.js',
    './js/core/a11y.js',
    './js/core/notify.js',
    './js/core/icons.js',
    './js/core/config.js',
    './js/core/data.js',
    './js/analytics/grade.js',
    './js/analytics/chart.js',
    './js/analytics/report.js',
    './js/analytics/report-xlsx.js',
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
    './js/graduation/master/master-rules.js',
    './js/graduation/master/rules-data/liberal-arts.js',
    './js/graduation/master/rules-data/sciences.js',
    './js/graduation/master/rules-data/bioscience.js',
    './js/graduation/master/rules-data/engineering.js',
    './js/graduation/master/rules-data/eecs.js',
    './js/graduation/master/rules-data/planning-design.js',
    './js/graduation/master/rules-data/management.js',
    './js/graduation/master/rules-data/medicine.js',
    './js/graduation/master/rules-data/social-sciences.js',
    './js/graduation/master/rules-data/computing.js',
    './js/graduation/master/rules-data/semiconductor.js',
    './js/graduation/master/rules-data/university.js',
    './js/graduation/master/master-engine.js',
    './js/graduation/master/master-ui.js',
    './js/schedule/conflict.js',
    './js/schedule/schedule.js',
    './js/schedule/schedule-export.js',
    './js/course/course.js',
    './js/course/wishlist.js',
    './js/course/wishlist-compare.js',
    './js/course/enroll-sim.js',
    './js/course/prerequisite-rules.js',
    './js/course/prerequisite.js',
    './js/discover/discover.js',
    './js/discover/quick-find.js',
    './js/graduation/planning-assist.js',
    './js/graduation/ge-recommend.js',
    './js/graduation/what-if.js',
    './js/graduation/prereq-map.js',
    './js/graduation/course-map.js',
    './js/graduation/required-courses.js',
    './js/graduation/required-courses/eecs.js',
    './js/graduation/required-courses/engineering.js',
    './js/graduation/required-courses/sciences.js',
    './js/graduation/required-courses/liberal-arts.js',
    './js/graduation/required-courses/social-sciences.js',
    './js/graduation/required-courses/management.js',
    './js/graduation/required-courses/planning-design.js',
    './js/graduation/required-courses/bioscience.js',
    './js/graduation/required-courses/medicine.js',
    './js/graduation/program-check.js',
    './js/app.js',
    './manifest.webmanifest',
    // 🌟 本機化函式庫（原本為 CDN 網址）
    './js/libs/chart.min.js',
    './js/libs/html2canvas.min.js'
];

// 課程資料庫（合計約 6 MB）不在安裝時預先快取：
// 使用者第一次開啟「找課」時才會下載，之後存入快取供離線使用。
// 這兩個檔案只會隨版本更新（CACHE_NAME 改變時整批重建），所以優先讀快取、不在背景重抓。
const LAZY_DATA_PATHS = ['/js/discover/catalog-data.js', '/js/discover/history-data.js'];

function isLazyData(request) {
    try {
        const url = new URL(request.url);
        return url.origin === self.location.origin && LAZY_DATA_PATHS.some(p => url.pathname.endsWith(p));
    } catch (e) {
        return false;
    }
}

// 安裝事件：下載並快取靜態資源
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // cache: 'reload' 略過瀏覽器 HTTP 快取，確保新版快取放的是新檔案
            return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
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
    if (event.request.method !== 'GET') return;

    if (isLazyData(event.request)) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache =>
                cache.match(event.request).then(cached => {
                    if (cached) return cached;
                    return fetch(event.request).then(response => {
                        if (response && response.status === 200) cache.put(event.request, response.clone());
                        return response;
                    });
                })
            )
        );
        return;
    }

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