# 🔥 "The requested action is invalid" 오류 해결

## 🚨 원인 분석

이 오류는 주로 다음 중 하나가 원인입니다:

1. **GoogleAuthProvider 설정 과다**
   - `setCustomParameters`의 `prompt` 설정이 일부 브라우저에서 충돌
   - `addScope`가 중복되거나 불필요한 설정 추가

2. **Firebase Console 설정 불일치**
   - Google 제공자의 웹 클라이언트 ID/Secret 불일치
   - OAuth 리디렉션 URI 설정 문제

## ✅ 해결 방법

### 1️⃣ GoogleAuthProvider 설정 단순화

**수정 전**:
```typescript
googleProvider.setCustomParameters({
  prompt: "select_account",
});
googleProvider.addScope('profile');
googleProvider.addScope('email');
```

**수정 후**:
```typescript
// 최소한의 설정만 유지 (Firebase가 자동으로 처리)
// setCustomParameters 제거
// addScope 제거 (기본적으로 포함됨)
```

### 2️⃣ 에러 핸들링 개선

"invalid action" 오류에 대한 명확한 안내 메시지 추가:

```typescript
else if (error.message?.includes("invalid") || error.message?.includes("invalid action")) {
    errorMsg = 
        "인증 요청이 거부되었습니다.\n\n" +
        "가능한 원인:\n" +
        "1. Firebase Console → Authentication → Sign-in method → Google 설정 확인\n" +
        "2. Google Cloud Console의 OAuth 클라이언트 ID와 Firebase 설정이 일치하는지 확인\n" +
        "3. 브라우저 캐시 및 쿠키 삭제 후 재시도";
}
```

## 📝 수정된 파일

1. **`src/lib/firebase.ts`**
   - `setCustomParameters` 제거
   - `addScope` 제거
   - GoogleAuthProvider를 최소한의 설정으로 단순화

2. **`src/pages/LoginPage.tsx`**
   - "invalid action" 오류에 대한 상세한 안내 메시지 추가
   - 에러 로깅 개선

## 🎯 다음 단계

1. **브라우저 캐시 및 쿠키 삭제**
2. **페이지 새로고침 후 재시도**
3. **여전히 오류가 발생하면**:
   - Firebase Console → Authentication → Sign-in method → Google 설정 확인
   - Google Cloud Console의 OAuth 클라이언트 ID 확인

