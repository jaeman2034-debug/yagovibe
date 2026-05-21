# 🔥 로그 전송 파이프라인 디버깅 가이드

## 발견된 문제

### ❌ 프록시 설정 누락

`vite.config.ts`에 `/api/logs` 프록시가 없어서:
- 프론트엔드: `https://localhost:5173/api/logs/story/bulk` 요청
- 프록시 없음 → 404 에러
- 백엔드: `http://localhost:3001/api/logs/story/bulk` 도달 실패

### ✅ 수정 완료

`vite.config.ts`에 `/api/logs` 프록시 추가:
```typescript
"/api/logs": {
  target: "http://localhost:3001",
  changeOrigin: true,
  secure: false,
}
```

---

## 테스트 단계

### 1. Vite 서버 재시작
프록시 설정 변경 반영을 위해 Vite 서버 재시작 필요

### 2. 브라우저 테스트

#### STEP 1: 콘솔 로그 확인
1. `https://localhost:5173/sports-hub` 접속
2. F12 → Console 탭
3. 스토리 클릭
4. 다음 로그 확인:

```
[STORY_LOG] {
  eventName: "story_click",
  region: "seoul",
  storyId: "...",
  ...
}
[StoryLog] 📤 전송 시도: 1개 이벤트 → /api/logs/story/bulk
[StoryLog] ✅ 전송 성공: 1개 저장됨
```

#### STEP 2: 네트워크 탭 확인
1. F12 → Network 탭
2. 필터: `bulk` 또는 `logs`
3. 스토리 클릭
4. 다음 요청 확인:

```
POST /api/logs/story/bulk
Status: 200 OK
Request Payload: [{ eventName: "story_click", ... }]
Response: { ok: true, count: 1 }
```

#### STEP 3: 백엔드 콘솔 확인
백엔드 서버 터미널에서:

```
[STORY_LOG_BULK] Received 1 events
[STORY_LOG_BULK] Sample event: { eventName: "story_click", region: "seoul", ... }
[STORY_LOG_BULK] ✅ Saved 1 events to DB
```

### 3. DB 확인

```powershell
Invoke-WebRequest -Uri "http://localhost:3001/api/logs/debug/eventlog" | Select-Object -ExpandProperty Content
```

**예상 결과:**
```json
{
  "total": 1,
  "byEventName": {
    "story_click": 1
  },
  "byRegion": {
    "seoul": 1
  }
}
```

---

## 문제 해결 체크리스트

### ✅ 프록시 설정 추가 완료
- `/api/logs` 프록시 추가됨

### ⏳ 다음 확인 사항

1. **Vite 서버 재시작**
   - 프록시 설정 변경 반영

2. **브라우저 테스트**
   - 콘솔 로그 확인
   - 네트워크 요청 확인
   - 백엔드 로그 확인

3. **DB 저장 확인**
   - EventLog에 데이터 저장 여부

---

## 예상 시나리오

### 시나리오 A: 정상 작동
- 콘솔: `[StoryLog] ✅ 전송 성공`
- 네트워크: `200 OK`
- 백엔드: `✅ Saved 1 events to DB`
- DB: 로그 1개 확인

### 시나리오 B: 여전히 실패
- 콘솔: `[StoryLog] ❌ 전송 실패`
- 네트워크: `404` 또는 `CORS error`
- 원인: Vite 서버 미재시작 또는 다른 문제

---

## 다음 단계

1. **Vite 서버 재시작** (필수)
2. **브라우저 테스트**
3. **결과 공유**:
   - 콘솔 로그
   - 네트워크 상태
   - 백엔드 로그
