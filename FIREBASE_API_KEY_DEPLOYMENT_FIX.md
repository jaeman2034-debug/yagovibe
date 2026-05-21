# 🔧 Firebase API 키 오류 해결 가이드

## ❌ 현재 문제

### 1. `auth/api-key-not-valid` 오류
- 배포된 사이트(`yagovibe.com`)에서 Firebase API 키가 유효하지 않다는 오류 발생
- 로컬에서는 정상 작동하지만 배포 환경에서만 발생

### 2. `signInWithRedirect` 여전히 사용됨
- ✅ 수정 완료: `signInWithRedirect` 완전 제거, `signInWithPopup`만 사용

---

## 🔍 원인 분석

### Firebase API 키 문제

**가능한 원인**:
1. **빌드 시점에 환경 변수가 주입되지 않음**
   - Vite는 빌드 시점에 환경 변수를 번들에 포함시킴
   - `.env.local` 파일이 빌드 시점에 없으면 환경 변수가 빈 문자열이 됨

2. **배포 환경 변수 설정 누락**
   - Firebase Hosting은 환경 변수를 직접 지원하지 않음
   - 빌드 시점에 환경 변수가 있어야 함

3. **환경 변수 파일이 `.gitignore`에 포함됨**
   - `.env.local`이 Git에 커밋되지 않아 배포 시 누락될 수 있음

---

## ✅ 해결 방법

### 방법 1: 빌드 전 환경 변수 확인 (권장)

#### Step 1: `.env.local` 파일 확인
프로젝트 루트에 `.env.local` 파일이 있고, 실제 Firebase API 키가 설정되어 있는지 확인:

```env
VITE_FIREBASE_API_KEY=AIzaSy...실제키...
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=yago-vibe-spt
VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-spt.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=실제값
VITE_FIREBASE_APP_ID=실제값
```

#### Step 2: 빌드 시 환경 변수 확인
```bash
npm run build
```

빌드 로그에서 다음을 확인:
```
✅ [vite.config.ts] .env.local에서 API 키 로드: AIzaSyCJOa...
```

#### Step 3: 빌드된 파일 확인
```bash
# dist 폴더의 index.html 또는 JS 파일에서 API 키 확인
# (보안상 실제 키는 표시되지 않지만, 빈 문자열이 아닌지 확인)
```

#### Step 4: 배포
```bash
firebase deploy --only hosting
```

---

### 방법 2: Firebase Console에서 API 키 확인

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com/project/yago-vibe-spt/settings/general
   ```

2. **웹 앱 설정 확인**
   - "내 앱" 섹션에서 웹 앱(🌐) 클릭
   - "Firebase SDK snippet" 탭 선택
   - `apiKey` 값 복사

3. **`.env.local` 파일 업데이트**
   ```env
   VITE_FIREBASE_API_KEY=복사한_API_키
   ```

4. **재빌드 및 재배포**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

---

### 방법 3: GitHub Actions 자동 배포 사용 시

GitHub Actions를 사용하는 경우, GitHub Secrets에 환경 변수를 설정해야 합니다:

1. **GitHub Repository → Settings → Secrets → Actions**
2. **New secret 추가**:
   - `VITE_FIREBASE_API_KEY`: Firebase API 키
   - `VITE_FIREBASE_AUTH_DOMAIN`: `yago-vibe-spt.firebaseapp.com`
   - `VITE_FIREBASE_PROJECT_ID`: `yago-vibe-spt`
   - 기타 필요한 환경 변수들

3. **워크플로우 파일 확인**
   - `.github/workflows/deploy.yml`에서 환경 변수가 제대로 사용되는지 확인

---

## 🔧 코드 수정 완료

### ✅ `signInWithRedirect` 완전 제거

**수정 내용**:
1. `signInWithRedirect` import 제거
2. `canUsePopup()` 함수 제거
3. 모든 `signInWithRedirect` 호출 제거
4. `signInWithPopup`만 사용하도록 수정
5. 팝업 실패 시에도 redirect로 fallback하지 않고 에러 메시지만 표시

**수정된 파일**:
- `src/pages/LoginPage.tsx`

---

## 📋 배포 체크리스트

### 빌드 전 확인
- [ ] `.env.local` 파일 존재 확인
- [ ] `VITE_FIREBASE_API_KEY`가 실제 값으로 설정되어 있는지 확인
- [ ] 빌드 로그에서 API 키 로드 확인

### 빌드
- [ ] `npm run build` 실행
- [ ] 빌드 성공 확인
- [ ] `dist` 폴더 생성 확인

### 배포
- [ ] `firebase deploy --only hosting` 실행
- [ ] 배포 성공 확인

### 배포 후 확인
- [ ] `https://yagovibe.com/login` 접속
- [ ] `auth/api-key-not-valid` 오류 해결 확인
- [ ] Google 로그인 버튼 클릭 테스트
- [ ] `signInWithRedirect` 호출되지 않는지 확인 (콘솔 로그)

---

## ✅ 완료

코드 수정이 완료되었습니다. 이제 빌드 및 배포를 다시 실행하세요:

```bash
npm run build
firebase deploy --only hosting
```

배포 후 `https://yagovibe.com/login`에서 테스트하세요.

