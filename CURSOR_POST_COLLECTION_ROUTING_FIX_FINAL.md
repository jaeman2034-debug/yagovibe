# 🔥 Cursor 개발자 수정 지시문: 모집/매칭 글 컬렉션 및 라우팅 분리 (완료)

## ✅ 수정 완료

### 변경 사항 요약

1. **컬렉션 분리**
   - `RecruitForm.tsx`: `marketPosts` → `recruitPosts`
   - `MatchForm.tsx`: `marketPosts` → `matchPosts`
   - `EquipmentForm.tsx`: `marketPosts` 유지

2. **라우팅 분기**
   - `MarketWritePage.tsx`: 카테고리별 라우팅 분기 추가
   - `App.tsx`: `/sports/:sport/recruit/:postId`, `/sports/:sport/match/:postId` 라우트 추가

---

## 📋 최종 컬렉션 구조

### Firestore 컬렉션

| 카테고리 | 기본 컬렉션 | 동기화 컬렉션 | 설명 |
|---------|------------|-------------|------|
| `equipment` | `market` | `marketPosts` | 중고거래 글 |
| `recruit` | `market` | `recruitPosts` | 팀원 모집 글 |
| `match` | `market` | `matchPosts` | 경기 매칭 글 |

**참고**: 모든 게시글은 기본 `market` 컬렉션에도 저장됩니다 (통합 조회용).

---

## 📋 최종 라우팅 구조

### 게시글 상세 페이지

| 카테고리 | 라우트 | 컴포넌트 |
|---------|--------|---------|
| `equipment` | `/sports/:sport/market/:postId` | `MarketPostDetailPage` |
| `recruit` | `/sports/:sport/recruit/:postId` | `MarketPostDetailPage` |
| `match` | `/sports/:sport/match/:postId` | `MarketPostDetailPage` |

**참고**: 모든 카테고리는 `MarketPostDetailPage`에서 처리합니다 (카테고리별 분기 내부 처리).

---

## 🔧 수정된 파일

### 1. RecruitForm.tsx
```typescript
// Before
await setDoc(doc(db, "marketPosts", docRef.id), {...});

// After
await setDoc(doc(db, "recruitPosts", docRef.id), {...});
```

### 2. MatchForm.tsx
```typescript
// Before
await setDoc(doc(db, "marketPosts", docRef.id), {...});

// After
await setDoc(doc(db, "matchPosts", docRef.id), {...});
```

### 3. MarketWritePage.tsx
```typescript
// Before
navigate(`/sports/${sportState}/market/${postId}`);

// After
if (category === "equipment" || category === "market") {
  navigate(`/sports/${sportState}/market/${postId}`);
} else if (category === "recruit") {
  navigate(`/sports/${sportState}/recruit/${postId}`);
} else if (category === "match") {
  navigate(`/sports/${sportState}/match/${postId}`);
}
```

### 4. App.tsx
```typescript
// 추가된 라우트
<Route 
  path="/sports/:sport/recruit/:postId" 
  element={
    <ProtectedRoute>
      <MarketPostDetailPage />
    </ProtectedRoute>
  } 
/>

<Route 
  path="/sports/:sport/match/:postId" 
  element={
    <ProtectedRoute>
      <MarketPostDetailPage />
    </ProtectedRoute>
  } 
/>
```

---

## 🧪 테스트 체크리스트

### 컬렉션 저장 테스트
- [ ] 중고거래 글 작성 → `marketPosts` 컬렉션에 저장 확인
- [ ] 모집 글 작성 → `recruitPosts` 컬렉션에 저장 확인
- [ ] 매칭 글 작성 → `matchPosts` 컬렉션에 저장 확인
- [ ] 모든 게시글 → `market` 컬렉션에도 저장 확인

### 라우팅 테스트
- [ ] 중고거래 글 작성 후 → `/sports/:sport/market/:postId`로 이동 확인
- [ ] 모집 글 작성 후 → `/sports/:sport/recruit/:postId`로 이동 확인
- [ ] 매칭 글 작성 후 → `/sports/:sport/match/:postId`로 이동 확인
- [ ] 각 상세 페이지에서 게시글이 정상적으로 표시되는지 확인

---

## 📝 참고사항

### 기본 컬렉션 (`market`)
- 모든 게시글은 기본 `market` 컬렉션에도 저장됩니다.
- 통합 조회 및 검색에 사용됩니다.

### 타입별 컬렉션 (`marketPosts`, `recruitPosts`, `matchPosts`)
- 랭킹 시스템 및 타입별 필터링에 사용됩니다.
- 각 컬렉션은 해당 타입의 게시글만 포함합니다.

### 라우팅 통일
- 모든 상세 페이지는 `MarketPostDetailPage`를 사용합니다.
- 내부에서 `category` 필드를 확인하여 적절한 UI를 렌더링합니다.

---

## 🚀 다음 단계 (선택사항)

### 목록 페이지 라우트 추가
현재 상세 페이지만 추가되었습니다. 목록 페이지도 추가할 수 있습니다:

- `/sports/:sport/recruit` → 모집 목록 페이지
- `/sports/:sport/match` → 매칭 목록 페이지

---

이 수정으로 **모집 글과 매칭 글이 올바른 컬렉션에 저장되고, 올바른 라우트로 이동**합니다.
