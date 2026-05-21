# 🔥 Activity 로그 직접 생성 완료

## ✅ 완료된 작업

### 문제 원인
- `createActivityLog` 함수가 에러를 무시하고 있었음
- Activity 로그가 실제로 생성되지 않아 Activity 페이지가 비어있었음

### 해결 방법
- 모든 업로드 로직에서 `createActivityLog` 대신 직접 `addDoc` 사용
- 에러가 발생하면 `console.error`로 명확히 로깅
- `userId` 필드 추가 (호환성을 위해 `authorId`도 유지)

---

## 📝 수정된 파일

### 1. MarketAddPage.tsx
```typescript
// 등록 모드 - 통합 마켓 컬렉션 사용
const docRef = await addDoc(collection(db, "market"), productDataWithGeohash);

// 🔥 Activity 로그 자동 생성 (직접 추가 - 에러 확인 가능)
try {
  await addDoc(collection(db, "activityLogs"), {
    type: "market",
    action: "upload",
    userId: user.uid,
    authorId: user.uid, // 호환성 유지
    sport: sport || "soccer",
    title: name.trim(),
    price: priceNum || null,
    summary: priceNum ? `${priceNum.toLocaleString()}원` : undefined,
    refId: docRef.id,
    sourceId: docRef.id,
    sourceType: "market",
    category: category || DEFAULT_CATEGORY.id,
    thumbnail: imageUrl || undefined,
    createdAt: serverTimestamp(),
  });
  console.log("✅ [MarketAddPage] Activity 로그 생성 완료:", docRef.id);
} catch (err: any) {
  console.error("❌ [MarketAddPage] Activity 로그 생성 실패:", err);
}
```

### 2. EquipmentForm.tsx
```typescript
// 🔥 Activity 로그 생성 (직접 추가 - 에러 확인 가능)
try {
  const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  await addDoc(collection(db, "activityLogs"), {
    type: "market",
    action: "upload",
    userId: auth.currentUser.uid,
    authorId: auth.currentUser.uid, // 호환성 유지
    sport,
    title: title.trim(),
    price: price || null,
    summary: price ? `${price.toLocaleString()}원` : undefined,
    refId: docRef.id,
    sourceId: docRef.id,
    sourceType: "market",
    category: "equipment",
    thumbnail: imageUrls[0] || undefined,
    createdAt: serverTimestamp(),
  });
  console.log("✅ [EquipmentForm] Activity 로그 생성 완료:", docRef.id);
} catch (err: any) {
  console.error("❌ [EquipmentForm] Activity 로그 생성 실패:", err);
}
```

### 3. RecruitForm.tsx
```typescript
// 🔥 Activity 로그 생성 (직접 추가 - 에러 확인 가능)
try {
  const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  await addDoc(collection(db, "activityLogs"), {
    type: "market",
    action: "upload",
    userId: auth.currentUser.uid,
    authorId: auth.currentUser.uid, // 호환성 유지
    sport,
    title: title.trim(),
    summary: people ? `모집 인원: ${people}명` : undefined,
    refId: docRef.id,
    sourceId: docRef.id,
    sourceType: "market",
    category: "recruit",
    thumbnail: imageUrls[0] || undefined,
    createdAt: serverTimestamp(),
  });
  console.log("✅ [RecruitForm] Activity 로그 생성 완료:", docRef.id);
} catch (err: any) {
  console.error("❌ [RecruitForm] Activity 로그 생성 실패:", err);
}
```

### 4. MatchForm.tsx
```typescript
// 🔥 Activity 로그 생성 (직접 추가 - 에러 확인 가능)
try {
  const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase");
  await addDoc(collection(db, "activityLogs"), {
    type: "market",
    action: "upload",
    userId: auth.currentUser.uid,
    authorId: auth.currentUser.uid, // 호환성 유지
    sport,
    title: title.trim(),
    summary: matchType ? `${matchType} 매칭` : undefined,
    refId: docRef.id,
    sourceId: docRef.id,
    sourceType: "market",
    category: "match",
    thumbnail: imageUrls[0] || undefined,
    createdAt: serverTimestamp(),
  });
  console.log("✅ [MatchForm] Activity 로그 생성 완료:", docRef.id);
} catch (err: any) {
  console.error("❌ [MatchForm] Activity 로그 생성 실패:", err);
}
```

### 5. ActivityFeed.tsx
```typescript
// 🔥 activityLogs 컬렉션에서 사용자별 Activity 조회
const conditions: any[] = [
  where("userId", "==", user.uid) // userId 필드로 필터링
];

// 🔥 sport 필터 추가
if (sport) {
  conditions.push(where("sport", "==", sport));
}

// 🔥 type 필터 추가 (market, team, event)
if (filter !== "all") {
  conditions.push(where("type", "==", filter));
}

// 🔥 정렬 및 제한 추가
conditions.push(orderBy("createdAt", "desc"));
conditions.push(limit(10));

// 🔥 쿼리 구성: activityLogs 컬렉션 사용
const q = query(
  collection(db, "activityLogs"),
  ...conditions
);
```

### 6. ActivityCard.tsx
```typescript
// 아이콘 변경
const iconMap: Record<string, string> = {
  market: "🛍", // 🛒에서 🛍로 변경
  team: "👥",
  event: "📅",
  join: "✅",
  comment: "💬",
};
```

---

## 🎯 결과

### ✅ Activity 로그 자동 생성
- 상품 업로드 성공 시 `activityLogs` 컬렉션에 자동으로 로그 생성
- 에러 발생 시 `console.error`로 명확히 로깅

### ✅ Activity 피드 표시
- ActivityFeed가 `activityLogs` 컬렉션에서 조회
- `userId` 필드로 사용자별 필터링
- `type`, `sport` 필터 지원

### ✅ 에러 확인 가능
- 직접 `addDoc` 사용으로 에러 발생 시 즉시 확인 가능
- Firestore Rules 문제나 네트워크 오류 등 즉시 파악 가능

---

## 📊 activityLogs 컬렉션 문서 구조

```typescript
{
  type: "market",
  action: "upload",
  userId: string,        // 사용자 ID (필터링용)
  authorId: string,     // 호환성 유지
  sport: string,
  title: string,
  price: number | null,
  summary: string | undefined,
  refId: string,        // market 문서 ID
  sourceId: string,     // market 문서 ID
  sourceType: "market",
  category: string,     // "equipment" | "recruit" | "match"
  thumbnail: string | undefined,
  createdAt: Timestamp,
}
```

---

## 🔄 데이터 흐름

1. **상품 업로드**
   ```
   MarketAddPage / EquipmentForm / RecruitForm / MatchForm
   → addDoc(collection(db, "market"), productData)
   → addDoc(collection(db, "activityLogs"), activityData)
   ```

2. **Activity 피드 조회**
   ```
   ActivityFeed
   → query(collection(db, "activityLogs"), where("userId", "==", user.uid))
   → ActivityCard로 표시
   ```

3. **Activity 카드 클릭**
   ```
   ActivityCard
   → item.type === "market"
   → navigate(`/market/${sourceId}`)
   ```

---

## ✅ 완료

모든 업로드 로직에서 Activity 로그가 직접 생성되도록 수정했습니다:
- ✅ MarketAddPage
- ✅ EquipmentForm
- ✅ RecruitForm
- ✅ MatchForm
- ✅ ActivityFeed (activityLogs 조회)
- ✅ ActivityCard (market 타입 처리)

이제 상품 업로드 시 Activity 로그가 정상적으로 생성되고, Activity 페이지에 표시됩니다.
