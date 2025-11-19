/**
 * Step 67: 오프라인 데이터 스키마 및 헬퍼 함수
 * IndexedDB를 사용한 오프라인 스토리지
 */

export interface OfflineReport {
    id: string;
    title: string;
    html: string;
    ts: number;
    data?: any;
}

export interface OfflineAudio {
    id: string;
    blobUrl: string;
    duration: number;
    ts: number;
    url?: string;
}

/**
 * IndexedDB 열기
 */
async function openDB(): Promise<IDBDatabase> {
    return new Promise((res, rej) => {
        const r = indexedDB.open('yago-vibe', 3);
        
        r.onupgradeneeded = (e) => {
            const db = r.result;
            
            if (!db.objectStoreNames.contains('reports')) {
                db.createObjectStore('reports', {
                    keyPath: 'id',
                });
            }
            
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
 * 리포트 오프라인 저장
 */
export async function saveReportOffline(report: OfflineReport): Promise<void> {
    const db = await openDB();
    const tx = db.transaction('reports', 'readwrite');
    await tx.store.put({
        ...report,
        ts: report.ts || Date.now(),
    });
    await tx.done;
    db.close();
}

/**
 * 오프라인 리포트 조회
 */
export async function loadReportsOffline(): Promise<OfflineReport[]> {
    const db = await openDB();
    const tx = db.transaction('reports', 'readonly');
    const all = await tx.store.getAll();
    await tx.done;
    db.close();
    return all;
}

/**
 * 특정 리포트 조회
 */
export async function getReportOffline(id: string): Promise<OfflineReport | undefined> {
    const db = await openDB();
    const tx = db.transaction('reports', 'readonly');
    const report = await tx.store.get(id);
    await tx.done;
    db.close();
    return report;
}

/**
 * 리포트 삭제
 */
export async function deleteReportOffline(id: string): Promise<void> {
    const db = await openDB();
    const tx = db.transaction('reports', 'readwrite');
    await tx.store.delete(id);
    await tx.done;
    db.close();
}

/**
 * 오디오 오프라인 저장
 */
export async function saveAudioOffline(audio: OfflineAudio): Promise<void> {
    const db = await openDB();
    const tx = db.transaction('audio', 'readwrite');
    await tx.store.put({
        ...audio,
        ts: audio.ts || Date.now(),
    });
    await tx.done;
    db.close();
}

/**
 * 오프라인 오디오 조회
 */
export async function loadAudioOffline(): Promise<OfflineAudio[]> {
    const db = await openDB();
    const tx = db.transaction('audio', 'readonly');
    const all = await tx.store.getAll();
    await tx.done;
    db.close();
    return all;
}

/**
 * 특정 오디오 조회
 */
export async function getAudioOffline(id: string): Promise<OfflineAudio | undefined> {
    const db = await openDB();
    const tx = db.transaction('audio', 'readonly');
    const audio = await tx.store.get(id);
    await tx.done;
    db.close();
    return audio;
}

/**
 * 오디오 삭제
 */
export async function deleteAudioOffline(id: string): Promise<void> {
    const db = await openDB();
    const tx = db.transaction('audio', 'readwrite');
    await tx.store.delete(id);
    await tx.done;
    db.close();
}

/**
 * 오프라인 스토리지 크기 추정 (MB)
 */
export async function estimateStorageSize(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return (estimate.usage || 0) / (1024 * 1024); // MB
    }
    return 0;
}

/**
 * 오프라인 스토리지 정리 (오래된 항목 삭제)
 */
export async function cleanupOfflineStorage(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const db = await openDB();
    const now = Date.now();
    
    // Reports 정리
    const reportsTx = db.transaction('reports', 'readwrite');
    const reports = await reportsTx.store.getAll();
    for (const report of reports) {
        if (now - report.ts > maxAge) {
            await reportsTx.store.delete(report.id);
        }
    }
    await reportsTx.done;
    
    // Audio 정리
    const audioTx = db.transaction('audio', 'readwrite');
    const audio = await audioTx.store.getAll();
    for (const a of audio) {
        if (now - a.ts > maxAge) {
            await audioTx.store.delete(a.id);
        }
    }
    await audioTx.done;
    
    db.close();
}

