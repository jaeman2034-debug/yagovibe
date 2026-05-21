# 🔧 Firebase API 키 오류 최종 해결 가이드

## ❌ 현재 문제

### `auth/api-key-not-valid` 오류
- 배포된 사이트(`yagovibe.com`)에서 Firebase API 키가 유효하지 않다는 오류 발생
- 빌드 로그에서는 API 키가 로드되었다고 나오지만, 배포된 사이트에서는 작동하지 않음

---

## 🔍 원인 분석

### 가능한 원인
1. **`.env.local` 파일의 Firebase API 키가 잘못되었거나 플레이스홀더 값**
2. **Firebase Console의 API 키와 `.env.local`의 키가 일치하지 않음**
3. **빌드 시점에 환경 변수가 제대로 주입되지 않음**
4. **Firebase API 키가 제한 설정으로 인해 차단됨**

---

## ✅ 해결 방법

### Step 1: Firebase Console에서 올바른 API 키 확인

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com/project/yago-vibe-spt/settings/general
   ```

2. **웹 앱 설정 확인**
   - "내 앱" 섹션에서 웹 앱(🌐) 클릭
   - "Firebase SDK snippet" 탭 선택
   - `apiKey` 값 복사 (예: `AIzaSy...`)

3. **API 키 제한 설정 확인**
   - Google Cloud Console → APIs & Services → Credentials
   - 해당 API 키 클릭
   - "애플리케이션 제한사항" 확인
   - "HTTP 리퍼러(웹사이트)" 선택되어 있는지 확인
   - "웹사이트 제한사항"에 다음 도메인들이 포함되어 있는지 확인:
     - `https://yagovibe.com/*`
     - `https://www.yagovibe.com/*`
     - `https://yago-vibe-spt.web.app/*`
     - `https://yago-vibe-spt.firebaseapp.com/*`
     - `http://localhost:5173/*` (개발용)

---

### Step 2: .env.local 파일 업데이트

1. **프로젝트 루트의 `.env.local` 파일 열기**

2. **Firebase API 키 확인 및 업데이트**
   ```env
   VITE_FIREBASE_API_KEY=Firebase_Console에서_복사한_실제_API_키
   VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=yago-vibe-spt
   VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-spt.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=실제_값
   VITE_FIREBASE_APP_ID=실제_값
   ```

3. **중요 확인 사항**:
   - `=` 뒤에 공백이 없어야 함
   - 플레이스홀더 값(`your-firebase-api-key` 등)이 있으면 안 됨
   - 실제 Firebase Console의 값과 정확히 일치해야 함

---

### Step 3: 재빌드 및 재배포

```bash
# 1. 빌드 (환경 변수가 번들에 포함됨)
npm run build

# 빌드 로그에서 확인:
# ✅ [vite.config.ts] .env.local에서 API 키 로드: AIzaSyCJOa...
# 🔍 [firebase.ts] Firebase 설정 확인:
#   apiKey: ✅ 설정됨 (AIzaSy...)

# 2. 배포
firebase deploy --only hosting
```

---

### Step 4: 배포 후 확인

1. **브라우저에서 테스트**
   - `https://yagovibe.com/login` 접속
   - "G 구글로 로그인" 버튼 클릭
   - 콘솔에서 `auth/api-key-not-valid` 오류가 사라졌는지 확인

2. **콘솔 로그 확인**
   ```
   🔍 [firebase.ts] Firebase 설정 확인:
     apiKey: ✅ 설정됨 (AIzaSy...)
   ```

---

## 🔧 Google Cloud Console API 키 제한 설정

### API 키 제한이 활성화되어 있다면

1. **Google Cloud Console 접속**
   ```
   https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt
   ```

2. **API 키 클릭** (Firebase Console의 웹 앱 설정에 표시된 키)

3. **애플리케이션 제한사항**
   - "HTTP 리퍼러(웹사이트)" 선택

4. **웹사이트 제한사항 추가**
   ```
   https://yagovibe.com/*
   https://www.yagovibe.com/*
   https://yago-vibe-spt.web.app/*
   https://yago-vibe-spt.firebaseapp.com/*
   http://localhost:5173/*
   ```

5. **API 제한사항**
   - "키 제한" 섹션에서 다음 API들이 활성화되어 있는지 확인:
     - Identity Toolkit API
     - Firebase Authentication API

6. **저장** 클릭

---

## 📋 체크리스트

### Firebase Console 확인
- [ ] Firebase Console → 프로젝트 설정 → 웹 앱 설정 확인
- [ ] `apiKey` 값 복사
- [ ] 다른 Firebase 설정 값들도 확인

### .env.local 파일 확인
- [ ] `.env.local` 파일 존재 확인
- [ ] `VITE_FIREBASE_API_KEY`가 실제 값으로 설정되어 있는지 확인
- [ ] 플레이스홀더 값이 없는지 확인
- [ ] `=` 뒤에 공백이 없는지 확인

### Google Cloud Console 확인
- [ ] API 키 제한 설정 확인
- [ ] 웹사이트 제한사항에 모든 도메인 포함 확인
- [ ] API 제한사항에서 필요한 API 활성화 확인

### 빌드 및 배포
- [ ] `npm run build` 실행
- [ ] 빌드 로그에서 API 키 로드 확인
- [ ] `firebase deploy --only hosting` 실행
- [ ] 배포 성공 확인

### 테스트
- [ ] `https://yagovibe.com/login` 접속
- [ ] Google 로그인 버튼 클릭
- [ ] `auth/api-key-not-valid` 오류 해결 확인

---

## ✅ 완료

`.env.local` 파일의 Firebase API 키를 Firebase Console의 실제 값으로 업데이트한 후, 재빌드 및 재배포를 실행하세요:

```bash
npm run build
firebase deploy --only hosting
```

배포 후 `https://yagovibe.com/login`에서 Google 로그인을 다시 시도하세요.

