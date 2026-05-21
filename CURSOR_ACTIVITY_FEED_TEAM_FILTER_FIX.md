# ActivityFeed.tsx 팀 필터 로직 수정 지시문

## 문제

현재 팀 탭 필터가 `refType === "teams"`로만 되어 있어 일부 팀 Activity가 필터링되어 UI에 표시되지 않습니다.

**증상**:
- Firestore에서 5개 Activity를 가져옴
- 하지만 UI에서는 일부만 표시됨
- "야고 축구 FC" Activity가 팀 탭에서 보이지 않음

**원인**:
- 팀 Activity는 다양한 형태로 저장될 수 있음:
  - `refType === "teams"` (올바름)
  - `refType === "team"` (단수, 레거시)
  - `type === "team_created"`
  - `type === "recruit_created"` (팀 모집)

---

## 팀 Activity 포함 조건

팀 Activity는 다음 타입들을 포함해야 합니다:

- `refType === "teams"`
- `refType === "team"` (레거시 호환)
- `type === "team_created"`
- `type === "recruit_created"` (팀 모집)
- `type?.includes("team")` (안전장치)

---

## 수정 코드

**파일**: `src/features/activity/ActivityFeed.tsx`

**위치**: 약 485-500줄 (탭 필터 부분)

### 현재 코드 (문제)
```typescript
// 3. 탭 필터 (refType 기준)
.filter((activity) => {
  if (activeFilter === "all" || activeFilter === "전체") return true;
  if (activeFilter === "market" || activeFilter === "거래") {
    return (activity as any).refType === "market";
  }
  if (activeFilter === "team" || activeFilter === "팀") {
    return (activity as any).refType === "teams";  // ❌ 너무 엄격함
  }
  if (activeFilter === "event" || activeFilter === "이벤트") {
    return (activity as any).refType === "events";
  }
  return true;
})
```

### 수정 코드 (정답)
```typescript
// 3. 탭 필터 (refType + type 기준)
.filter((activity) => {
  if (activeFilter === "all" || activeFilter === "전체") return true;
  
  if (activeFilter === "market" || activeFilter === "거래") {
    return (activity as any).refType === "market";
  }
  
  if (activeFilter === "team" || activeFilter === "팀") {
    // 🔥 팀 필터: refType 또는 type으로 판단 (더 관대한 필터)
    const refType = (activity as any).refType;
    const activityType = (activity as any).type || "";
    
    return (
      refType === "teams" ||
      refType === "team" ||  // 레거시 호환
      activityType === "team_created" ||
      activityType === "recruit_created" ||  // 팀 모집
      activityType.includes("team")  // 안전장치
    );
  }
  
  if (activeFilter === "event" || activeFilter === "이벤트") {
    return (activity as any).refType === "events";
  }
  
  return true;
})
```

---

## 수정 위치

**파일**: `src/features/activity/ActivityFeed.tsx`

**위치**: 약 485-500줄

**전체 수정 코드**:
```typescript
// 3. 탭 필터 (refType + type 기준)
.filter((activity) => {
  if (activeFilter === "all" || activeFilter === "전체") return true;
  
  if (activeFilter === "market" || activeFilter === "거래") {
    return (activity as any).refType === "market";
  }
  
  if (activeFilter === "team" || activeFilter === "팀") {
    // 🔥 팀 필터: refType 또는 type으로 판단 (더 관대한 필터)
    const refType = (activity as any).refType;
    const activityType = (activity as any).type || "";
    
    return (
      refType === "teams" ||
      refType === "team" ||  // 레거시 호환
      activityType === "team_created" ||
      activityType === "recruit_created" ||  // 팀 모집
      activityType.includes("team")  // 안전장치
    );
  }
  
  if (activeFilter === "event" || activeFilter === "이벤트") {
    return (activity as any).refType === "events";
  }
  
  return true;
})
```

---

## 테스트 체크리스트

수정 후 다음을 확인하세요:

- [ ] `refType === "teams"` Activity가 팀 탭에 표시
- [ ] `refType === "team"` Activity가 팀 탭에 표시 (레거시 호환)
- [ ] `type === "team_created"` Activity가 팀 탭에 표시
- [ ] `type === "recruit_created"` Activity가 팀 탭에 표시
- [ ] "야고 축구 FC" Activity가 팀 탭에 표시
- [ ] "소흘" Activity가 팀 탭에 표시

---

## 참고 (지금 시스템 상태)

현재 상태는 매우 좋습니다:

- ✅ Activity Feed → 정상
- ✅ Sport 필터 → 정상
- ✅ refType 필터 → 수정 필요 (팀 필터만)
- ✅ Firestore 구조 → 정상

**문제는 ActivityFeed 필터 로직**입니다.

---

## 추가 권장사항

### refType 표준 통일

앞으로 Activity 생성 시 다음 표준을 사용하세요:

```
refType = "market"  ✅
refType = "teams"   ✅ (단수 "team" 사용 금지)
refType = "events"  ✅
```

**ActivityFactory**를 사용하면 자동으로 올바른 refType이 설정됩니다.

---

이 지시문을 따라 수정하면 팀 탭에서 모든 팀 Activity가 정상적으로 표시됩니다.
