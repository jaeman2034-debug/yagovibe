# 🔥 Firestore 보안 규칙 수정 - Market 페이지 접근 문제 해결

## 🚨 문제 상황

Market 페이지에서 Firestore 쿼리 실행 시 다음 오류 발생:

```
FirebaseError: Missing or insufficient permissions
```

## 🎯 원인

현재 앱 구조는 중첩 컬렉션을 사용합니다:

```
sports
 └ {sport}
    └ marketPosts
        └ {postId}
```

하지만 `firestore.rules` 파일에는 이 경로에 대한 규칙이 없었습니다.

---

## ✅ 해결 방법

### 1. 임시 규칙 (테스트용) - 이미 적용됨

`firestore.rules` 파일에 다음 규칙이 추가되었습니다:

```javascript
/* 🔥 Sports Market Posts (종목별 마켓 게시글) - 중첩 컬렉션 구조 */
match /sports/{sport}/marketPosts/{postId} {
  // 🔥 테스트용: 모든 사용자 읽기 허용 (공개 정보)
  allow read: if true;
  
  // 생성: 로그인 사용자만 허용
  allow create: if isSignedIn();
  
  // 수정: 작성자만 가능
  allow update: if isSignedIn() && (
    resource.data.authorId == request.auth.uid ||
    resource.data.userId == request.auth.uid ||
    resource.data.sellerId == request.auth.uid
  );
  
  // 삭제: 작성자만 가능
  allow delete: if isSignedIn() && (
    resource.data.authorId == request.auth.uid ||
    resource.data.userId == request.auth.uid ||
    resource.data.sellerId == request.auth.uid
  );
}
```

---

## 🚀 배포 방법

### 방법 1: Firebase CLI로 배포 (권장)

```bash
# Firebase CLI 설치 확인
firebase --version

# Firebase 로그인
firebase login

# 프로젝트 선택
firebase use yago-vibe-spt

# 규칙 배포
firebase deploy --only firestore:rules
```

**예상 결과:**
```
✔  Deploy complete!

Firestore rules have been deployed successfully.
```

---

### 방법 2: Firebase Console에서 직접 수정

1. **Firebase Console 접속**
   - https://console.firebase.google.com/
   - 프로젝트: `yago-vibe-spt`

2. **Firestore Database → Rules 탭**

3. **규칙 추가**
   - `firestore.rules` 파일의 내용을 복사하여 붙여넣기
   - 또는 위의 `sports/{sport}/marketPosts` 규칙만 추가

4. **"게시" 버튼 클릭**

5. **배포 완료 대기 (약 10초)**

---

## 🎯 출시용 보안 규칙 (나중에 적용)

테스트가 완료되면 다음 규칙으로 변경하세요:

```javascript
/* 🔥 Sports Market Posts (종목별 마켓 게시글) - 출시용 보안 규칙 */
match /sports/{sport}/marketPosts/{postId} {
  // 읽기: 모든 사용자 허용 (공개 정보)
  allow read: if true;
  
  // 생성: 로그인 사용자만 허용
  allow create: if isSignedIn();
  
  // 수정: 작성자만 가능 (필드 제한)
  allow update: if isSignedIn() && (
    resource.data.authorId == request.auth.uid ||
    resource.data.userId == request.auth.uid ||
    resource.data.sellerId == request.auth.uid
  ) && request.resource.data.diff(resource.data).affectedKeys()
    .hasOnly(["title", "price", "images", "description", "category", "type", "status", "updatedAt"]);
  
  // 삭제: 작성자만 가능
  allow delete: if isSignedIn() && (
    resource.data.authorId == request.auth.uid ||
    resource.data.userId == request.auth.uid ||
    resource.data.sellerId == request.auth.uid
  );
}
```

---

## 📌 확인 방법

### 규칙 배포 후

1. **Market 페이지 접속**
2. **브라우저 콘솔 확인**
   - `FirebaseError: Missing or insufficient permissions` 오류가 사라져야 함
   - `✅ [MarketPage] Firestore 응답: N개 문서` 메시지 확인

3. **데이터 로딩 확인**
   - 마켓 목록이 정상적으로 표시되어야 함
   - "데이터를 불러올 수 없습니다" 메시지가 사라져야 함

---

## ⚠️ 중요 사항

### 중첩 컬렉션 규칙

Firestore는 중첩 컬렉션에 대해 명시적인 규칙이 필요합니다.

- ❌ `match /marketPosts/{postId}` - 루트 컬렉션만 매칭
- ✅ `match /sports/{sport}/marketPosts/{postId}` - 중첩 컬렉션 매칭

### 와일드카드 사용 불가

Firestore Rules에서는 와일드카드를 사용할 수 없습니다:

- ❌ `match /sports/{sport}/**` - 작동하지 않음
- ✅ `match /sports/{sport}/marketPosts/{postId}` - 명시적 경로 필요

---

## 🎯 완료 기준

- Market 페이지 에러 사라짐
- 마켓 목록 정상 표시
- Firestore 쿼리 정상 동작
- 권한 오류 메시지 제거

---

## 📝 참고

- [Firestore 보안 규칙 공식 문서](https://firebase.google.com/docs/firestore/security/get-started)
- [중첩 컬렉션 규칙 가이드](https://firebase.google.com/docs/firestore/security/rules-structure#nested_data)
