# 모바일 환경 문제 해결 가이드

## 🚨 현재 문제 상황

### 웹 (localhost:5173)
- ✅ 정상 작동
- ✅ 로그인 성공
- ✅ `/sports-hub` 정상 이동

### 모바일 (www.yagovibe.com)
- ❌ `detectInAppBrowser is not defined` 오류
- ❌ 앱이 열리지 않음

## 🔍 문제 원인 분석

### 1. 코드 문제 (즉시 해결 가능)
- `detectInAppBrowser` 함수가 모바일 빌드에서 제대로 번들링되지 않음
- **해결**: 이미 코드 수정 완료 (안전한 import 및 fallback 추가)

### 2. 설정 문제 (확인 필요)
- Google Cloud Console API Key HTTP Referrer 제한
- OAuth 2.0 Client ID 승인된 리디렉션 URI
- Firebase Authorized Domains

## ✅ 즉시 적용 가능한 해결책

### 1. 코드 수정 (완료)
- ✅ `App.tsx`: 안전한 import 및 fallback 추가
- ✅ `inAppBrowser.ts`: 안전성 강화 및 default export 추가

### 2. 빌드 재생성 (필수)
```bash
# 개발 서버 재시작
npm run dev

# 프로덕션 빌드
npm run build
```

### 3. 모바일 브라우저 캐시 삭제
- 모바일 Chrome/Safari에서 캐시 완전 삭제
- 또는 시크릿 모드에서 테스트

## 🔧 설정 확인 체크리스트

### Google Cloud Console - API Key (Browser key)
**경로**: Google Cloud Console → APIs & Services → Credentials → Browser key (auto created by Firebase)

**확인 사항**:
- [ ] 애플리케이션 제한사항: **"없음"** 선택
- [ ] API 제한사항: **"키 제한 안 함"** 선택
- [ ] 저장 버튼 클릭 확인

**HTTP Referrer 제한** (이미 설정되어 있음):
- ✅ `http://localhost:5173/*`
- ✅ `http://127.0.0.1:5173/*`
- ✅ `https://yagovibe.com/*`
- ✅ `https://www.yagovibe.com/*`
- ✅ `https://yago-vibe-spt.web.app/*`
- ✅ `https://yago-vibe-spt.firebaseapp.com/*`

### OAuth 2.0 Client ID - 승인된 JavaScript 원본
**경로**: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID

**확인 사항** (이미 설정되어 있음):
- ✅ `http://localhost:5173`
- ✅ `http://127.0.0.1:5173`
- ✅ `https://yagovibe.com`
- ✅ `https://www.yagovibe.com`
- ✅ `https://yago-vibe-spt.web.app`
- ✅ `https://yago-vibe-spt.firebaseapp.com`

### OAuth 2.0 Client ID - 승인된 리디렉션 URI
**경로**: 같은 OAuth 2.0 Client ID 설정 화면

**확인 사항** (반드시 확인 필요):
- [ ] `http://localhost:5173/__/auth/handler` (언더스코어 2개!)
- [ ] `http://127.0.0.1:5173/__/auth/handler`
- [ ] `https://yagovibe.com/__/auth/handler`
- [ ] `https://www.yagovibe.com/__/auth/handler`
- [ ] `https://yago-vibe-spt.web.app/__/auth/handler`
- [ ] `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`

**⚠️ 주의**: `/__/auth/handler` (언더스코어 2개)가 정확해야 함!

### Firebase Console - 승인된 도메인
**경로**: Firebase Console → Authentication → Settings → 승인된 도메인

**확인 사항** (이미 설정되어 있음):
- ✅ `localhost`
- ✅ `127.0.0.1`
- ✅ `yago-vibe-spt.firebaseapp.com`
- ✅ `yago-vibe-spt.web.app`
- ✅ `yagovibe.com`
- ✅ `www.yagovibe.com`

## 🎯 우선순위별 해결 순서

### 1순위: 코드 수정 확인 (즉시)
1. 개발 서버 재시작: `npm run dev`
2. 모바일에서 `www.yagovibe.com` 접속
3. `detectInAppBrowser is not defined` 오류가 사라졌는지 확인

### 2순위: OAuth 리디렉션 URI 확인 (5분)
1. Google Cloud Console → OAuth 2.0 Client ID
2. "승인된 리디렉션 URI" 섹션 확인
3. 모든 도메인에 `/__/auth/handler` (언더스코어 2개) 추가 확인
4. 저장 후 5분 대기

### 3순위: API Key 제한 확인 (5분)
1. Google Cloud Console → API Key (Browser key)
2. "애플리케이션 제한사항" → "없음" 확인
3. "API 제한사항" → "키 제한 안 함" 확인
4. 저장 후 5분 대기

### 4순위: 배포 및 테스트 (10분)
1. 프로덕션 빌드: `npm run build`
2. Firebase에 배포: `firebase deploy`
3. 모바일에서 테스트 (시크릿 모드 권장)

## 💡 모바일 특화 해결책

### 모바일에서만 발생하는 문제
- 모바일 브라우저는 캐시를 더 공격적으로 사용
- 모바일 네트워크는 설정 변경 전파가 더 느림
- 모바일 브라우저는 HTTPS를 더 엄격하게 검사

### 해결 방법
1. **시크릿 모드 테스트**: 캐시 문제 제거
2. **15분 대기**: Google Cloud 설정 전파 시간
3. **프로덕션 빌드**: 개발 빌드와 프로덕션 빌드 차이 확인

## 🔍 디버깅 체크리스트

모바일에서 문제가 계속되면:

1. [ ] 브라우저 콘솔 확인 (모바일 Chrome 원격 디버깅)
2. [ ] Firebase 설정 로그 확인 (`🔍 [firebase.ts] ⚠️⚠️⚠️ Firebase 설정 상세 확인`)
3. [ ] OAuth 리디렉션 URI 정확성 확인 (`/__/auth/handler` 언더스코어 2개)
4. [ ] API Key HTTP Referrer 제한 확인 (모든 도메인 포함)
5. [ ] 프로덕션 빌드 재생성 및 배포

## 📝 최종 확인 사항

모든 설정이 완료되었는지 확인:

- [ ] 코드 수정 완료 (이미 완료)
- [ ] 빌드 재생성 완료
- [ ] OAuth 리디렉션 URI 확인 완료
- [ ] API Key 제한 확인 완료
- [ ] Firebase Authorized Domains 확인 완료
- [ ] 15분 대기 완료
- [ ] 모바일 시크릿 모드 테스트 완료

