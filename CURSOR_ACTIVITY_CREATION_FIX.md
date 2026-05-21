# Cursor 수정 지시문

## 문제

현재 Firestore `activities` 컬렉션에 `system` activity만 존재합니다.

```
type: "system"
sourceType: "system"
```

하지만 게시글 생성 시 Activity가 생성되지 않고 있습니다.

---

## 확인할 파일

- `src/features/market/components/forms/EquipmentForm.tsx`
- `src/features/market/components/forms/RecruitForm.tsx`
- `src/features/market/components/forms/MatchForm.tsx`
- (추가로 team/event 생성하는 곳이 있으면 동일 확인)

---

## 반드시 확인할 코드

게시글 생성 후 다음 코드가 **실행되어야 합니다**:

```typescript
await addDoc(collection(db, "activities"), activityData);
```

---

## 수정 방법

### 1️⃣ EquipmentForm.tsx 확인 및 수정

**파일**: `src/features/market/components/forms/EquipmentForm.tsx`

**위치**: 게시글 저장 후 (약 400줄 근처)

**확인 사항**:
1. Activity 생성 코드가 있는지
2. `try-catch`로 에러가 숨겨지지 않았는지
3. Activity 생성이 게시글 저장 후 실행되는지

**수정 코드**:

```typescript
// 1. marketPosts에 게시글 저장
const docRef = await addDoc(collection(db, "marketPosts"), {
  sport,
  category: "equipment",
  title: title.trim(),
  description: description.trim(),
  price: Number(price),
  // ... 기타 필드
  createdAt: serverTimestamp(),
  authorId: auth.currentUser.uid,
});

console.log("✅ [EquipmentForm] 게시글 저장 완료:", docRef.id);

// 2. activities에 Activity 생성 (반드시 실행되어야 함)
try {
  const activityData = {
    type: "equipment_created",
    sport: sport?.toLowerCase().trim() || "soccer",
    collection: "marketPosts",      // 🔥 필수
    postId: docRef.id,              // 🔥 필수
    refType: "market",               // 레거시 지원
    refId: docRef.id,                // 레거시 지원
    authorId: auth.currentUser.uid,
    userId: auth.currentUser.uid,    // 레거시 지원
    title: title.trim(),
    summary: description?.trim() || (price ? `${Number(price).toLocaleString()}원` : undefined),
    thumbnailUrl: imageUrls[0] || undefined,
    visibility: "public",
    likeCount: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
    category: "equipment",
    // 레거시 호환성
    sourceId: docRef.id,
    sourceType: "market",
  };

  // 🔥 디버그 로그 추가
  console.log("🔥 [EquipmentForm] Activity 생성 시작:", {
    type: activityData.type,
    sport: activityData.sport,
    collection: activityData.collection,
    postId: activityData.postId,
    title: activityData.title,
  });

  // 🔥 undefined 값 제거
  const { cleanFirestoreData } = await import("@/utils/firestoreHelpers");
  const cleanedActivityData = cleanFirestoreData(activityData);

  const activityRef = await addDoc(collection(db, "activities"), cleanedActivityData);
  
  console.log("✅ [EquipmentForm] Activity 생성 완료:", {
    activityId: activityRef.id,
    postId: docRef.id,
    collection: "marketPosts",
    type: "equipment_created",
  });
} catch (activityError: any) {
  console.error("❌ [EquipmentForm] Activity 생성 실패:", {
    error: activityError,
    code: activityError?.code,
    message: activityError?.message,
    postId: docRef.id,
  });
  // Activity 생성 실패해도 게시글은 저장되었으므로 계속 진행
  // 하지만 에러는 반드시 로그로 남겨야 함
}
```

---

### 2️⃣ RecruitForm.tsx 확인 및 수정

**파일**: `src/features/market/components/forms/RecruitForm.tsx`

**위치**: 게시글 저장 후 (약 218줄 근처)

**수정 코드**:

```typescript
// 1. recruitPosts에 게시글 저장
const docRef = await addDoc(collection(db, "recruitPosts"), {
  sport,
  category: "recruit",
  title: title.trim(),
  description: description.trim(),
  // ... 기타 필드
  createdAt: serverTimestamp(),
  authorId: auth.currentUser.uid,
});

console.log("✅ [RecruitForm] 게시글 저장 완료:", docRef.id);

// 2. activities에 Activity 생성
try {
  const activityData = {
    type: "recruit_created",
    sport: sport?.toLowerCase().trim() || "soccer",
    collection: "recruitPosts",     // 🔥 필수
    postId: docRef.id,              // 🔥 필수
    refType: "recruit",             // 레거시 지원
    refId: docRef.id,               // 레거시 지원
    authorId: auth.currentUser.uid,
    userId: auth.currentUser.uid,   // 레거시 지원
    title: title.trim(),
    summary: description?.trim() || undefined,
    thumbnailUrl: imageUrls[0] || undefined,
    visibility: "public",
    likeCount: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
    category: "recruit",
    // 레거시 호환성
    sourceId: docRef.id,
    sourceType: "recruit",
  };

  // 🔥 디버그 로그 추가
  console.log("🔥 [RecruitForm] Activity 생성 시작:", {
    type: activityData.type,
    sport: activityData.sport,
    collection: activityData.collection,
    postId: activityData.postId,
    title: activityData.title,
  });

  const { cleanFirestoreData } = await import("@/utils/firestoreHelpers");
  const cleanedActivityData = cleanFirestoreData(activityData);

  const activityRef = await addDoc(collection(db, "activities"), cleanedActivityData);
  
  console.log("✅ [RecruitForm] Activity 생성 완료:", {
    activityId: activityRef.id,
    postId: docRef.id,
    collection: "recruitPosts",
    type: "recruit_created",
  });
} catch (activityError: any) {
  console.error("❌ [RecruitForm] Activity 생성 실패:", {
    error: activityError,
    code: activityError?.code,
    message: activityError?.message,
    postId: docRef.id,
  });
}
```

---

### 3️⃣ MatchForm.tsx 확인 및 수정

**파일**: `src/features/market/components/forms/MatchForm.tsx`

**위치**: 게시글 저장 후 (약 240줄 근처)

**수정 코드**:

```typescript
// 1. matchPosts에 게시글 저장
const docRef = await addDoc(collection(db, "matchPosts"), {
  sport,
  category: "match",
  title: title.trim(),
  description: description.trim(),
  // ... 기타 필드
  createdAt: serverTimestamp(),
  authorId: auth.currentUser.uid,
});

console.log("✅ [MatchForm] 게시글 저장 완료:", docRef.id);

// 2. activities에 Activity 생성
try {
  const activityData = {
    type: "match_created",
    sport: sport?.toLowerCase().trim() || "soccer",
    collection: "matchPosts",       // 🔥 필수
    postId: docRef.id,              // 🔥 필수
    refType: "match",               // 🔥 "market"에서 "match"로 수정
    refId: docRef.id,               // 레거시 지원
    authorId: auth.currentUser.uid,
    userId: auth.currentUser.uid,   // 레거시 지원
    title: title.trim(),
    summary: description?.trim() || undefined,
    thumbnailUrl: imageUrls[0] || undefined,
    visibility: "public",
    likeCount: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
    category: "match",
    // 레거시 호환성
    sourceId: docRef.id,
    sourceType: "match",
  };

  // 🔥 디버그 로그 추가
  console.log("🔥 [MatchForm] Activity 생성 시작:", {
    type: activityData.type,
    sport: activityData.sport,
    collection: activityData.collection,
    postId: activityData.postId,
    title: activityData.title,
  });

  const { cleanFirestoreData } = await import("@/utils/firestoreHelpers");
  const cleanedActivityData = cleanFirestoreData(activityData);

  const activityRef = await addDoc(collection(db, "activities"), cleanedActivityData);
  
  console.log("✅ [MatchForm] Activity 생성 완료:", {
    activityId: activityRef.id,
    postId: docRef.id,
    collection: "matchPosts",
    type: "match_created",
  });
} catch (activityError: any) {
  console.error("❌ [MatchForm] Activity 생성 실패:", {
    error: activityError,
    code: activityError?.code,
    message: activityError?.message,
    postId: docRef.id,
  });
}
```

---

## 디버그 로그 확인

게시글 생성 후 브라우저 콘솔에서 다음 로그를 확인하세요:

### 정상 케이스

```
✅ [EquipmentForm] 게시글 저장 완료: abc123
🔥 [EquipmentForm] Activity 생성 시작: { type: "equipment_created", ... }
✅ [EquipmentForm] Activity 생성 완료: { activityId: "xyz789", ... }
```

### 에러 케이스

```
✅ [EquipmentForm] 게시글 저장 완료: abc123
🔥 [EquipmentForm] Activity 생성 시작: { type: "equipment_created", ... }
❌ [EquipmentForm] Activity 생성 실패: { error: ..., code: ..., message: ... }
```

---

## 테스트

### 1. 게시글 생성 테스트

1. Equipment 글 작성
2. 브라우저 콘솔에서 Activity 생성 로그 확인
3. Firestore Console에서 `activities` 컬렉션 확인

**예상 결과**:

```
activities
 └ equipment_created (새로 생성됨)
```

---

### 2. Firestore 확인

Firestore Console에서 `activities` 컬렉션을 열고 다음 문서가 생성되었는지 확인:

- `type = "equipment_created"` (Equipment 글 작성 후)
- `type = "recruit_created"` (Recruit 글 작성 후)
- `type = "match_created"` (Match 글 작성 후)

---

## 🔍 문제 진단

### 케이스 1: Activity 생성 코드가 없음

**증상**: 콘솔에 "Activity 생성 시작" 로그가 없음

**해결**: 위 수정 코드를 추가

---

### 케이스 2: Activity 생성 코드가 있지만 실행 안됨

**증상**: "Activity 생성 시작" 로그는 있지만 "Activity 생성 완료" 로그가 없음

**원인**:
- `try-catch`에서 에러가 숨겨짐
- 조건문으로 Activity 생성이 스킵됨
- 사용자 인증 문제

**확인 사항**:
- `auth.currentUser`가 null이 아닌지
- `try-catch` 블록이 올바른지
- 조건문이 Activity 생성을 막지 않는지

---

### 케이스 3: Activity 생성은 되지만 Firestore에 저장 안됨

**증상**: "Activity 생성 완료" 로그는 있지만 Firestore에 문서가 없음

**원인**:
- Firestore 보안 규칙 문제
- 네트워크 문제
- Firestore 인덱스 문제

**확인 사항**:
- Firestore 보안 규칙 확인
- 브라우저 네트워크 탭에서 요청 확인
- Firestore Console에서 에러 확인

---

## 📋 작업 체크리스트

- [ ] `EquipmentForm.tsx`: Activity 생성 코드 확인 및 수정
- [ ] `RecruitForm.tsx`: Activity 생성 코드 확인 및 수정
- [ ] `MatchForm.tsx`: Activity 생성 코드 확인 및 수정
- [ ] 디버그 로그 추가
- [ ] 게시글 생성 테스트
- [ ] Firestore에서 Activity 문서 생성 확인
- [ ] 브라우저 콘솔에서 에러 확인

---

## 🚀 수정 후 예상 결과

### Firestore `activities` 컬렉션

```
activities
 ├ system (기존)
 ├ equipment_created (새로 생성)
 ├ recruit_created (새로 생성)
 └ match_created (새로 생성)
```

### Activity 페이지

#### 전체 탭

```
공공공 (equipment_created)
야고 축구 FC (recruit_created)
소홀 (team_created)
```

#### 거래 탭

```
공공공 (equipment_created만)
```

#### 팀 탭

```
야고 축구 FC (recruit_created)
소홀 (team_created)
```

---

이 수정으로 **Activity 생성이 정상적으로 작동**하고, Activity 페이지에 게시글이 표시됩니다.
