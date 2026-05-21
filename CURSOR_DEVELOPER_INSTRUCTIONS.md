# 📌 Cursor 개발자 수정 지시문 (그대로 전달용)

## ✅ 이미 완료된 수정사항

다음 항목은 이미 수정 완료되었습니다:
- ✅ MarketPage handleAISearch 초기화 순서 문제 (함수 상단 이동 완료)
- ✅ ActivityFeed 무한루프 문제 (lastDoc ref 관리로 해결 완료)
- ✅ ActivityFeed 쿼리 구조 안정화 (인덱스 에러 처리 강화 완료)

---

## 🔴 추가 수정 필요 항목

### 1️⃣ ActivityFeed 데이터 표시 문제 수정

#### 현재 상황
- ActivityFeed는 `type` 필드로 필터링 중 (`type === "market"`)
- 저장 시 `sourceType: "market"`로 저장됨
- **문제**: 쿼리와 저장 구조가 일치하지만 데이터가 안 보임

#### 확인 필요
Firestore 콘솔에서 실제 activityLogs 문서 확인:
- `type` 필드가 `"market"`인지 확인
- `authorId` 필드가 현재 사용자 UID와 일치하는지 확인
- `createdAt` 필드가 존재하는지 확인

#### 수정 지시 (필요 시)

**ActivityFeed.tsx** - 쿼리 조건 확인 및 디버깅 강화:

```typescript
// 67-92줄 수정
const conditions: any[] = [
  where("authorId", "==", user.uid)
];

// type 필터는 선택적 (filter !== "all"일 때만)
if (filter !== "all") {
  conditions.push(where("type", "==", filter));
}

// 🔥 디버깅: 쿼리 실행 전 로그 추가
console.log("🔍 [ActivityFeed] 쿼리 조건:", {
  authorId: user.uid,
  filter,
  sport,
  conditionsCount: conditions.length
});

const q = query(
  collection(db, "activityLogs"),
  ...conditions
);

const snap = await getDocs(q);

// 🔥 디버깅: 결과 확인
console.log("✅ [ActivityFeed] 쿼리 결과:", {
  totalDocs: snap.size,
  firstDoc: snap.docs[0]?.data() || null
});
```

---

### 2️⃣ ActivityLog 저장 구조 검증

#### 현재 저장 구조 (이미 올바름)

**RecruitForm.tsx, EquipmentForm.tsx, MatchForm.tsx** 모두 동일:

```typescript
const activityLogData = {
  type: "market",           // ✅ ActivityFeed 필터링용
  action: "upload",
  userId: auth.currentUser.uid,
  authorId: auth.currentUser.uid,  // ✅ ActivityFeed 쿼리용
  sport,
  title: title.trim(),
  summary: summaryText,
  refId: docRef.id,
  sourceId: docRef.id,
  sourceType: "market",    // ✅ 참고용 (현재 쿼리에서 미사용)
  category: "recruit" | "equipment" | "match",
  thumbnail: imageUrls[0] || undefined,
  createdAt: serverTimestamp(),
};
```

#### 확인 사항
- ✅ `authorId` 필드 존재 (ActivityFeed 쿼리에서 사용)
- ✅ `type: "market"` 필드 존재 (필터링용)
- ✅ `createdAt` 필드 존재 (정렬용)

---

### 3️⃣ Firestore 인덱스 생성 (필수)

#### 현재 상태
`firestore.indexes.json`에 다음 인덱스가 추가되어 있음:

```json
{
  "collectionGroup": "activityLogs",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "authorId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

#### 배포 필요
```bash
firebase deploy --only firestore:indexes
```

또는 Firebase Console에서 수동 생성:
1. Firebase Console → Firestore → Indexes
2. "인덱스 만들기" 클릭
3. 컬렉션: `activityLogs`
4. 필드:
   - `authorId` → 오름차순
   - `createdAt` → 내림차순
5. "만들기" 클릭 후 1~3분 대기

---

## 📋 최종 확인 체크리스트

개발자는 아래 항목 전부 확인할 것:

- [x] MarketPage handleAISearch 함수 위치 상단 이동 (완료)
- [x] ActivityFeed loadMore useCallback 적용 (완료)
- [x] ActivityFeed lastDoc ref 관리 (완료)
- [x] ActivityFeed observer useEffect dependency 최소화 (완료)
- [x] activityLogs 저장 구조 통일 (완료)
- [ ] **Firestore 인덱스 배포** (필수)
- [ ] ActivityFeed 쿼리 결과 디버깅 로그 확인

---

## 📌 수정 완료 후 기대 결과

- ✅ Activity 페이지 정상 출력
- ✅ 무한루프 완전 제거
- ✅ Market 페이지 오류 제거
- ✅ 업로드 즉시 Activity 반영

---

## 🔍 문제 해결 순서

1. **Firestore 인덱스 배포** (가장 우선)
   ```bash
   firebase deploy --only firestore:indexes
   ```

2. **ActivityFeed 디버깅 로그 추가** (위 코드 참조)

3. **브라우저 콘솔 확인**
   - 쿼리 조건 로그 확인
   - 쿼리 결과 로그 확인
   - 실제 문서 데이터 확인

4. **Firestore 콘솔에서 직접 확인**
   - `activityLogs` 컬렉션 열기
   - `authorId`가 현재 사용자 UID인 문서 확인
   - `type` 필드가 `"market"`인지 확인

---

## ⚠️ 주의사항

- `sourceType`은 현재 쿼리에서 사용하지 않음 (참고용 필드)
- 실제 필터링은 `type` 필드로 수행됨
- `authorId` 필드가 반드시 필요함 (쿼리 필수 조건)
