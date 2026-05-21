# 🔥 로그 전송 흐름 테스트 가이드

## 현재 상태
- EventLog DB: **0개** (로그가 저장되지 않음)
- Summary API: `currentCtr = 0` (데이터 없음)

## 테스트 단계

### 1단계: 브라우저 콘솔 확인

1. `https://localhost:5173/sports-hub` 접속
2. F12 → Console 탭
3. 스토리 카드 확인 (자동 노출)
4. 스토리 클릭 5회

**확인할 로그:**
```
[STORY_LOG] { eventName: "story_impression", ... }
[StoryLog] 📤 전송 시도: 1개 이벤트 → /api/logs/story/bulk
[StoryLog] ✅ 전송 성공: 1개 저장됨
```

### 2단계: 네트워크 탭 확인

1. F12 → Network 탭
2. 필터: `story/bulk`
3. 스토리 클릭
4. 다음 요청 확인:

```
POST /api/logs/story/bulk
Status: 200 OK
Request Payload: [{ eventName: "story_click", ... }]
Response: { ok: true, count: 1 }
```

### 3단계: 백엔드 콘솔 확인

백엔드 서버 터미널에서:

```
[STORY_LOG_BULK] Received 1 events
[STORY_LOG_BULK] Sample event: { eventName: "story_click", region: "seoul", ... }
[STORY_LOG_BULK] ✅ Saved 1 events to DB
```

### 4단계: DB 재확인

```powershell
Invoke-WebRequest -Uri "http://localhost:3001/api/logs/debug/eventlog" | Select-Object -ExpandProperty Content
```

**예상 결과:**
```json
{
  "total": 10,
  "byEventName": {
    "story_impression": 5,
    "story_click": 5
  },
  "byRegion": {
    "seoul": 10
  }
}
```

## 문제 해결

### 시나리오 A: 프론트엔드 로그 없음
- `[STORY_LOG]` 로그가 안 보임
- **원인**: `logStory()` 호출 안 됨
- **해결**: StoryZone.tsx의 `onCta()` 확인

### 시나리오 B: 전송 시도 로그 없음
- `[StoryLog] 📤 전송 시도` 로그가 안 보임
- **원인**: `flushLogs()` 호출 안 됨 또는 큐 비어있음
- **해결**: `offline.storage.ts`의 `queueLog()` 확인

### 시나리오 C: 전송 실패
- `[StoryLog] ❌ 전송 실패` 로그 확인
- **원인**: API 경로 오류 (404) 또는 CORS 문제
- **해결**: 네트워크 탭에서 상태 코드 확인

### 시나리오 D: 백엔드 수신 실패
- 백엔드 콘솔에 `[STORY_LOG_BULK] Received` 로그 없음
- **원인**: 라우팅 문제
- **해결**: `/api/logs/story/bulk` 라우트 확인

### 시나리오 E: 저장 실패
- `[STORY_LOG_BULK] ✅ Saved` 로그 없음
- **원인**: `createMany` 오류
- **해결**: 백엔드 에러 로그 확인
