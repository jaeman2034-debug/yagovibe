# 🔥 Cursor 개발자: Activity 필터 동작 분석

## 📋 현재 화면 상태

### 스크린샷 분석 결과

1. **전체 탭** (`?sport=soccer`):
   - "활동이 없습니다" 표시
   - 예상: "공공공", "야고 축구 FC" 모두 표시되어야 함
   - ❌ **조건 불일치**

2. **거래 탭** (`?sport=soccer`):
   - "활동이 없습니다" 표시
   - 예상: "공공공" (equipment_created)만 표시되어야 함
   - ❌ **조건 불일치**

3. **팀 탭** (`?sport=soccer`):
   - "야고 축구 FC" 표시됨
   - 예상: "야고 축구 FC" (recruit_created) 표시
   - ✅ **조건 일치**

---

## 🔍 문제 원인 분석

### 가능성 1: sport 필터 문제

**현재 URL**: `?sport=soccer`

**문제**:
- "공공공"은 배구(volleyball) 글일 가능성 높음
- `sport=soccer` 필터 때문에 배구 글이 제외됨
- 전체 탭에서도 sport 필터가 적용되어 모든 종목이 아닌 soccer만 조회

**확인 필요**:
- "공공공" 글의 실제 `sport` 값 확인
- Activity 생성 시 `sport` 값이 올바르게 저장되었는지 확인

---

### 가능성 2: Activity 데이터 없음

**문제**:
- `activities` 컬렉션에 해당 조건에 맞는 데이터가 없을 수 있음
- `sport=soccer` + `type=equipment_created` 조건에 맞는 데이터 없음

**확인 필요**:
- Firestore `activities` 컬렉션에서 다음 조건 확인:
  - `sport == "soccer"` AND `type == "equipment_created"`
  - `sport == "soccer"` AND `type == "recruit_created"`

---

### 가능성 3: 인덱스 문제

**문제**:
- Firestore 복합 인덱스가 없어서 쿼리 실패
- 콘솔에 인덱스 에러가 있을 수 있음

**확인 필요**:
- 브라우저 콘솔에서 인덱스 관련 에러 확인
- Firebase Console에서 인덱스 생성 상태 확인

---

## 🛠 수정 방안

### 옵션 1: 전체 탭에서 sport 필터 제거 (권장하지 않음)

전체 탭에서는 sport 필터를 적용하지 않도록 수정:

```typescript
// 전체 탭에서는 sport 필터 제거
if (sport && activeFilter !== "all") {
  activitiesConditions.push(where("sport", "==", sport.toLowerCase().trim()));
}
```

**단점**: URL에 `?sport=soccer`가 있어도 전체 탭에서는 모든 종목이 표시됨 (UX 혼란)

---

### 옵션 2: Activity 데이터 확인 및 수정 (권장)

**확인 사항**:
1. "공공공" 글의 실제 `sport` 값
2. Activity 생성 시 `sport` 값이 올바르게 저장되었는지

**수정 필요 시**:
- Activity 생성 코드에서 `sport` 값을 `post.sport`로 명시적으로 설정
- 기존 Activity 데이터의 `sport` 값 수정

---

### 옵션 3: 필터 로직 개선 (현재 구조 유지)

현재 필터 로직은 올바르게 구현되어 있습니다:

```typescript
// 거래 탭: equipment_created만
if (activeFilter === "market") {
  activitiesConditions.push(where("type", "==", "equipment_created"));
}

// 팀 탭: team_created + recruit_created
if (activeFilter === "team") {
  activitiesConditions.push(where("type", "in", ["team_created", "recruit_created"]));
}

// 전체 탭: system 제외
else {
  activitiesConditions.push(where("type", "!=", "system"));
}

// sport 필터: URL 파라미터가 있으면 적용
if (sport) {
  activitiesConditions.push(where("sport", "==", sport.toLowerCase().trim()));
}
```

**문제**: 데이터가 없거나 sport 값이 잘못 저장됨

---

## 📋 확인 체크리스트

### 1. Firestore 데이터 확인

```javascript
// 브라우저 콘솔에서 실행
// 1. "공공공" 글의 sport 값 확인
db.collection("activities")
  .where("title", "==", "공공공")
  .get()
  .then(snap => {
    snap.docs.forEach(doc => {
      console.log("공공공 activity:", {
        id: doc.id,
        sport: doc.data().sport,
        type: doc.data().type,
        category: doc.data().category
      });
    });
  });

// 2. "야고 축구 FC" 글의 sport 값 확인
db.collection("activities")
  .where("title", "==", "야고 축구 FC")
  .get()
  .then(snap => {
    snap.docs.forEach(doc => {
      console.log("야고 축구 FC activity:", {
        id: doc.id,
        sport: doc.data().sport,
        type: doc.data().type,
        category: doc.data().category
      });
    });
  });
```

### 2. Activity 생성 코드 확인

- `EquipmentForm.tsx`: `sport: sport?.toLowerCase().trim() || "soccer"`
- `RecruitForm.tsx`: `sport: sport?.toLowerCase().trim() || "soccer"`

**확인**: `sport` 파라미터가 올바르게 전달되는지

### 3. 콘솔 에러 확인

- 브라우저 콘솔에서 Firestore 인덱스 에러 확인
- 쿼리 실패 에러 확인

---

## 🎯 예상 원인

**가장 가능성 높은 원인**:

1. **"공공공"은 배구(volleyball) 글**
   - `sport=volleyball`로 저장됨
   - `?sport=soccer` 필터 때문에 제외됨
   - **정상 동작** (soccer 필터에서 volleyball 글은 안 보임)

2. **"야고 축구 FC"는 축구(soccer) 글**
   - `sport=soccer`로 저장됨
   - 팀 탭에서 정상 표시됨 ✅
   - 전체 탭에서도 표시되어야 함 (현재 안 보임)

3. **전체 탭에서 "야고 축구 FC"가 안 보이는 이유**
   - 쿼리 조건 문제
   - 데이터 없음
   - 인덱스 문제

---

## 💡 해결 방법

### 즉시 확인할 것

1. **브라우저 콘솔 확인**:
   - ActivityFeed 쿼리 결과 로그 확인
   - 에러 메시지 확인

2. **Firestore 데이터 확인**:
   - `activities` 컬렉션에서 실제 데이터 확인
   - `sport`, `type` 값 확인

3. **URL 파라미터 확인**:
   - `?sport=soccer`가 올바르게 전달되는지
   - 전체 탭에서도 sport 필터가 적용되는지 (의도된 동작인지)

---

이 분석을 바탕으로 **실제 데이터와 쿼리 결과를 확인**해야 정확한 원인을 파악할 수 있습니다.
