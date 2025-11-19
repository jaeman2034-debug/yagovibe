/**
 * Step 67: 오프라인 쓰기 큐잉 유틸
 * 네트워크 오류 시 자동으로 큐에 저장하고, 온라인 복귀 시 자동 동기화
 */

export interface QueueOp {
    id?: number;
    url: string;
    method: string;
    headers: { [key: string]: string };
    body?: string;
    timestamp?: number;
}

/**
 * IndexedDB 열기
 */
async function openDB(): Promise<IDBDatabase> {
    return new Promise((res, rej) => {
        const r = indexedDB.open('yago-vibe', 3);
        
        r.onupgradeneeded = (e) => {
            const db = r.result;
            
            // opsQueue 스토어
            if (!db.objectStoreNames.contains('opsQueue')) {
                db.createObjectStore('opsQueue', {
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
 * 오프라인 작업 큐에 추가
 */
export async function enqueueOp(op: Omit<QueueOp, 'id' | 'timestamp'>): Promise<void> {
    const db = await openDB();
    const tx = db.transaction('opsQueue', 'readwrite');
    
    await tx.store.add({
        ...op,
        timestamp: Date.now(),
    });
    
    await tx.done;
    db.close();
    
    // Background Sync 등록 (Service Worker 지원 시)
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
            const reg = await navigator.serviceWorker.ready;
            await (reg as any).sync.register('sync-ops');
        } catch (error) {
            console.warn('Background Sync 등록 실패:', error);
        }
    }
}

/**
 * 큐에 있는 작업 조회
 */
export async function getQueuedOps(): Promise<QueueOp[]> {
    try {
        const db = await openDB();
        if (!db.objectStoreNames.contains('opsQueue')) {
            console.warn('opsQueue 스토어가 없습니다.');
            db.close();
            return [];
        }
        const tx = db.transaction('opsQueue', 'readonly');
        const store = tx.objectStore('opsQueue');
        if (!store) {
            console.warn('opsQueue 스토어를 열 수 없습니다.');
            db.close();
            return [];
        }
        const all = await store.getAll();
        await tx.done;
        db.close();
        return all || [];
    } catch (error) {
        console.error('큐 조회 오류:', error);
        return [];
    }
}

/**
 * 큐에서 작업 제거
 */
export async function dequeueOp(id: number): Promise<void> {
    const db = await openDB();
    const tx = db.transaction('opsQueue', 'readwrite');
    await tx.store.delete(id);
    await tx.done;
    db.close();
}

/**
 * 큐 비우기
 */
export async function clearQueue(): Promise<void> {
    const db = await openDB();
    const tx = db.transaction('opsQueue', 'readwrite');
    await tx.store.clear();
    await tx.done;
    db.close();
}

/**
 * 오프라인 보호된 fetch (네트워크 실패 시 자동 큐잉)
 */
export async function offlineFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    try {
        const r = await fetch(url, options);
        
        if (!r.ok) {
            throw new Error(`HTTP ${r.status}`);
        }
        
        return r;
    } catch (error) {
        console.warn('네트워크 오류, 큐에 추가:', error);
        
        // 오프라인 큐에 추가
        await enqueueOp({
            url,
            method: options.method || 'GET',
            headers: (options.headers as { [key: string]: string }) || {},
            body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
        });
        
        // 오프라인 응답 반환 (선택)
        throw new Error('offline_queued');
    }
}

/**
 * 수동 동기화 (큐에 있는 작업 재시도)
 */
export async function syncQueue(): Promise<{ success: number; failed: number }> {
    const ops = await getQueuedOps();
    let success = 0;
    let failed = 0;
    
    for (const op of ops) {
        try {
            const response = await fetch(op.url, {
                method: op.method,
                headers: op.headers,
                body: op.body,
            });
            
            if (response.ok) {
                await dequeueOp(op.id!);
                success++;
            } else {
                failed++;
            }
        } catch (error) {
            console.error('동기화 실패:', op.url, error);
            failed++;
        }
    }
    
    return { success, failed };
}

