# Activity sport 값 통일 수정 지시문

## 문제

현재 `activities` 컬렉션의 `sport` 값이 혼재되어 있습니다.

**예**:
```json
{
  "sport": "soccer"  // ✅ 올바름
}
```

```json
{
  "sport": "축구"  // ❌ 잘못됨
}
```

**ActivityFeed는 다음 필터를 사용합니다**:
```typescript
activity.sport === sportParam
```

따라서 `sport` 값이 혼재되어 있으면 필터링이 제대로 작동하지 않습니다.

---

## 수정 기준

### 표준 sport 코드 (영문)

다음 값을 사용합니다:

```
soccer        (축구)
baseball      (야구)
basketball    (농구)
volleyball    (배구)
badminton     (배드민턴)
tennis        (테니스)
running       (러닝)
cycling       (사이클)
swimming      (수영)
golf          (골프)
fitness       (헬스)
```

---

## 잘못된 데이터 예

```json
{
  "sport": "축구"  // ❌
}
```

```json
{
  "sport": "야구"  // ❌
}
```

```json
{
  "sport": "배구"  // ❌
}
```

---

## 수정 (올바른 값)

```json
{
  "sport": "soccer"  // ✅
}
```

```json
{
  "sport": "baseball"  // ✅
}
```

```json
{
  "sport": "volleyball"  // ✅
}
```

---

## 권장 안전 코드 (추가)

혹시 데이터가 섞여 있어도 동작하도록 **ActivityFeed에서 정규화 로직 추가**:

**파일**: `src/features/activity/ActivityFeed.tsx`

**위치**: 클라이언트 사이드 필터링 부분 (약 460줄)

**수정 코드**:
```typescript
// 🔥 sport 값 정규화 매핑 (한글 → 영문)
const sportMap: Record<string, string> = {
  "축구": "soccer",
  "야구": "baseball",
  "농구": "basketball",
  "배구": "volleyball",
  "배드민턴": "badminton",
  "테니스": "tennis",
  "러닝": "running",
  "사이클": "cycling",
  "수영": "swimming",
  "골프": "golf",
  "헬스": "fitness",
};

// 🔥 sport 필터 (URL 파라미터가 있을 때만)
.filter((activity) => {
  if (!sport) return true;
  
  // 🔥 Activity의 sport 값 정규화
  const activitySport = sportMap[activity.sport] || activity.sport;
  
  // 🔥 URL 파라미터도 정규화
  const normalizedSportParam = sportMap[sport] || sport;
  
  return activitySport === normalizedSportParam.toLowerCase().trim();
})
```

---

## 수정 위치

### 파일: `src/features/activity/ActivityFeed.tsx`

### 위치: 클라이언트 사이드 필터링 부분 (약 450-480줄)

### 현재 코드:
```typescript
// 2. sport 필터 (URL 파라미터가 있을 때만)
.filter((activity) => {
  if (!sport) return true;
  return activity.sport === sport.toLowerCase().trim();
})
```

### 수정 코드:
```typescript
// 🔥 sport 값 정규화 매핑 (한글 → 영문)
const sportMap: Record<string, string> = {
  "축구": "soccer",
  "야구": "baseball",
  "농구": "basketball",
  "배구": "volleyball",
  "배드민턴": "badminton",
  "테니스": "tennis",
  "러닝": "running",
  "사이클": "cycling",
  "수영": "swimming",
  "골프": "golf",
  "헬스": "fitness",
};

// 2. sport 필터 (URL 파라미터가 있을 때만)
.filter((activity) => {
  if (!sport) return true;
  
  // 🔥 Activity의 sport 값 정규화
  const activitySport = sportMap[activity.sport] || activity.sport;
  
  // 🔥 URL 파라미터도 정규화
  const normalizedSportParam = sportMap[sport] || sport;
  
  return activitySport === normalizedSportParam.toLowerCase().trim();
})
```

---

## 수정 후 결과

### `/activity?sport=soccer`

#### 전체 탭
- 야고 축구 FC
- 축구화
- init (system 타입은 클라이언트에서 필터링)

#### 거래 탭
- 축구화
- init (system 타입은 클라이언트에서 필터링)

#### 팀 탭
- 야고 축구 FC

#### 이벤트 탭
- 없음

---

## Firestore 데이터 마이그레이션 (선택사항)

기존 데이터를 영문 코드로 통일하려면 다음 스크립트를 실행하세요:

**파일**: `scripts/migrateActivitySports.ts` (새로 생성)

```typescript
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const sportMapping: Record<string, string> = {
  "축구": "soccer",
  "야구": "baseball",
  "농구": "basketball",
  "배구": "volleyball",
  "배드민턴": "badminton",
  "테니스": "tennis",
  "러닝": "running",
  "사이클": "cycling",
  "수영": "swimming",
  "골프": "golf",
  "헬스": "fitness",
};

async function migrateActivitySports() {
  const activitiesRef = collection(db, "activities");
  const snapshot = await getDocs(activitiesRef);
  
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (const activityDoc of snapshot.docs) {
    const data = activityDoc.data();
    const currentSport = data.sport;
    
    // 한글 sport 값이면 영문으로 변환
    if (sportMapping[currentSport]) {
      await updateDoc(doc(db, "activities", activityDoc.id), {
        sport: sportMapping[currentSport],
      });
      console.log(`✅ [Migration] Activity ${activityDoc.id} sport 업데이트: ${currentSport} → ${sportMapping[currentSport]}`);
      updatedCount++;
    } else {
      skippedCount++;
    }
  }
  
  console.log(`✅ [Migration] 완료: ${updatedCount}개 업데이트, ${skippedCount}개 스킵`);
}

// 실행 (한 번만)
// migrateActivitySports().catch(console.error);
```

---

## 테스트 체크리스트

수정 후 다음을 확인하세요:

- [ ] `/activity?sport=soccer`에서 `sport: "soccer"` Activity 표시
- [ ] `/activity?sport=soccer`에서 `sport: "축구"` Activity도 표시 (정규화 로직 작동)
- [ ] `/activity?sport=baseball`에서 `sport: "baseball"` Activity 표시
- [ ] `/activity?sport=baseball`에서 `sport: "야구"` Activity도 표시 (정규화 로직 작동)
- [ ] 모든 탭에서 sport 필터 정상 작동

---

## 현재 프로젝트 진행 상태

| 기능 | 상태 |
|------|------|
| Home 시스템 | ✅ 완료 |
| Sport 필터 | ✅ 완료 |
| Activity Feed | ✅ 완료 |
| Activity 필터 | ✅ 완료 |
| Activity 데이터 | ⏳ 정리 필요 |
| Activity Detail | ⏳ 다음 단계 |
| 댓글 시스템 | ⏳ 다음 단계 |
| 좋아요 기능 | ⏳ 다음 단계 |

---

## 다음 개발 순서 (강력 추천)

### 1️⃣ Activity Detail
- 경로: `/activity/:id`
- 구성:
  - 제목
  - 이미지
  - 본문
  - 댓글
  - 좋아요
  - 채팅 이동

### 2️⃣ 댓글 시스템
- Firestore 컬렉션: `activityComments`

### 3️⃣ 좋아요 시스템
- Firestore 컬렉션: `activityLikes`

---

이 지시문을 따라 수정하면 ActivityFeed가 혼재된 sport 값을 정상적으로 처리합니다.
