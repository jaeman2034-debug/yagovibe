# Step 67: Edge Acceleration & Offline-First

전 세계 사용자에게 낮은 지연과 끊김 없는 사용성을 제공하기 위해 엣지 캐싱/리라이트, 오프라인 동작(읽기/쓰기), 백그라운드 동기화를 구현합니다.

## 📋 목표

1. Service Worker 기반 PWA 오프라인 지원
2. Edge 캐싱 및 지역 라우팅
3. 오프라인 쓰기 큐잉 및 자동 동기화
4. IndexedDB 오프라인 스토리지

## 🏗️ 전체 아키텍처

```
[Client PWA]
 ├─ Service Worker: precache + runtime cache + BG Sync + Push
 ├─ IndexedDB: reports / audio / opsQueue
 └─ Network Policy: SWR, cacheFirst, stale-while-revalidate

[Edge Layer]
 ├─ CDN/Workers: HTML edge cache(초단기), API cache key 정규화, 이미지 최적화
 ├─ Rewrites: /api/* → region router(us-central1, asia-northeast3)
 └─ Signed-URL for audio/pdf

[Origin]
 ├─ Functions v2: 최소 인스턴스 + 지역 복수 배포
 ├─ Firestore/Neo4j: read replica/region aware
 └─ Storage: immutable artifacts (/pdf, /audio)
```

## ⚙️ 구현

### 1. Service Worker (PWA)

**파일**: `public/sw.js`

**구현된 기능**:
- ✅ HTML: Stale-While-Revalidate
- ✅ API: stale-while-revalidate with 10s soft TTL
- ✅ 정적/이미지: cache-first
- ✅ Background Sync: 오프라인 쓰기 큐
- ✅ Push 알림 처리
- ✅ IndexedDB 헬퍼

**캐싱 전략**:
- HTML: `swr()` - 캐시 먼저 반환, 백그라운드에서 갱신
- API: `swr()` with 10s TTL - 10초 이내 캐시 반환, 이후 네트워크 요청
- 정적 파일: `cacheFirst()` - 캐시 우선

### 2. 오프라인 쓰기 큐잉

**파일**: `src/lib/offlineQueue.ts`

**구현된 기능**:
- ✅ `enqueueOp()`: 오프라인 작업 큐에 추가
- ✅ `getQueuedOps()`: 큐에 있는 작업 조회
- ✅ `dequeueOp()`: 큐에서 작업 제거
- ✅ `offlineFetch()`: 오프라인 보호된 fetch
- ✅ `syncQueue()`: 수동 동기화

**사용 예**:
```typescript
import { offlineFetch } from '@/lib/offlineQueue';

try {
    const r = await offlineFetch('/api/ops', {
        method: 'POST',
        body: JSON.stringify(data),
    });
} catch (error) {
    // 자동으로 큐에 추가됨
    console.log('오프라인 큐에 저장됨');
}
```

### 3. 오프라인 데이터 스토리지

**파일**: `src/lib/offlineStorage.ts`

**구현된 기능**:
- ✅ `saveReportOffline()`: 리포트 오프라인 저장
- ✅ `loadReportsOffline()`: 오프라인 리포트 조회
- ✅ `saveAudioOffline()`: 오디오 오프라인 저장
- ✅ `loadAudioOffline()`: 오프라인 오디오 조회
- ✅ `cleanupOfflineStorage()`: 오래된 항목 정리

**IndexedDB 스키마**:
- `reports`: { id, title, html, ts, data }
- `audio`: { id, blobUrl, duration, ts, url }
- `opsQueue`: { id, url, method, headers, body, timestamp }

### 4. Edge 캐싱 헤더

**파일**: `functions/src/step67.edgeCache.ts`

**구현된 기능**:
- ✅ `setCacheHeaders()`: 캐시 헤더 설정
- ✅ `getRegionEndpoint()`: 지역 라우팅 헬퍼

**캐시 전략**:
- HTML: `max-age=30, s-maxage=300` (30초 브라우저, 5분 CDN)
- API: `max-age=5, s-maxage=5, stale-while-revalidate=30`
- 정적 파일: `max-age=86400` (1일)
- 불변 아티팩트: `max-age=31536000, immutable` (1년)

### 5. Offline Indicator

**파일**: `src/components/OfflineIndicator.tsx`

**구현된 기능**:
- ✅ 오프라인 상태 감지
- ✅ 큐에 있는 작업 수 표시
- ✅ 수동 동기화 버튼
- ✅ 온라인 복귀 시 자동 동기화

### 6. Service Worker 등록

**파일**: `src/main.tsx`

**구현된 기능**:
- ✅ 페이지 로드 시 Service Worker 등록
- ✅ 등록 성공/실패 로깅

### 7. PWA Manifest

**파일**: `public/manifest.json`

**구현된 기능**:
- ✅ PWA 기본 설정
- ✅ 아이콘 및 테마 색상
- ✅ `index.html`에 manifest 링크 추가

## 🔧 사용 방법

### 1. 오프라인 보호된 API 호출

```typescript
import { offlineFetch } from '@/lib/offlineQueue';

const response = await offlineFetch('/api/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
});
```

### 2. 오프라인 리포트 저장/조회

```typescript
import { saveReportOffline, loadReportsOffline } from '@/lib/offlineStorage';

// 저장
await saveReportOffline({
    id: 'report-1',
    title: 'Report Title',
    html: '<div>...</div>',
    ts: Date.now(),
});

// 조회
const reports = await loadReportsOffline();
```

### 3. Functions에서 캐시 헤더 설정

```typescript
import { setCacheHeaders } from './step67.edgeCache';

export const myFunction = onRequest(async (req, res) => {
    setCacheHeaders(res, 'api'); // 또는 'html', 'static', 'immutable'
    res.json({ data: '...' });
});
```

## 📊 테스트 시나리오

### 1. 비행기 모드에서 보고서 생성

1. 비행기 모드 활성화
2. 보고서 생성 요청
3. 오프라인 큐에 저장 확인
4. 온라인 복귀
5. 자동 동기화 확인

### 2. 이미지 캐시 적중

1. 첫 방문에서 이미지 로드
2. 오프라인 모드로 전환
3. 이미지가 캐시에서 렌더링되는지 확인

### 3. HTML SWR

1. 새 배포 후 첫 화면 접속
2. 캐시된 HTML 먼저 표시
3. 백그라운드에서 최신 버전 갱신 확인

### 4. 지역 라우팅

1. KR/US IP로 API 호출
2. 지연 시간 비교 (p95 개선 확인)

## 🚀 배포 절차

### 1. Service Worker 등록 확인

```bash
# 개발 서버 실행 후
# 브라우저 DevTools → Application → Service Workers에서 확인
```

### 2. PWA 설치 테스트

```
Chrome DevTools → Application → Manifest
"Add to homescreen" 테스트
```

### 3. Functions 배포

```bash
firebase deploy --only functions
```

### 4. 다지역 배포 (선택)

```bash
# asia-northeast3
firebase deploy --only functions --project yago-vibe-asia

# us-central1
firebase deploy --only functions --project yago-vibe-us
```

## 📚 다음 단계

- Step 68: 이미지 최적화 (Cloudflare Workers)
- Step 69: Push 알림 구현
- Step 70: Background Fetch (대용량 파일 사전 다운로드)

