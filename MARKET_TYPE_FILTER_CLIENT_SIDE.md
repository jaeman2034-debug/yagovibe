# 🔥 MarketPage type 필터 클라이언트 사이드로 이동

## 🚨 문제 원인

**콘솔 로그:**
```
✅ [MarketPage] Firestore 응답: 0개 문서
```

**원인:**
- Firestore 쿼리에서 `where("type", "==", "used")` 필터 사용
- 하지만 기존 데이터에는 `type` 필드가 없음
- 쿼리 조건과 데이터 불일치로 0개 반환

---

## ✅ 해결 방법

### type 필터를 클라이언트 사이드로 이동

**변경 전:**
```typescript
// Firestore 쿼리에서 type 필터링
baseQuery = query(
  collection(db, "market"),
  where("sport", "==", normalizedSport),
  where("type", "==", normalizedType)  // ❌ 기존 데이터에 없으면 0개 반환
);
```

**변경 후:**
```typescript
// Firestore 쿼리에서는 sport만 필터링
baseQuery = query(
  collection(db, "market"),
  where("sport", "==", normalizedSport)  // ✅ sport만 필터링
);

// 클라이언트 사이드에서 type 필터링
raw = raw.filter((p) => {
  const pType = (p as any).type;
  // type 필드가 없으면 기본적으로 "used"로 간주 (기존 데이터 호환)
  if (!pType) {
    return marketType === "used";
  }
  return pType.toLowerCase() === normalizedType;
});
```

---

## 📝 수정된 위치

### 1. 메인 쿼리 (라인 560, 567)
- `where("type", "==", normalizedType)` 제거
- 클라이언트 사이드 필터링 추가 (라인 687 이후)

### 2. AI 추천 쿼리 (라인 360)
- `where("type", "==", normalizedType)` 제거
- 클라이언트 사이드 필터링 추가 (라인 381 이후)

### 3. Fallback 쿼리 (라인 473)
- `where("type", "==", normalizedType)` 제거
- 클라이언트 사이드 필터링 추가 (라인 484 이후)

### 4. AI 검색 쿼리 (라인 837)
- `where("type", "==", normalizedType)` 제거
- 클라이언트 사이드 필터링 추가 (라인 849 이후)

---

## 🎯 기존 데이터 호환 로직

### type 필드가 없는 경우

```typescript
// type 필드가 없으면 기본적으로 "used"로 간주
if (!pType) {
  return marketType === "used"; // 기존 데이터는 모두 "used"로 간주
}
```

**의미:**
- 기존 데이터는 모두 "중고거래"로 간주
- "나눔" 또는 "유실물" 탭에서는 기존 데이터가 표시되지 않음
- 새로 등록하는 데이터부터 `type` 필드가 저장됨

---

## 🚀 예상 결과

### 정상 동작 시

- ✅ 기존 데이터가 "중고거래" 탭에 표시됨
- ✅ 새로 등록한 데이터는 `type` 필드가 있어 정확히 필터링됨
- ✅ Firestore 쿼리가 정상적으로 작동함
- ✅ 0개 문서 문제 해결

---

## 📊 데이터 구조

### 기존 데이터 (type 필드 없음)
```typescript
{
  sport: "soccer",
  category: "equipment",
  // type 필드 없음
}
```

### 새 데이터 (type 필드 있음)
```typescript
{
  sport: "soccer",
  category: "equipment",
  type: "used",  // ✅ 새로 추가됨
}
```

---

## ✅ 완료

모든 쿼리에서 `type` 필터를 제거하고 클라이언트 사이드 필터링으로 변경했습니다. 이제 기존 데이터도 정상적으로 표시됩니다.
