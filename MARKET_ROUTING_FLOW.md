# 🔥 상품 등록 후 분배 경로 정리

## 📍 등록 경로

### 1️⃣ 통합 글쓰기 페이지 (추천)
```
/sports/:sport/market/write
```
- **컴포넌트**: `MarketWritePage`
- **카테고리**: equipment, recruit, match
- **종목 선택**: URL 파라미터에서 자동 추출

### 2️⃣ 레거시 등록 페이지
```
/market (또는 /sports/:sport/market/add)
```
- **컴포넌트**: `MarketAddPage`
- **리다이렉트**: `/sports/soccer/market`로 이동

---

## 🚀 등록 후 이동 경로

### MarketWritePage (통합 글쓰기)
```typescript
// 등록 성공 시
onSuccess(postId) {
  if (postId) {
    // ✅ 상세 페이지로 이동
    navigate(`/sports/${sport}/market/${postId}`);
  } else {
    // ✅ 목록 페이지로 이동 (fallback)
    navigate(`/sports/${sport}/market`);
  }
}
```

**예시:**
- 축구 상품 등록 → `/sports/soccer/market/abc123`
- 농구 상품 등록 → `/sports/basketball/market/xyz789`

### MarketAddPage (레거시)
```typescript
// 수정 모드
navigate(`/sports/${currentSport}/market/${id}`);

// 등록 모드
navigate(`/sports/${currentSport}/market`);
```

---

## 📊 상품이 표시되는 곳

### 1️⃣ 종목별 마켓 목록
```
/sports/:sport/market
```
- **컴포넌트**: `SportMarketPage` 또는 `MarketPage`
- **필터**: `sport` 파라미터로 자동 필터링
- **쿼리**: `where("sport", "==", sport)`

### 2️⃣ 상품 상세 페이지
```
/sports/:sport/market/:postId
```
- **컴포넌트**: `MarketPostDetailPage`
- **카테고리별 렌더링**:
  - `equipment` → `EquipmentDetail`
  - `recruit` → `RecruitDetail`
  - `match` → `MatchDetail`

### 3️⃣ 전체 마켓 (레거시)
```
/market
```
- **컴포넌트**: `MarketPage`
- **리다이렉트**: `/sports/soccer/market`로 이동

---

## 🔄 Activity Feed 자동 생성

### EquipmentForm에서 생성
```typescript
// activities 컬렉션에 자동 추가
await addDoc(collection(db, "activities"), {
  type: "equipment_created",
  refType: "market",
  refId: docRef.id,
  sport: sport,
  category: "equipment",
  // ...
});
```

### Cloud Function에서 생성
```typescript
// functions/src/market/integratedPostProcessor.ts
onMarketPostCreated → activities 컬렉션에 자동 생성
```

---

## 📋 전체 플로우 다이어그램

```
사용자 액션
    ↓
[상품 등록 버튼 클릭]
    ↓
/sports/:sport/market/write
    ↓
[폼 작성 및 제출]
    ↓
Firestore: market 컬렉션에 저장
    ↓
Firestore: activities 컬렉션에 자동 생성 (Activity Feed)
    ↓
Cloud Function: onMarketPostCreated 실행
    ↓
[등록 성공]
    ↓
/sports/:sport/market/:postId (상세 페이지)
    ↓
또는
    ↓
/sports/:sport/market (목록 페이지)
```

---

## 🎯 상품 분배 기준

### 1️⃣ Sport (종목) 기준
- **저장 필드**: `productData.sport`
- **기본값**: `"soccer"`
- **분배 경로**: `/sports/${sport}/market`

### 2️⃣ Category (카테고리) 기준
- **equipment**: 중고 장비
- **recruit**: 팀원 모집
- **match**: 경기 매칭

### 3️⃣ 표시 위치
- **종목별 목록**: `/sports/:sport/market`
- **Activity Feed**: `/sports/:sport?tab=activity`
- **전체 피드**: `/activity` (모든 종목)

---

## ⚠️ 주의사항

1. **Sport 필드 필수**: 모든 상품은 `sport` 필드가 있어야 함
2. **기본값 처리**: `sport`가 없으면 `"soccer"`로 설정
3. **URL 파라미터 우선**: `useParams()`에서 `sport` 추출
4. **Activity Feed**: `sport` 필드로 자동 필터링

---

## 🔍 확인 방법

### 상품이 올바른 경로에 표시되는지 확인:
1. `/sports/soccer/market` → 축구 상품만 표시
2. `/sports/basketball/market` → 농구 상품만 표시
3. `/sports/soccer?tab=activity` → 축구 활동 피드에 표시
4. `/activity` → 모든 종목 활동 피드에 표시
