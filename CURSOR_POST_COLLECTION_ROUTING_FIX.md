# 🔥 Cursor 개발자 수정 지시문: 모집/매칭 글 컬렉션 및 라우팅 분리

## 📋 문제

현재 모든 게시글이 `marketPosts` 컬렉션에 저장되고, 모든 게시글이 `/sports/:sport/market/:postId`로 라우팅되는 문제.

---

## ✅ 수정 완료

### 변경 사항

1. **RecruitForm.tsx**
   - `marketPosts` → `recruitPosts` 컬렉션으로 변경
   - 모집 글은 `recruitPosts`에 저장

2. **MatchForm.tsx**
   - `marketPosts` → `matchPosts` 컬렉션으로 변경
   - 매칭 글은 `matchPosts`에 저장

3. **EquipmentForm.tsx**
   - `marketPosts` 유지 (기존)
   - 거래 글은 `marketPosts`에 저장

4. **MarketWritePage.tsx**
   - `onSuccess` 콜백에서 카테고리별 라우팅 분기:
     - `equipment` → `/sports/:sport/market/:postId`
     - `recruit` → `/sports/:sport/recruit/:postId`
     - `match` → `/sports/:sport/match/:postId`

---

## 📋 최종 컬렉션 구조

### Firestore 컬렉션

| 카테고리 | 컬렉션 | 설명 |
|---------|--------|------|
| `equipment` | `marketPosts` | 중고거래 글 |
| `recruit` | `recruitPosts` | 팀원 모집 글 |
| `match` | `matchPosts` | 경기 매칭 글 |

**참고**: 모든 게시글은 기본 `market` 컬렉션에도 저장됩니다 (통합 조회용).

---

## 📋 최종 라우팅 구조

### 게시글 상세 페이지

| 카테고리 | 라우트 | 설명 |
|---------|--------|------|
| `equipment` | `/sports/:sport/market/:postId` | 중고거래 상세 |
| `recruit` | `/sports/:sport/recruit/:postId` | 모집 상세 |
| `match` | `/sports/:sport/match/:postId` | 매칭 상세 |

### 게시글 목록 페이지

| 카테고리 | 라우트 | 설명 |
|---------|--------|------|
| `equipment` | `/sports/:sport/market` | 중고거래 목록 |
| `recruit` | `/sports/:sport/recruit` | 모집 목록 |
| `match` | `/sports/:sport/match` | 매칭 목록 |

---

## 🔧 수정된 파일

### RecruitForm.tsx
```typescript
// Before
await setDoc(doc(db, "marketPosts", docRef.id), {...});

// After
await setDoc(doc(db, "recruitPosts", docRef.id), {...});
```

### MatchForm.tsx
```typescript
// Before
await setDoc(doc(db, "marketPosts", docRef.id), {...});

// After
await setDoc(doc(db, "matchPosts", docRef.id), {...});
```

### MarketWritePage.tsx
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

---

## 🧪 테스트 체크리스트

- [ ] 중고거래 글 작성 → `marketPosts` 컬렉션에 저장 확인
- [ ] 모집 글 작성 → `recruitPosts` 컬렉션에 저장 확인
- [ ] 매칭 글 작성 → `matchPosts` 컬렉션에 저장 확인
- [ ] 중고거래 글 작성 후 → `/sports/:sport/market/:postId`로 이동 확인
- [ ] 모집 글 작성 후 → `/sports/:sport/recruit/:postId`로 이동 확인
- [ ] 매칭 글 작성 후 → `/sports/:sport/match/:postId`로 이동 확인

---

## 📝 참고사항

### 기본 컬렉션 (`market`)
- 모든 게시글은 기본 `market` 컬렉션에도 저장됩니다.
- 통합 조회 및 검색에 사용됩니다.

### 타입별 컬렉션 (`marketPosts`, `recruitPosts`, `matchPosts`)
- 랭킹 시스템 및 타입별 필터링에 사용됩니다.
- 각 컬렉션은 해당 타입의 게시글만 포함합니다.

---

이 수정으로 **모집 글과 매칭 글이 올바른 컬렉션에 저장되고, 올바른 라우트로 이동**합니다.
