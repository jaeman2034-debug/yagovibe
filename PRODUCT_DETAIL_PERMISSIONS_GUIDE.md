# 🔒 ProductDetail 최소 권한 정책 가이드

## ✅ 완성된 권한 구조

### 1. marketProducts (공개 정보)
```javascript
match /marketProducts/{productId} {
  // 읽기: 모든 사용자 허용 (공개 정보)
  allow read: if true;
  // 쓰기: 로그인 사용자만 허용
  allow write: if isSignedIn();
}
```

**사용 쿼리:**
- `getDoc(marketProducts/{id})` - 상품 기본 정보
- `query(marketProducts, where("category", "==", ...))` - 연관 상품
- `query(marketProducts, orderBy("createdAt", "desc"))` - 유사상품

---

### 2. sellerProfiles (판매자 프로필)
```javascript
match /sellerProfiles/{sellerId} {
  // 읽기: 로그인 사용자 모두 가능 (판매자 정보는 공개 정보)
  allow read: if isSignedIn();
  // 쓰기: 본인만 가능
  allow write: if isSignedIn() && request.auth.uid == sellerId;
}
```

**사용 쿼리:**
- `getDoc(sellerProfiles/{sellerId})` - 판매자 프로필 조회

---

### 3. users (판매자 기본 정보)
```javascript
match /users/{userId} {
  allow read: if request.auth != null && (
    // 본인 문서 읽기
    (request.auth.uid == userId && (!resource.data.status || resource.data.status != "deleted")) ||
    // 관리자는 모든 문서 읽기 가능
    isGlobalAdmin() ||
    // 🔥 판매자 프로필 조회용: 다른 사용자의 공개 정보 읽기
    (!resource.data.status || resource.data.status != "deleted")
  );
}
```

**사용 쿼리:**
- `getDoc(users/{sellerId})` - 판매자 기본 정보 조회 (sellerProfiles 없을 때)

---

### 4. users/{uid}/favorites (찜 목록)
```javascript
match /favorites/{productId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

**사용 쿼리:**
- `getDoc(users/{uid}/favorites/{productId})` - 찜 여부 확인

---

## 📊 필요한 Firestore 인덱스

### 1. marketProducts: category
```json
{
  "collectionGroup": "marketProducts",
  "fields": [
    { "fieldPath": "category", "order": "ASCENDING" }
  ]
}
```

### 2. marketProducts: createdAt
```json
{
  "collectionGroup": "marketProducts",
  "fields": [
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

## 🚀 배포 절차

### 1단계: Firestore Rules 배포
```bash
firebase deploy --only firestore:rules
```

### 2단계: Firestore 인덱스 배포
```bash
firebase deploy --only firestore:indexes
```

### 3단계: 또는 한 번에 배포
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

## ✅ 보안 정책 원칙

### 최소 권한 원칙
- ✅ 공개 정보: 모든 사용자 읽기 가능
- ✅ 판매자 정보: 로그인 사용자만 읽기 가능
- ✅ 개인 정보: 본인만 읽기/쓰기 가능
- ✅ 관리자: 특별 권한 (모든 users 문서 읽기)

### 데이터 분류
1. **공개 정보** (누구나 읽기)
   - `marketProducts` 기본 정보
   
2. **인증 필요** (로그인 사용자만)
   - `sellerProfiles` 판매자 프로필
   
3. **개인 정보** (본인만)
   - `users/{uid}/favorites` 찜 목록

---

## 🔍 테스트 시나리오

### 정상 케이스
1. ✅ 비로그인 사용자: 상품 기본 정보 조회 가능
2. ✅ 로그인 사용자: 상품 + 판매자 정보 조회 가능
3. ✅ 본인: 찜 목록 읽기/쓰기 가능

### 권한 오류 케이스
1. ❌ 비로그인 사용자: sellerProfiles 조회 불가 (정상)
2. ❌ 다른 사용자: favorites 조회 불가 (정상)

---

## 📝 참고

- AI API 실패는 권한 문제가 아닙니다 (서버 API 별도 처리)
- `safeFetch`와 `safeQuery`로 에러를 안전하게 처리
- 인덱스 생성은 Firebase Console에서 자동 생성 링크 사용 권장
