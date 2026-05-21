# 🔥 지도 이벤트 로그 검증 가이드

## ✅ 현재 구현 상태

### 1. story_impression 로그

**위치:** `src/components/story/StoryZone.tsx` (365-379줄)

**동작:**
```typescript
useEffect(() => {
  if (!current) return;
  
  try {
    const newStory = convertToNewStory(current);
    logStory(newStory, "impression", {
      mode: "default",
      decisionReason: `스토리 노출: ${current.title}`,
      from: "cache",
    });
  } catch (error) {
    console.error("[StoryZone] 노출 로그 전송 실패:", error);
  }
}, [current?.id]); // current.id가 변경될 때마다 노출 로그 전송
```

**트리거 시점:**
- 스토리 카드가 표시될 때
- 스토리 인덱스가 변경될 때 (`current.id` 변경)

---

### 2. story_click 로그

**위치:** `src/components/story/StoryZone.tsx` (259-298줄)

**동작:**
```typescript
const handleCta = (story: Story) => {
  const cta = story.cta;
  if (!cta) return;

  // 🔥 CTR 파이프라인: 클릭 로그 전송
  try {
    const newStory = convertToNewStory(story);
    logStory(newStory, "click", {
      mode: "default",
      decisionReason: `CTA 클릭: ${cta.type}`,
      from: "cache",
    });
  } catch (error) {
    console.error("[StoryZone] 로그 전송 실패:", error);
  }
  
  // ... 네비게이션 로직 ...
};
```

**트리거 시점:**
- CTA 버튼 클릭 시 (454줄: `onClick={() => handleCta(current)}`)

---

### 3. 로그 전송 시스템

**위치:** `src/features/sportHub/domain/story.log.ts`

**동작:**
1. **콘솔 출력** (63줄)
   ```typescript
   console.log("[STORY_LOG]", payload);
   ```

2. **오프라인 큐 저장** (66-72줄)
   ```typescript
   queueLog(payload);
   ```

3. **온라인 시 즉시 전송** (75-77줄)
   ```typescript
   if (navigator.onLine) {
     flushLogs(); // → /api/logs/story/bulk
   }
   ```

---

## 🔍 콘솔에서 확인할 로그

### 1. story_impression 로그

**콘솔 메시지:**
```
[STORY_LOG] {
  storyId: "...",
  eventName: "story_impression",
  category: "...",
  source: "...",
  region: "seoul",
  at: "2024-01-27T...",
  ...
}
```

**확인 방법:**
1. 지도 페이지 접속
2. StoryZone 컴포넌트가 로드되면 자동으로 로그 출력
3. 스토리가 변경되면 새로운 impression 로그 출력

---

### 2. story_click 로그

**콘솔 메시지:**
```
[STORY_LOG] {
  storyId: "...",
  eventName: "story_click",
  category: "...",
  source: "...",
  region: "seoul",
  at: "2024-01-27T...",
  ...
}
```

**확인 방법:**
1. 스토리 카드의 CTA 버튼 클릭
2. 즉시 클릭 로그 출력

---

### 3. API 전송 로그

**전송 시도:**
```
[StoryLog] 📤 전송 시도: 1개 이벤트 → /api/logs/story/bulk
```

**전송 성공:**
```
[StoryLog] ✅ 전송 성공: 1개 저장됨
```

**전송 실패:**
```
[StoryLog] ❌ 전송 실패: 500 Internal Server Error
```

---

## 🧪 검증 체크리스트

### 브라우저 콘솔 확인

1. **지도 페이지 접속**
   - [ ] `[STORY_LOG]` 메시지 확인 (impression)
   - [ ] `eventName: "story_impression"` 확인

2. **스토리 카드 표시**
   - [ ] StoryZone 컴포넌트 로드 확인
   - [ ] 스토리 데이터 로드 확인

3. **CTA 버튼 클릭**
   - [ ] `[STORY_LOG]` 메시지 확인 (click)
   - [ ] `eventName: "story_click"` 확인
   - [ ] 페이지 이동 확인

4. **API 전송 확인**
   - [ ] `[StoryLog] 📤 전송 시도` 메시지 확인
   - [ ] `[StoryLog] ✅ 전송 성공` 메시지 확인
   - [ ] 네트워크 탭에서 `/api/logs/story/bulk` 요청 확인

---

### 관리자 대시보드 확인

1. **FunnelPanel 실시간 업데이트**
   - [ ] `story_impression` 숫자 증가 확인
   - [ ] `story_click` 숫자 증가 확인
   - [ ] CTR 계산 정확성 확인

2. **Firestore 확인**
   - [ ] `eventLogs` 컬렉션에 데이터 저장 확인
   - [ ] `eventName` 필드 정확성 확인
   - [ ] `createdAt` 타임스탬프 확인

---

## ❓ 문제 해결

### 문제 1: 콘솔에 `[STORY_LOG]` 메시지가 안 보임

**원인:**
- StoryZone 컴포넌트가 렌더링되지 않음
- 스토리 데이터가 없음
- `logStory` 함수 호출 실패

**해결:**
1. StoryZone 컴포넌트가 지도 페이지에 포함되어 있는지 확인
2. 스토리 데이터가 정상적으로 로드되는지 확인
3. 콘솔 에러 메시지 확인

---

### 문제 2: 클릭 로그가 안 찍힘

**원인:**
- CTA 버튼 클릭 이벤트가 연결되지 않음
- `handleCta` 함수 호출 실패
- `story.cta`가 없음

**해결:**
1. CTA 버튼이 정상적으로 렌더링되는지 확인
2. `onClick={() => handleCta(current)}` 연결 확인
3. 스토리 데이터에 `cta` 필드가 있는지 확인

---

### 문제 3: API 전송 실패

**원인:**
- BFF 서버가 실행되지 않음
- 프록시 설정 오류
- 네트워크 오류

**해결:**
1. BFF 서버 실행 확인 (`npm run dev:bff`)
2. `vite.config.ts` 프록시 설정 확인
3. 네트워크 탭에서 요청 상태 확인

---

## 🎯 예상 결과

### 정상 동작 시

1. **지도 페이지 접속**
   ```
   [STORY_LOG] { eventName: "story_impression", ... }
   [StoryLog] 📤 전송 시도: 1개 이벤트 → /api/logs/story/bulk
   [StoryLog] ✅ 전송 성공: 1개 저장됨
   ```

2. **CTA 버튼 클릭**
   ```
   [STORY_LOG] { eventName: "story_click", ... }
   [StoryLog] 📤 전송 시도: 1개 이벤트 → /api/logs/story/bulk
   [StoryLog] ✅ 전송 성공: 1개 저장됨
   ```

3. **관리자 대시보드**
   - FunnelPanel 숫자 실시간 증가
   - CTR 계산 정확

---

## 📊 다음 단계

### 확인 후 작업

1. **로그가 정상적으로 찍히는 경우**
   - ✅ 퍼널 연결 확인
   - ✅ TEAM_VIEW 로그 추가
   - ✅ CTR 계산 검증

2. **로그가 안 찍히는 경우**
   - ❌ StoryZone 컴포넌트 연결 확인
   - ❌ 이벤트 핸들러 확인
   - ❌ API 전송 로직 확인

---

## 💡 참고

### 로그 함수 이름

**사용자가 찾는 것:**
```typescript
logEvent("story_impression")
logEvent("story_click")
```

**실제 구현:**
```typescript
logStory(story, "impression", {...})
logStory(story, "click", {...})
```

**콘솔 출력:**
```
[STORY_LOG] { eventName: "story_impression", ... }
[STORY_LOG] { eventName: "story_click", ... }
```

👉 **`logEvent`가 아니라 `logStory`를 사용하고 있으며, 콘솔에는 `[STORY_LOG]`로 출력됩니다.**
