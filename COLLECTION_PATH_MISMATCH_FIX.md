# 🔥 컬렉션 경로 불일치 문제 해결

## 🚨 문제 상황

Firebase Console에서 `market` 컬렉션이 정상적으로 표시되지만, 앱에서는 데이터가 보이지 않습니다.

## 🎯 원인 분석

### 컬렉션 경로 불일치

**읽기 경로 (MarketPage.tsx):**
```typescript
collection(db, "sports", normalizedSport, "marketPosts")
// 경로: sports/soccer/marketPosts
```

**저장 경로 (MarketAddPage.tsx, EquipmentForm.tsx 등):**
```typescript
collection(db, "market")
// 경로: market
```

**결과:**
- 데이터는 `market` 컬렉션에 저장됨
- 하지만 `MarketPage`는 `sports/{sport}/marketPosts`에서 읽으려고 함
- 경로가 다르므로 데이터를 찾을 수 없음

---

## ✅ 해결 방법

### 방법 1: MarketPage 쿼리 경로 수정 (권장)

`MarketPage.tsx`의 모든 쿼리를 `market` 컬렉션으로 변경:

```typescript
// 변경 전
collection(db, "sports", normalizedSport, "marketPosts")

// 변경 후
collection(db, "market")
```

그리고 `sport` 필터는 `where` 절로 적용:

```typescript
query(
  collection(db, "market"),
  where("sport", "==", normalizedSport),
  where("type", "==", normalizedType)
)
```

### 방법 2: 저장 경로를 `sports/{sport}/marketPosts`로 변경

모든 저장 로직을 `sports/{sport}/marketPosts` 경로로 변경:

```typescript
// 변경 전
collection(db, "market")

// 변경 후
collection(db, "sports", sport, "marketPosts")
```

---

## 🎯 권장 해결책

**방법 1을 권장합니다** (MarketPage 쿼리 수정):

**이유:**
1. 이미 `market` 컬렉션에 데이터가 있음
2. Firebase Console에서도 `market` 컬렉션이 정상 표시됨
3. 다른 코드들도 `market` 컬렉션을 사용 중
4. 변경 범위가 작음 (MarketPage만 수정)

---

## 📝 수정 필요 파일

### MarketPage.tsx
- 라인 360: `collection(db, "sports", normalizedSport, "marketPosts")` → `collection(db, "market")`
- 라인 472: 동일
- 라인 558: 동일
- 라인 564: 동일
- 라인 833: 동일

그리고 `where("sport", "==", normalizedSport)` 조건 추가

---

## 🚀 적용 후 확인

1. Market 페이지 접속
2. 상품 목록이 정상적으로 표시되는지 확인
3. Firebase Console의 `market` 컬렉션과 일치하는지 확인
