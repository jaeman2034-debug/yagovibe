# Cursor 수정 지시문

## 문제

Firestore `activities` 컬렉션에서 `sport` 값이 **두 가지로 섞여 있습니다**.

### 현재 Firestore 상태

**문서 1**:
```json
{
  "sport": "soccer"  // ✅ 영문 코드
}
```

**문서 2**:
```json
{
  "sport": "축구"  // ❌ 한글
}
```

**문제**: DB에 `soccer`와 `축구` 두 가지 값이 동시에 존재합니다.

그래서 쿼리:
```typescript
where("sport", "==", "soccer")
```

하면 `sport: "축구"` 문서는 **절대 조회되지 않습니다.**

---

## 해결 방법

DB `sport` 값을 **하나로 통일**합니다.

**추천**: `soccer` (영문 코드)

---

## 수정 방법

### 1️⃣ DB 수정 (빠른 방법)

**Firestore Console에서 직접 수정**:

1. Firebase Console → Firestore Database → `activities` 컬렉션
2. `sport: "축구"`인 문서 찾기
3. `sport` 필드를 `"soccer"`로 수정

**또는 마이그레이션 스크립트 사용** (아래 참고)

---

### 2️⃣ 앞으로 저장 규칙 (중요)

**Activity 생성 시 sport 값은 영문 코드로 저장**

❌ **이렇게 저장하면 안됨**:
```typescript
sport: "축구"
```

✅ **이렇게 저장**:
```typescript
sport: "soccer"
```

---

## 추천 sport 코드 표 (YAGO 표준)

```
soccer        (축구)
baseball      (야구)
basketball    (농구)
volleyball    (배구)
running       (러닝)
badminton     (배드민턴)
climbing      (클라이밍)
swimming      (수영)
tennis        (테니스)
golf          (골프)
cycling       (사이클)
```

---

## Activity 생성 코드 수정

### EquipmentForm.tsx

**파일**: `src/features/market/components/forms/EquipmentForm.tsx`

**위치**: Activity 생성 부분 (약 414줄)

**확인 및 수정**:
```typescript
const activityDataRaw = {
  type: "equipment_created" as const,
  sport: sport?.toLowerCase().trim() || "soccer",  // ✅ 영문 코드만 사용
  // ... 기타 필드
};
```

**확인 사항**: `sport` prop이 영문 코드로 전달되는지 확인

---

### RecruitForm.tsx

**파일**: `src/features/market/components/forms/RecruitForm.tsx`

**위치**: Activity 생성 부분 (약 232줄)

**확인 및 수정**:
```typescript
const activityDataRaw = {
  type: "recruit_created" as const,
  sport: sport?.toLowerCase().trim() || "soccer",  // ✅ 영문 코드만 사용
  // ... 기타 필드
};
```

---

### MatchForm.tsx

**파일**: `src/features/market/components/forms/MatchForm.tsx`

**위치**: Activity 생성 부분 (약 254줄)

**확인 및 수정**:
```typescript
const activityDataRaw = {
  type: "match_created" as const,
  sport: sport?.toLowerCase().trim() || "soccer",  // ✅ 영문 코드만 사용
  // ... 기타 필드
};
```

---

## 기존 데이터 마이그레이션 스크립트

**파일**: `scripts/migrateActivitySports.ts` (새로 생성)

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
  "테니스": "tennis",
  "골프": "golf",
  "사이클": "cycling",
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
    } else if (currentSport && typeof currentSport === "string") {
      // 이미 영문 코드이거나 알 수 없는 값은 스킵
      console.log(`⏭️ [Migration] Activity ${activityDoc.id} 스킵: ${currentSport}`);
      skippedCount++;
    }
  }
  
  console.log(`✅ [Migration] 완료: ${updatedCount}개 업데이트, ${skippedCount}개 스킵`);
}

// 실행 (한 번만)
// migrateActivitySports().catch(console.error);
```

---

## 수정 후 정상 결과

### `/activity?sport=soccer`

**결과**:
```
야고 축구 FC (recruit_created)
소홀 (team_created)
축구화 (equipment_created)
```

같은 **축구 관련 Activity만 출력** ✅

---

## 개발 팁

sport 필터는 나중에 이렇게도 확장 가능:

```
/activity?sport=soccer&type=team
```

즉:
```
축구 + 팀 모집
```

같이 필터 가능합니다.

---

## 📋 작업 체크리스트

- [ ] Firebase Console에서 `sport: "축구"`인 문서 찾기
- [ ] 수동으로 `sport: "soccer"`로 수정 또는 마이그레이션 스크립트 실행
- [ ] `EquipmentForm.tsx`: `sport` 값이 영문 코드로 저장되는지 확인
- [ ] `RecruitForm.tsx`: `sport` 값이 영문 코드로 저장되는지 확인
- [ ] `MatchForm.tsx`: `sport` 값이 영문 코드로 저장되는지 확인
- [ ] `/activity?sport=soccer` 접속 시 모든 축구 Activity 표시 확인

---

## 🔥 다음 단계 (진짜 중요한 기능)

이거 끝나면 바로 해야 할 것:

1. ⏳ **Activity 카드 클릭** (`/activity/:id` 상세 페이지)
2. ⏳ **Activity 댓글**
3. ⏳ **Activity 좋아요**
4. ⏳ **Activity 실시간 피드**

---

이 수정으로 **sport 필터가 정상적으로 작동**합니다.
