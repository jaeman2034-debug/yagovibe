/**
 * Step 67: Service Worker - PWA 오프라인 지원
 * Edge Acceleration & Offline-First
 */

const VERSION = 'v67-1';
const RUNTIME_HTML = /\.(html|htm)$/i;

/**
 * Stale-While-Revalidate 전략
 */
async function swr(req) {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req);
    
    const fetchP = fetch(req)
        .then((r) => {
            cache.put(req, r.clone());
            return r;
        })
        .catch(() => cached);
    
    return cached || fetchP;
}

/**
 * Cache-First 전략
 */
async function cacheFirst(req) {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req);
    
    if (cached) {
        return cached;
    }
    
    const r = await fetch(req);
    cache.put(req, r.clone());
    return r;
}

/**
 * Network-First 전략
 */
async function networkFirst(req) {
    const cache = await caches.open(VERSION);
    
    try {
        const r = await fetch(req);
        cache.put(req, r.clone());
        return r;
    } catch (e) {
        const cached = await cache.match(req);
        if (cached) {
            return cached;
        }
        throw e;
    }
}

/**
 * Fetch 이벤트 리스너
 */
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    
    // HTML: Stale-While-Revalidate
    if (e.request.mode === 'navigate' || RUNTIME_HTML.test(url.pathname)) {
        e.respondWith(swr(e.request));
        return;
    }
    
    // API: stale-while-revalidate with 10s soft TTL
    if (url.pathname.startsWith('/api/') || url.pathname.includes('/functions/')) {
        e.respondWith(
            (async () => {
                const cache = await caches.open(VERSION);
                const cached = await cache.match(e.request);
                
                const netP = fetch(e.request)
                    .then((r) => {
                        cache.put(e.request, r.clone());
                        return r;
                    })
                    .catch(() => {});
                
                if (cached) {
                    // soft TTL 검사 (10초)
                    const cachedTime = cached.headers.get('sw-cached-time');
                    const now = Date.now();
                    
                    if (cachedTime && now - parseInt(cachedTime) < 10000) {
                        // 캐시가 10초 이내면 캐시 반환, 백그라운드에서 갱신
                        netP.catch(() => {});
                        return cached;
                    }
                    
                    // 캐시가 오래되었으면 네트워크 요청, 실패 시 캐시 반환
                    return netP.catch(() => cached);
                }
                
                return netP;
            })()
        );
        return;
    }
    
    // 정적/이미지: cache-first
    if (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff2|css|js|ico)$/i)) {
        e.respondWith(cacheFirst(e.request));
        return;
    }
    
    // 기타: network-first
    e.respondWith(networkFirst(e.request));
});

/**
 * Background Sync: 오프라인 쓰기 큐
 */
const QUEUE = 'opsQueue';

self.addEventListener('sync', (e) => {
    if (e.tag === 'sync-ops') {
        e.waitUntil(
            (async () => {
                try {
                    const db = await openDB();
                    const tx = db.transaction(QUEUE, 'readwrite');
                    const all = await tx.store.getAll();
                    
                    for (const op of all) {
                        try {
                            await fetch(op.url, {
                                method: op.method,
                                headers: op.headers,
                                body: op.body,
                            });
                            
                            await tx.store.delete(op.id);
                        } catch (err) {
                            console.error('Background sync 실패:', err);
                            // 재시도는 다음 sync
                        }
                    }
                    
                    await tx.done;
                    db.close();
                } catch (error) {
                    console.error('Background sync 오류:', error);
                }
            })()
        );
    }
});

/**
 * Push 알림 처리
 */
self.addEventListener('push', (e) => {
    const data = e.data ? e.data.json() : {};
    
    const options = {
        body: data.body || '새 알림이 있습니다.',
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        data: data.url || '/',
    };
    
    e.waitUntil(self.registration.showNotification(data.title || 'YAGO VIBE', options));
});

/**
 * 알림 클릭 처리
 */
self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                return clientList[0].focus();
            }
            return clients.openWindow(e.notification.data);
        })
    );
});

/**
 * IndexedDB 헬퍼
 */
function openDB() {
    return new Promise((res, rej) => {
        const r = indexedDB.open('yago-vibe', 3);
        
        r.onupgradeneeded = (e) => {
            const db = r.result;
            
            // opsQueue 스토어
            if (!db.objectStoreNames.contains(QUEUE)) {
                db.createObjectStore(QUEUE, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
            }
            
            // reports 스토어
            if (!db.objectStoreNames.contains('reports')) {
                db.createObjectStore('reports', {
                    keyPath: 'id',
                });
            }
            
            // audio 스토어
            if (!db.objectStoreNames.contains('audio')) {
                db.createObjectStore('audio', {
                    keyPath: 'id',
                });
            }
        };
        
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
    });
}

/**
 * 설치 이벤트: 프리캐시
 */
self.addEventListener('install', (e) => {
    console.log('Service Worker 설치 중...');
    e.waitUntil(
        caches.open(VERSION).then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                // 추가 프리캐시 리소스
            ]);
        })
    );
    self.skipWaiting();
});

/**
 * 활성화 이벤트: 오래된 캐시 정리
 */
self.addEventListener('activate', (e) => {
    console.log('Service Worker 활성화 중...');
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== VERSION) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

