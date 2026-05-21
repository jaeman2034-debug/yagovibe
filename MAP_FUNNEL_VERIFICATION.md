# 🔥 지도 퍼널 무결성 검증 가이드

## 📋 현재 상태 분석

### ✅ 확인된 부분

1. **StoryZone 컴포넌트**
   - `story_impression` 로그 전송 ✅ (365-379줄)
   - `current.id` 변경 시 자동 노출 로그
   - `logStory` 함수 사용

2. **로그 시스템**
   - `story.log.ts`에서 `story_impression`, `story_click` 이벤트 로깅 ✅
   - 백엔드 `EventLog` 스키마에 맞춘 payload 전송 ✅

3. **MapPageContainer**
   - 마커 클릭 시 `onSelectPlace` 콜백 호출 ✅
   - `previewPlace` 설정 ✅

---

## ❓ 확인 필요 사항

### 1️⃣ 지도에서 마커 클릭 → 스토리 뜨니?

**현재 코드:**
- `MapPageContainer.tsx`: 마커 클릭 시 `previewPlace` 설정
- `StoryZone` 컴포넌트가 별도로 존재하지만, 마커 클릭과 직접 연결되는지는 불명확

**확인 방법:**
1. 지도 페이지 접속
2. 마커 클릭
3. 스토리 모달/카드가 표시되는지 확인

**예상 시나리오:**
- 마커 클릭 → 장소 카드 표시 → 스토리 존 표시
- 또는 마커 클릭 → 스토리 모달 직접 표시

---

### 2️⃣ 스토리에서 "팀 보기" 이동돼?

**현재 코드:**
- `StoryRouter.ts`: `handleStoryNavigation` 함수 존재
- `getStoryRoute` 함수로 스토리에서 팀 페이지로 라우팅

**확인 방법:**
1. 스토리 카드 클릭
2. "팀 보기" 또는 CTA 버튼 클릭
3. 팀 페이지로 이동하는지 확인

**예상 시나리오:**
- 스토리 클릭 → `handleStoryNavigation` 호출
- `getStoryRoute`로 팀 페이지 경로 생성
- `navigate`로 이동

---

### 3️⃣ 대시보드 숫자 클릭하면 바로 올라가?

**현재 코드:**
- `FunnelPanel.tsx`: `onSnapshot` 실시간 구독 ✅
- `story_impression`, `story_click` 이벤트 수집 ✅
- `TEAM_VIEW` 이벤트 수집 ✅

**확인 방법:**
1. 유저 화면에서 마커 클릭
2. 스토리 클릭
3. 팀 페이지 이동
4. 관리자 대시보드에서 숫자 증가 확인

**예상 시나리오:**
- 마커 클릭 → `story_impression` 로그 → 대시보드 +1
- 스토리 클릭 → `story_click` 로그 → 대시보드 +1
- 팀 페이지 이동 → `TEAM_VIEW` 로그 → 대시보드 +1

---

## 🚀 다음 단계

### 즉시 확인할 사항

1. **브라우저에서 테스트**
   - 지도 페이지 접속
   - 마커 클릭
   - 스토리 표시 여부 확인
   - "팀 보기" 버튼 클릭
   - 팀 페이지 이동 확인

2. **관리자 대시보드 확인**
   - FunnelPanel 숫자 실시간 업데이트 확인
   - 콘솔에서 로그 이벤트 확인

3. **로그 전송 확인**
   - 브라우저 콘솔: `[STORY_LOG]` 메시지 확인
   - 네트워크 탭: `/api/logs/story` 요청 확인

---

## 🔧 개선 필요 사항 (확인 후)

### 1. 마커 클릭 → 스토리 자동 표시

**현재:** 마커 클릭 시 `previewPlace`만 설정

**개선:** 마커 클릭 시 해당 장소의 스토리 자동 표시

```typescript
// MapPageContainer.tsx
onSelectPlace={(place) => {
  // ... 기존 코드 ...
  
  // 🔥 스토리 자동 표시
  if (place.storyId) {
    setSelectedStoryId(place.storyId);
    setShowStoryModal(true);
  }
}}
```

---

### 2. 스토리 클릭 로그 강화

**현재:** `StoryZone`에서 클릭 로그 전송

**개선:** 클릭 시 즉시 로그 전송 + 네비게이션

```typescript
// StoryZone.tsx
const handleStoryClick = (story: Story) => {
  // 1. 클릭 로그 전송
  logStory(story, "click", {
    mode: "default",
    decisionReason: `스토리 클릭: ${story.title}`,
    from: "cache",
  });
  
  // 2. 네비게이션
  handleStoryNavigation(story, navigate, currentSportType);
};
```

---

### 3. TEAM_VIEW 로그 추가

**현재:** 팀 페이지에서 `TEAM_VIEW` 로그 전송 여부 불명확

**개선:** 팀 페이지 진입 시 자동 로그 전송

```typescript
// TeamDetail.tsx 또는 팀 페이지 컴포넌트
useEffect(() => {
  if (teamId) {
    logActivity({
      event: "TEAM_VIEW",
      location: `/sports/${sportType}/team/${teamId}`,
      meta: { teamId, sportType },
    });
  }
}, [teamId]);
```

---

## 📊 검증 체크리스트

### 기능 검증
- [ ] 지도에서 마커 클릭 시 스토리 표시
- [ ] 스토리에서 "팀 보기" 버튼 클릭 시 팀 페이지 이동
- [ ] 팀 페이지 정상 로드

### 로그 검증
- [ ] 마커 클릭 시 `story_impression` 로그 전송
- [ ] 스토리 클릭 시 `story_click` 로그 전송
- [ ] 팀 페이지 이동 시 `TEAM_VIEW` 로그 전송

### 대시보드 검증
- [ ] `story_impression` 숫자 실시간 증가
- [ ] `story_click` 숫자 실시간 증가
- [ ] `TEAM_VIEW` 숫자 실시간 증가
- [ ] CTR 계산 정확 (click / impression)

---

## 🎯 결론

**현재 상태:**
- ✅ 로그 시스템 구축 완료
- ✅ 실시간 대시보드 구독 완료
- ❓ 마커 클릭 → 스토리 연결 확인 필요
- ❓ 스토리 → 팀 페이지 연결 확인 필요
- ❓ TEAM_VIEW 로그 트리거 확인 필요

**다음 액션:**
1. 브라우저에서 실제 테스트
2. 확인 결과에 따라 코드 개선
3. 로그 무결성 검증
