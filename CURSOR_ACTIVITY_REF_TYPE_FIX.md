# Activity refType 값 확인 및 수정 지시문

## 문제 확인

Firestore `activities` 컬렉션에서 "야고 축구 FC" Activity 문서의 `refType` 값을 확인하세요.

현재 팀 탭(ActivityFeed filter) 조건은:
```typescript
refType === "teams"
```

야고 축구 FC가 팀 모집이라면 Activity 생성 시 `refType`을 `"teams"`로 저장하도록 수정하세요.

---

## 현재 문제 코드

### 1. RecruitForm.tsx (221줄)

**현재 코드 (문제)**:
```typescript
const activityDataRaw = {
  type: "recruit_created" as const,
  refType: "recruit" as const,  // ❌ 잘못됨
  refId: docRef.id,
  // ...
};
```

**수정 코드**:
```typescript
const activityDataRaw = {
  type: "recruit_created" as const,
  refType: "teams" as const,  // ✅ 수정
  refId: docRef.id,
  // ...
};
```

---

### 2. RecruitCreatePage.tsx (167줄)

**현재 코드 (문제)**:
```typescript
const activityData = {
  type: "recruit_created" as ActivityType,
  refType: "recruit" as const,  // ❌ 잘못됨
  refId: recruitId,
  // ...
};
```

**수정 코드**:
```typescript
const activityData = {
  type: "recruit_created" as ActivityType,
  refType: "teams" as const,  // ✅ 수정
  refId: recruitId,
  // ...
};
```

---

## 올바른 refType 매핑

### Activity 타입별 refType 규칙

```typescript
// 거래 관련
type: "equipment_created" → refType: "market"
type: "match_created"     → refType: "market"

// 팀 관련
type: "recruit_created"   → refType: "teams"  // ✅ 수정 필요
type: "team_created"      → refType: "teams"

// 이벤트 관련
type: "team_event"        → refType: "events"
```

---

## 예시 (올바른 Activity 구조)

```json
{
  "title": "야고 축구 FC",
  "type": "recruit_created",
  "refType": "teams",  // ✅ "teams"로 저장
  "refId": "teamId",
  "sport": "soccer"
}
```

---

## 수정 파일 목록

1. `src/features/market/components/forms/RecruitForm.tsx` (221줄)
2. `src/pages/recruit/RecruitCreatePage.tsx` (167줄)

---

## 현재 시스템 상태

| 기능 | 상태 |
|------|------|
| Activity Feed | ✅ 정상 |
| Sport 필터 | ✅ 정상 |
| refType 필터 | ✅ 정상 |
| Firestore 구조 | ✅ 정상 |
| **Activity 생성 시 refType 설정** | ❌ **수정 필요** |

---

## 문제 원인

**Activity 생성 로직이 여러 곳에 분산**되어 있어서:
- 각 파일마다 refType을 다르게 설정
- 일관성 없는 refType 값
- 유지보수 어려움

---

이 지시문을 따라 수정하면 Activity 생성 시 refType이 올바르게 설정됩니다.
