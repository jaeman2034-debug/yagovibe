# 🔥 Cursor 개발자: Activity 필터 문제 진단 및 수정 지시문

## ❌ 현재 상태 (조건 불일치)

### 스크린샷 분석 결과

| 탭 | 예상 결과 | 실제 결과 | 상태 |
|---|----------|----------|------|
| **전체** (`?sport=soccer`) | "공공공", "야고 축구 FC" 모두 표시 | "활동이 없습니다" | ❌ |
| **거래** (`?sport=soccer`) | "공공공"만 표시 | "활동이 없습니다" | ❌ |
| **팀** (`?sport=soccer`) | "야고 축구 FC" 표시 | "야고 축구 FC" 표시됨 | ✅ |

---

## 🔍 문제 원인

### 1️⃣ sport 필터가 모든 탭에 적용됨

**현재 코드**:
```typescript
// sport 필터 추가 (선택사항)
if (sport) {
  activitiesConditions.push(where("sport", "==", sport.toLowerCase().trim()));
}
```

**문제**:
- URL에 `?sport=soccer`가 있으면 모든 탭에서 soccer만 조회
- "공공공"이 배구(volleyball) 글이라면 soccer 필터에서 제외됨 (정상)
- 하지만 "야고 축구 FC"는 축구 글인데 전체 탭에서도 안 보임 (비정상)

---

### 2️⃣ 가능한 원인들

#### 원인 A: Activity 데이터의 sport 값 불일치

**확인 필요**:
- "야고 축구 FC" Activity의 실제 `sport` 값
- `sport="soccer"`로 저장되었는지 확인

#### 원인 B: Firestore 인덱스 문제

**확인 필요**:
- 복합 인덱스가 없어서 쿼리 실패
- 콘솔에 인덱스 에러 확인

#### 원인 C: 쿼리 조건 충돌

**확인 필요**:
- `type != "system"` + `sport == "soccer"` 조건이 올바르게 작동하는지
- Firestore에서 실제 조회되는지

---

## 🛠 수정 방안

### 옵션 1: 전체 탭에서 sport 필터 제거 (UX 개선)

전체 탭에서는 모든 종목을 표시하도록 수정:

```typescript
// 🔥 sport 필터 추가 (전체 탭에서는 제외)
if (sport && activeFilter !== "all" && activeFilter !== "전체") {
  activitiesConditions.push(where("sport", "==", sport.toLowerCase().trim()));
}
```

**효과**:
- 전체 탭: 모든 종목 표시 (sport 필터 없음)
- 거래/팀/이벤트 탭: sport 필터 적용

---

### 옵션 2: Activity 데이터 확인 및 수정 (데이터 문제 해결)

**확인 사항**:
1. "야고 축구 FC" Activity의 `sport` 값
2. Activity 생성 시 `sport` 값이 올바르게 저장되었는지

**수정 필요 시**:
- Activity 생성 코드에서 `sport` 값을 명시적으로 설정
- 기존 Activity 데이터의 `sport` 값 수정

---

### 옵션 3: 쿼리 로직 개선 (현재 구조 유지)

현재 필터 로직은 올바르지만, 데이터나 인덱스 문제일 수 있음.

**확인 필요**:
- 브라우저 콘솔에서 쿼리 결과 로그 확인
- Firestore에서 실제 데이터 확인

---

## 📋 즉시 확인할 것

### 1. 브라우저 콘솔 확인

다음 로그를 확인:
```
🔥 [ActivityFeed] query results: {
  queryConditions: ...,
  sportFilter: "soccer",
  typeFilter: "all",
  resultCount: 0  // ← 이게 0이면 데이터 없음
}
```

### 2. Firestore 데이터 확인

Firebase Console에서:
```
activities 컬렉션
- sport == "soccer" AND type == "recruit_created" → "야고 축구 FC" 있는지
- sport == "soccer" AND type == "equipment_created" → "공공공" 있는지 (없을 수 있음, 배구 글이라면)
```

### 3. Activity 생성 코드 확인

- `RecruitForm.tsx`: `sport: sport?.toLowerCase().trim() || "soccer"`
- `EquipmentForm.tsx`: `sport: sport?.toLowerCase().trim() || "soccer"`

**확인**: `sport` 파라미터가 올바르게 전달되는지

---

## 💡 권장 수정 (옵션 1)

전체 탭에서는 sport 필터를 제거하여 모든 종목을 표시:

```typescript
// 🔥 sport 필터 추가 (전체 탭에서는 제외)
if (sport && activeFilter !== "all" && activeFilter !== "전체") {
  activitiesConditions.push(where("sport", "==", sport.toLowerCase().trim()));
}
```

**효과**:
- 전체 탭: 모든 종목 표시 (sport 필터 없음)
- 거래 탭: `sport=soccer` + `type=equipment_created` 필터 적용
- 팀 탭: `sport=soccer` + `type in [team_created, recruit_created]` 필터 적용

---

이 분석을 바탕으로 **실제 데이터와 쿼리 결과를 확인**한 후 수정 방안을 선택하세요.
