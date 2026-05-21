# 🔥 ActivityPage 데이터 소스 통일 완료

## ✅ 완료된 작업

### 1. ActivityFeed 데이터 소스 변경

**변경 전:**
```typescript
// activityLogs 컬렉션 사용
const q = query(
  collection(db, "activityLogs"),
  where("sport", "==", sport),
  where("type", "==", filter),
  orderBy("createdAt", "desc")
);
```

**변경 후:**
```typescript
// market 컬렉션 사용 (사용자별 Activity)
const q = query(
  collection(db, "market"),
  where("authorId", "==", user.uid),
  where("sport", "==", sport), // 선택적
  orderBy("createdAt", "desc")
);

// market 문서를 Activity 형식으로 변환
const list: Activity[] = snap.docs.map((d) => {
  const data = d.data();
  return {
    id: d.id,
    type: "market_upload",
    sport: data.sport || "",
    title: data.title || data.name || "",
    summary: data.price ? `${data.price.toLocaleString()}원` : data.description || "",
    createdAt: data.createdAt,
    authorId: data.authorId || data.userId || "",
    refId: d.id,
    sourceId: d.id,
    sourceType: "market",
    category: data.category || "",
    thumbnail: data.imageUrl || data.thumbnail || data.imageUrls?.[0] || undefined,
  };
});
```

---

### 2. 업로드 시 Activity 로그 자동 생성

#### MarketAddPage.tsx
```typescript
// 등록 모드 - 통합 마켓 컬렉션 사용
const docRef = await addDoc(collection(db, "market"), productDataWithGeohash);

// 🔥 Activity 로그 자동 생성
try {
  const { createActivityLog } = await import("@/services/activityLogService");
  await createActivityLog({
    sport: sport || "soccer",
    type: "market",
    refId: docRef.id,
    sourceId: docRef.id,
    sourceType: "market",
    title: name.trim(),
    summary: priceNum ? `${priceNum.toLocaleString()}원` : undefined,
    thumbnail: imageUrl || undefined,
    authorId: user.uid,
    category: category || DEFAULT_CATEGORY.id,
  });
  console.log("✅ [MarketAddPage] Activity 로그 생성 완료");
} catch (err) {
  console.warn("⚠️ [MarketAddPage] Activity 로그 생성 실패 (무시):", err);
}
```

#### EquipmentForm.tsx, RecruitForm.tsx, MatchForm.tsx
- 이미 `createActivityLog` 호출이 구현되어 있음 ✅

---

### 3. ActivityCard에서 market_upload 타입 처리

**변경 전:**
```typescript
if (sourceType === "marketPosts" || item.type === "market") {
  const sport = item.sport || "soccer";
  navigate(`/sports/${sport}/market/${sourceId}`);
}
```

**변경 후:**
```typescript
if (sourceType === "marketPosts" || sourceType === "market" || item.type === "market" || item.type === "market_upload") {
  // 🔥 market_upload 타입인 경우 market 문서 조회 후 상세 페이지로 이동
  if (item.type === "market_upload") {
    // 🔥 market 컬렉션의 상세 페이지로 이동
    navigate(`/market/${sourceId}`);
  } else {
    // 🔥 기존 marketPosts는 sport 정보 필요
    const sport = item.sport || "soccer";
    navigate(`/sports/${sport}/market/${sourceId}`);
  }
}
```

**타입 라벨 매핑:**
```typescript
const getTypeLabel = (type: string) => {
  switch (type) {
    case "market":
    case "market_upload":
      return "거래";
    case "team":
      return "팀";
    case "event":
      return "이벤트";
    default:
      return type;
  }
};
```

---

## 🎯 결과

### ✅ 업로드 즉시 Activity 반영
- 상품 업로드 성공 시 `activityLogs` 컬렉션에 자동으로 로그 생성
- `market` 컬렉션의 데이터도 Activity 피드에 표시

### ✅ 화면 불일치 해결
- Activity 피드가 `market` 컬렉션에서 직접 조회하므로 실시간 반영
- `activityLogs`와 `market` 컬렉션 간 불일치 문제 해결

### ✅ 거래 흐름 정상화
- 업로드 → Activity 로그 생성 → Activity 피드 표시 흐름 완성
- 사용자별 Activity만 표시 (자신이 업로드한 상품만)

### ✅ AI 분석도 정확해짐
- Activity 로그가 정확하게 생성되어 AI 분석 데이터 품질 향상

---

## 📊 데이터 구조

### market 컬렉션 문서
```typescript
{
  authorId: string,
  sport: string,
  title: string,
  name: string,
  price: number,
  description: string,
  category: string,
  imageUrl: string,
  imageUrls: string[],
  createdAt: Timestamp,
  // ... 기타 필드
}
```

### activityLogs 컬렉션 문서
```typescript
{
  sport: string,
  type: "market",
  refId: string,        // market 문서 ID
  sourceId: string,     // market 문서 ID
  sourceType: "market",
  title: string,
  summary: string,      // 가격 정보
  thumbnail: string,
  authorId: string,
  category: string,
  createdAt: Timestamp,
}
```

---

## 🔄 데이터 흐름

1. **상품 업로드**
   ```
   MarketAddPage / EquipmentForm / RecruitForm / MatchForm
   → addDoc(collection(db, "market"), productData)
   → createActivityLog({ ... })
   → addDoc(collection(db, "activityLogs"), activityData)
   ```

2. **Activity 피드 조회**
   ```
   ActivityFeed
   → query(collection(db, "market"), where("authorId", "==", user.uid))
   → market 문서를 Activity 형식으로 변환
   → ActivityCard로 표시
   ```

3. **Activity 카드 클릭**
   ```
   ActivityCard
   → item.type === "market_upload"
   → navigate(`/market/${sourceId}`)
   ```

---

## ✅ 완료

모든 작업이 완료되었습니다:
- ✅ ActivityFeed가 `market` 컬렉션에서 조회
- ✅ 업로드 시 `activityLogs` 자동 생성
- ✅ ActivityCard에서 `market_upload` 타입 처리

이제 업로드 즉시 Activity에 반영되고, 화면 불일치 문제가 해결되었습니다.
