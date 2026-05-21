# 🔥 Firebase Console 오류 해결 가이드

## 🚨 문제 상황

Firebase Console에서 `_idempotency` 컬렉션을 열 때 다음 오류 발생:

```
문서를 로드하는 중에 오류가 발생했습니다.
(An error occurred while loading the document.)
```

## 🎯 원인 분석

### 1. `_idempotency` 컬렉션의 역할

`_idempotency` 컬렉션은 **Cloud Functions에서만 사용하는 내부 컬렉션**입니다.

**용도:**
- 트리거 중복 실행 방지
- 멱등성(Idempotency) 보장
- Cloud Functions의 `once()` 헬퍼에서 사용

**사용 위치:**
- `functions/src/utils/idempotency.ts`
- `functions/src/market/onMarketPostDeleted.ts`
- 기타 트리거 함수들

### 2. 현재 규칙 상태

현재 배포된 규칙:
```javascript
match /{document=**} {
  allow read, write: if true;
}
```

이 규칙은 **모든 컬렉션에 대해 읽기/쓰기를 허용**하므로, `_idempotency` 컬렉션도 접근 가능해야 합니다.

### 3. 가능한 원인

1. **컬렉션이 아직 생성되지 않음**
   - `_idempotency` 컬렉션은 Cloud Functions가 실행될 때 자동 생성됨
   - 아직 트리거가 실행되지 않았다면 컬렉션이 존재하지 않을 수 있음

2. **Firebase Console의 일시적인 문제**
   - Console 자체의 버그 또는 일시적인 오류
   - 브라우저 캐시 문제

3. **규칙 전파 지연**
   - 규칙 배포 후 완전히 전파되는 데 시간이 걸릴 수 있음 (보통 1-2분)

---

## ✅ 해결 방법

### 방법 1: 컬렉션 무시 (권장)

`_idempotency` 컬렉션은 **시스템 내부 컬렉션**이므로, Console에서 볼 필요가 없습니다.

**해결:**
- 다른 컬렉션(`sports`, `marketPosts` 등)을 확인하세요
- `_idempotency` 컬렉션은 Cloud Functions에서만 사용됩니다

### 방법 2: 규칙 재배포

규칙이 제대로 전파되지 않았을 수 있으므로 재배포:

```bash
firebase deploy --only firestore:rules
```

### 방법 3: 브라우저 캐시 삭제

1. 브라우저 개발자 도구 열기 (F12)
2. Network 탭 → "Disable cache" 체크
3. Console 새로고침 (Ctrl+Shift+R)

### 방법 4: 다른 컬렉션 확인

`_idempotency` 대신 실제 데이터 컬렉션 확인:

- `sports/{sport}/marketPosts` - 마켓 게시글
- `users` - 사용자 정보
- `chatRooms` - 채팅방

---

## 🎯 확인 사항

### 1. 규칙이 올바르게 배포되었는지 확인

Firebase Console → Firestore → 규칙 탭에서:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

이 규칙이 표시되어야 합니다.

### 2. 실제 데이터 컬렉션 확인

`_idempotency` 대신 다음 컬렉션들을 확인하세요:

- ✅ `sports/soccer/marketPosts` - 마켓 게시글
- ✅ `users` - 사용자 정보
- ✅ `chatRooms` - 채팅방

이 컬렉션들이 정상적으로 표시되면 규칙은 정상입니다.

### 3. 앱에서 데이터 로드 확인

Firebase Console 오류와 관계없이, **앱에서 데이터가 정상적으로 로드되는지** 확인하세요:

- ✅ Market 페이지에서 상품 목록 표시
- ✅ 상품 등록 성공
- ✅ 상세 페이지 정상 표시

---

## 💡 중요 사항

### `_idempotency` 컬렉션은 무시해도 됩니다

이 컬렉션은:
- Cloud Functions의 내부 시스템 컬렉션
- 사용자가 직접 접근할 필요 없음
- Console에서 오류가 나도 앱 동작에는 영향 없음

### 실제 문제 확인 방법

Console 오류보다 **앱 동작**을 확인하세요:

1. Market 페이지 접속
2. 상품 목록이 표시되는지 확인
3. 상품 등록이 성공하는지 확인
4. 콘솔에 권한 오류가 없는지 확인

---

## 🚀 다음 단계

`_idempotency` 컬렉션 오류는 무시하고, 다음을 확인하세요:

1. ✅ Market 페이지에서 상품 목록이 표시되는가?
2. ✅ 상품 등록이 성공하는가?
3. ✅ 다른 컬렉션들이 정상적으로 표시되는가?

모두 정상이면 `_idempotency` 오류는 무시해도 됩니다.

---

## 📝 참고

- `_idempotency` 컬렉션은 Cloud Functions에서 자동 생성됨
- 첫 트리거 실행 시 컬렉션이 생성됨
- Console에서 오류가 나도 앱 동작에는 영향 없음
