# 🔥 Cursor 개발자 수정 지시문: Activity 필터 정확한 수정

## ✅ 수정 완료

### 문제

스크린샷 기준으로 조건이 맞지 않음:
- 전체 탭: "활동이 없습니다" (공공공, 야고 축구 FC 둘 다 안 보임) ❌
- 거래 탭: "활동이 없습니다" (공공공 안 보임) ❌
- 팀 탭: "야고 축구 FC" 표시됨 ✅

---

## 🔍 진짜 원인

**sport 필터 문제가 아니라 Activity type 필터 매핑 문제입니다.**

현재 페이지: `/activity?sport=soccer` (축구 Activity 페이지)
- 모든 탭에서 `sport=soccer` 필터는 **반드시 유지**해야 함
- 문제는 **type 필터 매핑**이 잘못됨

---

## 📋 수정 상세

### 1️⃣ sport 필터는 절대 제거하지 말 것 ✅

**현재 코드 유지**:
```typescript
// 🔥 sport 필터 추가 (모든 탭에서 적용 - 이 페이지는 특정 종목 Activity 페이지)
// /activity?sport=soccer는 축구 Activity 페이지이므로 모든 탭에서 sport 필터 유지
if (sport) {
  activitiesConditions.push(where("sport", "==", sport.toLowerCase().trim()));
}
```

**이유**: 
- `/activity?sport=soccer`는 "축구 Activity 페이지"
- 모든 탭에서 축구 활동만 표시해야 함
- 전체 탭에서도 배구/농구 활동이 나오면 안 됨

---

### 2️⃣ Activity type 필터 수정 (핵심) ✅

**파일**: `src/features/activity/ActivityFeed.tsx`

#### 전체 탭
```typescript
if (activeFilter === "all" || activeFilter === "전체") {
  // system 타입 제외
  activitiesConditions.push(where("type", "!=", "system"));
}
```

#### 거래 탭
```typescript
if (activeFilter === "market" || activeFilter === "거래") {
  // 🔥 equipment_created만 표시 (recruit_created 제외)
  activitiesConditions.push(where("type", "==", "equipment_created"));
}
```

#### 팀 탭
```typescript
if (activeFilter === "team" || activeFilter === "팀") {
  // 🔥 team_created + recruit_created 표시
  activitiesConditions.push(where("type", "in", ["team_created", "recruit_created"]));
}
```

#### 이벤트 탭
```typescript
if (activeFilter === "event" || activeFilter === "이벤트") {
  // team_event만
  activitiesConditions.push(where("type", "==", "team_event"));
}
```

---

### 3️⃣ Activity 생성 시 sport 값 확인 ✅

**확인된 파일**:
- `EquipmentForm.tsx`: `sport: sport?.toLowerCase().trim() || "soccer"`
- `RecruitForm.tsx`: `sport: sport?.toLowerCase().trim() || "soccer"`
- `MatchForm.tsx`: `sport: sport?.toLowerCase().trim() || "soccer"`

**확인 사항**:
- `sport` 파라미터가 올바르게 전달되는지
- Activity 생성 시 `post.sport` 값이 올바르게 저장되는지

---

## 📋 최종 필터 로직

### 필터별 동작 (`/activity?sport=soccer` 기준)

| 탭 | Type 필터 | Sport 필터 | 결과 |
|---|----------|-----------|------|
| **전체** | `type != "system"` | ✅ `sport=soccer` | 축구의 모든 활동 (system 제외) |
| **거래** | `type == "equipment_created"` | ✅ `sport=soccer` | 축구의 equipment만 |
| **팀** | `type in ["team_created", "recruit_created"]` | ✅ `sport=soccer` | 축구의 팀/모집만 |
| **이벤트** | `type == "team_event"` | ✅ `sport=soccer` | 축구의 이벤트만 |

---

## 🧪 수정 후 예상 결과

### 전체 탭 (`/activity?sport=soccer`)
- "공공공" (축구, equipment_created) ✅ 표시
- "야고 축구 FC" (축구, recruit_created) ✅ 표시
- **주의**: 배구/농구 활동은 표시되지 않음 (sport 필터 적용)

### 거래 탭 (`/activity?sport=soccer`)
- "공공공" (축구, equipment_created) ✅ 표시
- "야고 축구 FC" (축구, recruit_created) ❌ 표시 안 됨 (recruit이므로)

### 팀 탭 (`/activity?sport=soccer`)
- "야고 축구 FC" (축구, recruit_created) ✅ 표시
- "공공공" (축구, equipment_created) ❌ 표시 안 됨 (equipment이므로)

---

## ⚠️ 중요: sport 필터는 절대 제거하지 말 것

**잘못된 수정**:
```typescript
// ❌ 이렇게 하면 안 됨
if (sport && activeFilter !== "all") {
  activitiesConditions.push(where("sport", "==", sport));
}
```

**올바른 코드**:
```typescript
// ✅ 모든 탭에서 sport 필터 유지
if (sport) {
  activitiesConditions.push(where("sport", "==", sport.toLowerCase().trim()));
}
```

**이유**:
- `/activity?sport=soccer`는 "축구 Activity 페이지"
- 전체 탭에서도 축구 활동만 표시해야 함
- 배구/농구 활동이 나타나면 UX 혼란

---

## 📝 참고사항

### Activity 타입 구조

```
equipment_created  → 거래 탭
recruit_created    → 팀 탭
match_created      → (현재 탭 없음, 향후 추가 가능)
team_created       → 팀 탭
team_event         → 이벤트 탭
system             → 모든 탭에서 제외
```

### 페이지 구조

```
/activity              → 전체 종목 Activity (sport 필터 없음)
/activity?sport=soccer → 축구 Activity (sport 필터 적용)
/activity?sport=volleyball → 배구 Activity (sport 필터 적용)
```

---

이 수정으로 **Activity 필터가 올바르게 작동**합니다.
