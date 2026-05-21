# 🔥 auth/api-key-not-valid 오류 해결 가이드

## 📋 현재 상황

### ✅ 무한 루프 해결됨
- 콘솔 로그에서 `🟨 [AuthProvider] 사용자 상태 변경 없음 - 리다이렉트 스킵` 확인
- 무한 루프 문제는 해결되었습니다!

### ❌ 새로운 문제: auth/api-key-not-valid
- Google 로그인 버튼 클릭 시 `Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)` 오류 발생
- 배포된 버전에서 API 키가 유효하지 않다고 인식됨

---

## 🔍 원인 분석

### 가능한 원인들:

1. **빌드 시 환경 변수 미포함**
   - Vite는 빌드 시 `.env.local`의 `VITE_` 변수들을 번들에 포함시킴
   - 하지만 빌드가 이전에 실행되어 환경 변수가 포함되지 않았을 수 있음

2. **Google Cloud Console API 키 제한**
   - HTTP referrer 제한이 설정되어 있지만, 실제 도메인과 일치하지 않을 수 있음
   - API 키가 다른 프로젝트의 것일 수 있음

3. **Firebase Console과 Google Cloud Console 불일치**
   - Firebase Console의 API 키와 Google Cloud Console의 API 키가 다를 수 있음

---

## ✅ 해결 방법

### Step 1: 빌드 재실행 (환경 변수 포함 확인)

```bash
# 1. dist 폴더 삭제 (이전 빌드 제거)
rm -rf dist

# 2. 재빌드 (환경 변수 포함)
npm run build

# 3. 빌드된 파일에서 API 키 확인
# dist/assets/main-*.js 파일을 열어서 API 키가 포함되어 있는지 확인
```

### Step 2: Google Cloud Console API 키 확인

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트 `yago-vibe-spt` 선택

2. **API 및 서비스 > 사용자 인증 정보**
   - API 키 목록에서 현재 사용 중인 API 키 확인
   - API 키가 `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`와 일치하는지 확인

3. **API 키 제한 확인**
   - HTTP referrer 제한이 올바르게 설정되어 있는지 확인:
     - `https://yago-vibe-spt.web.app/*`
     - `https://yago-vibe-spt.firebaseapp.com/*`
     - `https://yagovibe.com/*`
     - `https://www.yagovibe.com/*`
     - `http://localhost:5173/*`
     - `http://127.0.0.1:5173/*`

4. **API 제한 확인**
   - "키 제한"이 선택되어 있는지 확인
   - "Firebase Authentication API"가 허용되어 있는지 확인

### Step 3: Firebase Console API 키 확인

1. **Firebase Console 접속**
   - https://console.firebase.google.com/project/yago-vibe-spt
   - 프로젝트 설정 > 일반 탭

2. **웹 앱 설정 확인**
   - "내 앱" 섹션에서 웹 앱 선택
   - Firebase SDK snippet에서 API 키 확인
   - `.env.local`의 `VITE_FIREBASE_API_KEY`와 일치하는지 확인

### Step 4: 재배포

```bash
# 1. 재빌드
npm run build

# 2. Firebase Hosting 배포
firebase deploy --only hosting
```

---

## 🔧 즉시 해결 방법

### 방법 1: API 키 제한 완전 제거 (테스트용)

**⚠️ 주의: 프로덕션에서는 권장하지 않음**

1. Google Cloud Console > API 및 서비스 > 사용자 인증 정보
2. API 키 클릭
3. "애플리케이션 제한사항" → "키 제한 안함" 선택
4. 저장

### 방법 2: API 키 재생성

1. Google Cloud Console > API 및 서비스 > 사용자 인증 정보
2. API 키 삭제 또는 새로 생성
3. Firebase Console에서 새 API 키로 업데이트
4. `.env.local` 파일 업데이트
5. 재빌드 및 재배포

---

## 📋 체크리스트

### 빌드 확인
- [ ] `dist` 폴더 삭제 후 재빌드
- [ ] 빌드된 파일에 API 키가 포함되어 있는지 확인
- [ ] Firebase Hosting 재배포

### Google Cloud Console 확인
- [ ] API 키가 올바른 프로젝트의 것인지 확인
- [ ] HTTP referrer 제한이 올바르게 설정되어 있는지 확인
- [ ] API 제한에서 "Firebase Authentication API"가 허용되어 있는지 확인

### Firebase Console 확인
- [ ] Firebase Console의 API 키와 `.env.local`의 API 키가 일치하는지 확인
- [ ] 웹 앱 설정이 올바른지 확인

---

## 🚨 문제가 계속 발생하는 경우

### 1. 브라우저 콘솔에서 API 키 확인

```javascript
// 브라우저 콘솔에서 실행
console.log("API Key:", import.meta.env.VITE_FIREBASE_API_KEY);
```

- `undefined` → 환경 변수가 빌드에 포함되지 않음
- 플레이스홀더 값 → `.env.local` 파일 확인 필요
- 실제 API 키 → Google Cloud Console 설정 확인 필요

### 2. 네트워크 요청 확인

1. F12 → Network 탭
2. Google 로그인 버튼 클릭
3. Firebase Auth 요청 확인
4. 요청 헤더에서 API 키 확인

### 3. Firebase Console 로그 확인

1. Firebase Console > Authentication > 사용자
2. 로그인 시도 기록 확인
3. 오류 메시지 확인

---

## ✅ 완료

**무한 루프는 해결되었습니다!** ✅

이제 `auth/api-key-not-valid` 오류를 해결하기 위해:
1. 빌드 재실행 (환경 변수 포함 확인)
2. Google Cloud Console API 키 제한 확인
3. Firebase Hosting 재배포

문제가 계속 발생하면 브라우저 콘솔의 상세 오류 메시지를 공유해주세요.

