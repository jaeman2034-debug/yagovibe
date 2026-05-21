# 🔍 Activity 로그 생성 및 조회 진단 결과

## ✅ 확인된 사항

### 1. 코드 구조
- ✅ **MarketAddPage.tsx**: Activity 로그 생성 코드 정상
- ✅ **EquipmentForm.tsx**: Activity 로그 생성 코드 정상
- ✅ **RecruitForm.tsx**: Activity 로그 생성 코드 정상
- ✅ **MatchForm.tsx**: Activity 로그 생성 코드 정상
- ✅ **ActivityFeed.tsx**: activityLogs 컬렉션 조회 코드 정상
- ✅ **firestore.rules**: 전체 허용 (권한 문제 없음)

### 2. 필드명 일치 확인
- ✅ 저장 시: `userId`, `authorId` 둘 다 저장
- ✅ 조회 시: `userId`로 필터링
- ✅ 필드명 일치함

---

## ⚠️ 잠재적 문제점

### 1. Firestore 인덱스 필요
**문제:**
```typescript
where("userId", "==", user.uid)
where("sport", "==", sport)  // 선택적
where("type", "==", filter)  // 선택적
orderBy("createdAt", "desc")
```

**해결:**
- Firebase Console → Firestore → 인덱스에서 복합 인덱스 생성 필요
- 인덱스가 없으면 쿼리 실패 (에러는 조용히 처리됨)

**필요한 인덱스:**
```
컬렉션: activityLogs
필드:
  - userId (Ascending)
  - createdAt (Descending)
```

**sport 필터 사용 시:**
```
컬렉션: activityLogs
필드:
  - userId (Ascending)
  - sport (Ascending)
  - createdAt (Descending)
```

**type 필터 사용 시:**
```
컬렉션: activityLogs
필드:
  - userId (Ascending)
  - type (Ascending)
  - createdAt (Descending)
```

### 2. 에러가 조용히 무시될 수 있음
**문제:**
- Activity 로그 생성 실패 시 `console.error`만 출력
- 사용자는 실패를 알 수 없음
- Activity 페이지는 계속 비어있음

**현재 코드:**
```typescript
try {
  await addDoc(collection(db, "activityLogs"), { ... });
  console.log("✅ Activity 로그 생성 완료");
} catch (err: any) {
  console.error("❌ Activity 로그 생성 실패:", err);
  // 에러를 throw하지 않음 → 조용히 실패
}
```

### 3. ActivityFeed가 실제로 렌더링되는지 확인 필요
**확인 사항:**
- `/activity` 경로가 올바르게 설정되어 있는지
- ActivityFeed 컴포넌트가 실제로 마운트되는지
- 사용자가 로그인되어 있는지

---

## 🔧 해결 방법

### 1. Firestore 인덱스 생성
1. Firebase Console 접속
2. Firestore → 인덱스 탭
3. 복합 인덱스 생성:
   - 컬렉션: `activityLogs`
   - 필드: `userId` (Asc), `createdAt` (Desc)
4. 인덱스 빌드 완료 대기 (1-2분)

### 2. 에러 확인을 위한 디버깅 로그 추가
```typescript
try {
  const docRef = await addDoc(collection(db, "activityLogs"), { ... });
  console.log("✅ [Activity] 로그 생성 성공:", docRef.id);
} catch (err: any) {
  console.error("❌ [Activity] 로그 생성 실패:", {
    error: err,
    code: err?.code,
    message: err?.message,
    stack: err?.stack,
  });
  // 🔥 개발 중에는 에러를 throw하여 문제를 즉시 확인
  if (import.meta.env.DEV) {
    throw err;
  }
}
```

### 3. ActivityFeed 디버깅 로그 추가
```typescript
useEffect(() => {
  const loadInitial = async () => {
    try {
      console.log("🔥 [ActivityFeed] 로드 시작", { userId: user?.uid, sport, filter });
      
      const snap = await getDocs(q);
      console.log("✅ [ActivityFeed] 조회 결과:", {
        count: snap.size,
        docs: snap.docs.map(d => ({ id: d.id, data: d.data() }))
      });
      
      // ...
    } catch (error: any) {
      console.error("❌ [ActivityFeed] 로드 실패:", {
        error,
        code: error?.code,
        message: error?.message,
        userId: user?.uid,
        sport,
        filter,
      });
    }
  };
  
  void loadInitial();
}, [filter, sport]);
```

---

## 📋 체크리스트

### Activity 로그 생성 확인
- [ ] 상품 업로드 후 콘솔에 "✅ Activity 로그 생성 완료" 메시지 확인
- [ ] Firebase Console → Firestore → activityLogs 컬렉션에 문서가 생성되는지 확인
- [ ] 에러 발생 시 콘솔에 "❌ Activity 로그 생성 실패" 메시지 확인

### Activity 피드 조회 확인
- [ ] `/activity` 페이지 접속
- [ ] 콘솔에 "🔥 [ActivityFeed] 로드 시작" 메시지 확인
- [ ] 콘솔에 "✅ [ActivityFeed] 조회 결과" 메시지 확인
- [ ] 인덱스 에러 발생 시 Firebase Console 링크 확인

### Firestore 인덱스 확인
- [ ] Firebase Console → Firestore → 인덱스 탭
- [ ] `activityLogs` 컬렉션에 필요한 인덱스가 있는지 확인
- [ ] 인덱스가 없으면 생성 (빌드 완료까지 1-2분 대기)

---

## 🎯 예상 원인 (우선순위)

1. **Firestore 인덱스 없음** (가장 가능성 높음)
   - 증상: 쿼리 실패, Activity 페이지 비어있음
   - 해결: 인덱스 생성

2. **에러가 조용히 무시됨**
   - 증상: 콘솔에 에러 메시지 없음
   - 해결: 디버깅 로그 추가

3. **ActivityFeed가 렌더링되지 않음**
   - 증상: Activity 페이지가 비어있음
   - 해결: 라우팅 및 컴포넌트 마운트 확인

---

## 🚀 다음 단계

1. **브라우저 콘솔 확인**
   - 상품 업로드 후 Activity 로그 생성 메시지 확인
   - Activity 페이지 접속 후 조회 메시지 확인

2. **Firebase Console 확인**
   - activityLogs 컬렉션에 문서가 생성되는지 확인
   - 인덱스 탭에서 필요한 인덱스가 있는지 확인

3. **에러 메시지 확인**
   - 콘솔에 에러가 있으면 에러 코드와 메시지 확인
   - 인덱스 에러면 Firebase Console 링크 클릭하여 인덱스 생성

결과를 알려주시면 추가로 진단하겠습니다.
