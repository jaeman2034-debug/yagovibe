# Cursor 수정 지시문

## 문제

Activity 생성 시 `sport` 값이 **한글로 저장**되고 있어서 Firestore 쿼리가 실패하고 있습니다.

**현재 문제**:
- Activity 생성: `sport: "축구"`
- 쿼리 조건: `where("sport", "==", "soccer")`
- 결과: `sport = "축구"` 문서는 조회되지 않음

---

## 확인 필요

Firestore `activities` 문서에서 `sport` 값이:
- `soccer` (영문 코드)로 저장되어 있는지
- `축구` (한글)로 저장되어 있는지

**확인 방법**: Firebase Console에서 `activities` 컬렉션의 문서 하나를 열어 `sport` 필드 값을 확인하세요.

---

## 수정 방법

### Activity 생성 시 sport 값은 영문 코드로 저장

**규칙**:
- 한글 사용하지 않음
- 영문 코드만 사용

**매핑**:
```
축구 → soccer
야구 → baseball
농구 → basketball
배구 → volleyball
러닝 → running
배드민턴 → badminton
클라이밍 → climbing
수영 → swimming
```

---

## 수정 파일

### 1️⃣ EquipmentForm.tsx

**파일**: `src/features/market/components/forms/EquipmentForm.tsx`

**위치**: Activity 생성 부분 (약 414줄)

**Before (현재 - 문제 코드)**:
```typescript
const activityDataRaw = {
  type: "equipment_created" as const,
  sport: "축구",  // ❌ 한글 사용
  // ... 기타 필드
};
```

**After (수정 후)**:
```typescript
const activityDataRaw = {
  type: "equipment_created" as const,
  sport: sport?.toLowerCase().trim() || "soccer",  // ✅ 영문 코드 사용
  // ... 기타 필드
};
```

**확인**: `sport` prop이 이미 영문 코드로 전달되는지 확인 필요

---

### 2️⃣ RecruitForm.tsx

**파일**: `src/features/market/components/forms/RecruitForm.tsx`

**위치**: Activity 생성 부분 (약 232줄)

**수정 코드**:
```typescript
const activityDataRaw = {
  type: "recruit_created" as const,
  sport: sport?.toLowerCase().trim() || "soccer",  // ✅ 영문 코드 사용
  // ... 기타 필드
};
```

---

### 3️⃣ MatchForm.tsx

**파일**: `src/features/market/components/forms/MatchForm.tsx`

**위치**: Activity 생성 부분 (약 254줄)

**수정 코드**:
```typescript
const activityDataRaw = {
  type: "match_created" as const,
  sport: sport?.toLowerCase().trim() || "soccer",  // ✅ 영문 코드 사용
  // ... 기타 필드
};
```

---

## sport prop 확인

**확인 필요**: `EquipmentForm`, `RecruitForm`, `MatchForm`에 전달되는 `sport` prop이 영문 코드인지 확인

**확인 위치**: 
- `MarketWritePage.tsx` 또는 상위 컴포넌트에서 `sport` prop 전달 부분

**예상 코드**:
```typescript
<EquipmentForm 
  sport="soccer"  // ✅ 영문 코드
  // ...
/>
```

**문제 코드**:
```typescript
<EquipmentForm 
  sport="축구"  // ❌ 한글
  // ...
/>
```

---

## Firestore 저장 예

**올바른 예**:
```json
{
  "type": "equipment_created",
  "sport": "soccer",  // ✅ 영문 코드
  "title": "축구화",
  "visibility": "public",
  "createdAt": "timestamp"
}
```

**잘못된 예**:
```json
{
  "type": "equipment_created",
  "sport": "축구",  // ❌ 한글
  "title": "축구화",
  "visibility": "public",
  "createdAt": "timestamp"
}
```

---

## 홈 → Activity 연결 구조

홈에서 축구 클릭하면:

```
/activity?sport=soccer
```

이게 맞습니다.

---

## Activity 쿼리 최종 구조

**파일**: `src/features/activity/ActivityFeed.tsx`

**현재 코드** (이미 올바르게 구현됨):
```typescript
const sportParam = searchParams.get("sport");

if (sportParam) {
  activitiesConditions.push(where("sport", "==", sportParam.toLowerCase().trim()));
}
```

**상태**: ✅ 이미 올바르게 구현됨

---

## 확인 테스트 (중요)

### 1. Firestore에서 테스트용 Activity 생성

Firebase Console에서 수동으로 Activity 하나 생성:

```json
{
  "title": "테스트 축구 글",
  "type": "team_created",
  "sport": "soccer",  // ✅ 영문 코드
  "visibility": "public",
  "createdAt": "serverTimestamp()"
}
```

### 2. Activity 페이지 접속

```
/activity?sport=soccer
```

### 3. 확인

"테스트 축구 글"이 표시되어야 정상입니다.

---

## 기존 데이터 마이그레이션 (필요 시)

만약 기존 Activity 문서의 `sport` 값이 한글로 저장되어 있다면 마이그레이션 필요:

**마이그레이션 스크립트**:
```typescript
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const sportMapping: Record<string, string> = {
  "축구": "soccer",
  "야구": "baseball",
  "농구": "basketball",
  "배구": "volleyball",
  "러닝": "running",
  "배드민턴": "badminton",
  "클라이밍": "climbing",
  "수영": "swimming",
};

async function migrateActivitySports() {
  const activitiesRef = collection(db, "activities");
  const snapshot = await getDocs(activitiesRef);
  
  let updatedCount = 0;
  
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
    }
  }
  
  console.log(`✅ [Migration] 완료: ${updatedCount}개 업데이트`);
}

// 실행 (한 번만)
// migrateActivitySports().catch(console.error);
```

---

## 📋 작업 체크리스트

- [ ] Firebase Console에서 기존 Activity 문서의 `sport` 값 확인 (한글인지 영문인지)
- [ ] `EquipmentForm.tsx`: `sport` 값이 영문 코드로 저장되는지 확인
- [ ] `RecruitForm.tsx`: `sport` 값이 영문 코드로 저장되는지 확인
- [ ] `MatchForm.tsx`: `sport` 값이 영문 코드로 저장되는지 확인
- [ ] `sport` prop이 영문 코드로 전달되는지 확인
- [ ] 기존 데이터 마이그레이션 (한글이면)
- [ ] 테스트 Activity 생성 및 확인

---

## 🔥 다음 단계 (진짜 중요한 단계)

이거 끝나면 바로 해야 할 것:

1. ⏳ **Activity 상세 페이지** (`/activity/:id`)
2. ⏳ **Activity 카드 클릭 이동**
3. ⏳ **Activity 댓글**
4. ⏳ **좋아요**

이게 **YAGO 커뮤니티 핵심 기능**입니다.

---

이 수정으로 **sport 필터가 정상적으로 작동**합니다.
