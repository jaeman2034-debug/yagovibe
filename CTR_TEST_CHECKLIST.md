# 🔥 CTR 파이프라인 테스트 체크리스트

## ✅ 환경 설정 완료

- `.env.local`: `VITE_API_BASE=http://localhost:3001/api` 추가됨
- `story.log.ts`: 환경 변수 사용하도록 수정됨

---

## 🧪 테스트 단계

### STEP 1: Vite 서버 재시작 (필수)

```bash
npm run dev
```

**확인 포인트:**
- 서버가 정상적으로 시작되는지
- 환경 변수가 로드되는지

---

### STEP 2: 브라우저 테스트

1. `https://localhost:5173/sports-hub` 접속
2. F12 → 개발자 도구 열기
3. Console 탭 선택
4. Network 탭도 열어두기

---

### STEP 3: 스토리 클릭

1. 스토리 카드 확인 (자동 노출 로그)
2. CTA 버튼 클릭 (클릭 로그)

---

## 📊 확인할 로그 (우선순위)

### A. 콘솔 로그

**예상 결과:**
```
[STORY_LOG] { eventName: "story_impression", region: "seoul", ... }
🔥 [StoryLog] API_BASE = http://localhost:3001/api
[StoryLog] 📤 전송 시도: 1개 이벤트 → http://localhost:3001/api/logs/story/bulk
[StoryLog] ✅ 전송 성공: 1개 저장됨
```

**확인 사항:**
- ✅ `🔥 [StoryLog] API_BASE = http://localhost:3001/api` 보이는지
- ✅ `[StoryLog] 📤 전송 시도` 로그 보이는지
- ✅ `[StoryLog] ✅ 전송 성공` 또는 `❌ 전송 실패` 보이는지

---

### B. 네트워크 탭

**필터:** `bulk` 또는 `logs`

**예상 요청:**
```
POST http://localhost:3001/api/logs/story/bulk
Status: 200 OK
```

**Request Payload 확인:**
```json
[{
  "eventName": "story_click",
  "region": "seoul",
  "storyId": "...",
  ...
}]
```

**확인 사항:**
- ✅ `/bulk` 요청이 보이는지
- ✅ Status가 200인지
- ✅ Payload에 `eventName`과 `region`이 있는지

---

### C. 백엔드 콘솔 (터미널)

**예상 로그:**
```
[STORY_LOG_BULK] Received 1 events
[STORY_LOG_BULK] Sample event: { eventName: "story_click", region: "seoul", ... }
[STORY_LOG_BULK] ✅ Saved 1 events to DB
```

**확인 사항:**
- ✅ `[STORY_LOG_BULK] Received` 로그 보이는지
- ✅ `✅ Saved` 로그 보이는지

---

## 🐛 문제 해결

### 시나리오 A: 콘솔 로그 없음

**증상:**
- `[STORY_LOG]` 로그가 안 보임

**원인:**
- `logStory()` 함수가 호출되지 않음
- StoryZone 컴포넌트가 마운트되지 않음

**해결:**
- `/sports-hub` 페이지가 정상적으로 로드되는지 확인
- 스토리 카드가 표시되는지 확인

---

### 시나리오 B: API_BASE가 다른 값

**증상:**
```
🔥 [StoryLog] API_BASE = /api
또는
🔥 [StoryLog] API_BASE = https://...
```

**원인:**
- Vite 서버 미재시작
- 환경 변수 미로드

**해결:**
- Vite 서버 완전 재시작
- `.env.local` 파일 확인

---

### 시나리오 C: 네트워크 요청 없음

**증상:**
- 네트워크 탭에 `/bulk` 요청이 없음

**원인:**
- `flushLogs()` 함수가 호출되지 않음
- 큐가 비어있음
- 오프라인 상태

**해결:**
- 콘솔에서 `[StoryLog] 📤 전송 시도` 로그 확인
- 네트워크 연결 상태 확인

---

### 시나리오 D: 404 에러

**증상:**
```
POST http://localhost:3001/api/logs/story/bulk
Status: 404 Not Found
```

**원인:**
- 백엔드 서버 미실행
- 라우트 경로 불일치

**해결:**
- 백엔드 서버 실행 확인 (`npm run dev` 또는 `npm run dev:bff`)
- `http://localhost:3001/healthz` 접속 확인

---

### 시나리오 E: CORS 에러

**증상:**
```
Access to fetch at 'http://localhost:3001/...' from origin 'https://localhost:5173' has been blocked by CORS policy
```

**원인:**
- Mixed Content (HTTPS → HTTP)
- CORS 설정 문제

**해결:**
- 프록시 설정 확인 (`vite.config.ts`)
- 백엔드 CORS 설정 확인

---

## 📝 테스트 결과 보고

다음 2가지만 답변해주세요:

1. **콘솔에 `[StoryLog]` 로그 보였는지**
   - 예 / 아니오
   - 보였다면 어떤 로그인지 (전체 복붙 가능)

2. **네트워크에 `/bulk` 요청 보였는지**
   - 예 / 아니오
   - 보였다면 Status 코드는? (200/404/500)

---

## ✅ 성공 기준

다음이 모두 확인되면 성공:

- ✅ 콘솔: `🔥 [StoryLog] API_BASE = http://localhost:3001/api`
- ✅ 콘솔: `[StoryLog] ✅ 전송 성공`
- ✅ 네트워크: `POST http://localhost:3001/api/logs/story/bulk` → 200
- ✅ 백엔드: `[STORY_LOG_BULK] ✅ Saved 1 events to DB`
- ✅ DB: EventLog에 데이터 저장 확인
