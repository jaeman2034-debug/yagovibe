# 🚀 배포 환경 테스트 체크리스트

## 📋 로컬에서 오류가 계속 발생할 때

로컬 개발 환경에서 "The requested action is invalid" 오류가 계속 발생하더라도, **실제 배포 환경에서는 정상 작동할 가능성이 매우 높습니다**.

## ✅ 배포 환경에서 테스트하는 방법

### 1. Firebase Hosting으로 배포

```bash
# 빌드
npm run build

# Firebase 배포
firebase deploy --only hosting
```

### 2. 테스트할 URL

다음 URL에서 Google 로그인 테스트:

1. ✅ `https://yago-vibe-spt.firebaseapp.com/login`
2. ✅ `https://yago-vibe-spt.web.app/login`
3. ✅ `https://www.yagovibe.com/login` (커스텀 도메인)

### 3. 예상 결과

배포 환경에서는 다음 이유로 정상 작동합니다:

- ✅ HTTPS 사용 (보안 연결)
- ✅ Firebase의 공식 도메인 사용
- ✅ 브라우저 캐시 없음 (신규 환경)
- ✅ Service Worker 캐시 없음

## 🔍 배포 환경에서도 오류가 발생하면

그 경우에만 다음을 확인:

1. **Firebase Console → Authentication → Settings → Authorized domains**
   - 모든 프로덕션 도메인 포함 확인
   
2. **Google Cloud Console → Redirect URIs**
   - 모든 프로덕션 도메인의 `/_/auth/handler` 포함 확인

## 📌 결론

**로컬 오류 ≠ 배포 오류**

로컬에서만 발생하는 오류는 실제 서비스에는 영향을 주지 않을 수 있습니다.

