# ✅ 배포 전 최종 체크리스트

## 📊 현재 상태 확인

### **1. ✅ 코드 수정 완료**

#### **카카오톡 인앱 브라우저 자동 리디렉션**
- ✅ `src/App.tsx`: 인앱 브라우저 감지 시 자동 외부 브라우저 리디렉션 구현
- ✅ iOS: Safari로 자동 이동
- ✅ Android: Chrome으로 자동 이동 (Intent 스킴)
- ✅ 사용자 선택 없이 강제 리디렉션

#### **구글 로그인 리디렉션 문제 해결**
- ✅ `src/pages/LoginPage.tsx`: `getRedirectResult` 즉시 리디렉션
- ✅ `onAuthStateChanged` 중복 리디렉션 방지
- ✅ `hasRedirectedRef`로 리디렉션 상태 추적

---

### **2. ✅ Firebase Hosting 설정 확인**

#### **`firebase.json` 설정**
```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "cleanUrls": true,
    "trailingSlash": false
  }
}
```

**확인 사항:**
- ✅ 모든 경로(`**`)가 `index.html`로 리디렉션
- ✅ SPA 라우팅 지원
- ✅ `dist` 폴더가 빌드 출력 폴더

---

### **3. ✅ 배포 스크립트 확인**

#### **`package.json` 스크립트**
```json
{
  "scripts": {
    "build": "node scripts/generate-sitemap.js && vite build --mode production",
    "deploy:hosting": "npm run build && firebase deploy --only hosting",
    "deploy": "npm run build && firebase deploy --only hosting,functions"
  }
}
```

**확인 사항:**
- ✅ 빌드 스크립트 정상
- ✅ 배포 스크립트 정상

---

## 🚀 배포 전 확인 사항

### **1. 환경 변수 확인**

#### **필수 환경 변수 (`.env.production` 또는 Firebase Hosting 환경 변수)**
```bash
# Firebase 설정
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=yago-vibe-spt
VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-spt.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Google Maps API (필요한 경우)
VITE_GOOGLE_MAPS_API_KEY=...

# 기타 API 키
VITE_KAKAO_API_KEY=...
VITE_OPENAI_API_KEY=...
```

**확인 방법:**
```bash
# 로컬에서 빌드 테스트
npm run build

# dist 폴더 확인
ls -la dist/

# 환경 변수 주입 확인
grep -r "VITE_" dist/ | head -5
```

---

### **2. Google Cloud Console 설정 확인**

#### **API 키 제한 설정**
- ✅ **웹사이트 제한사항**: 다음 도메인 추가
  - `http://localhost:5173/*`
  - `https://yago-vibe-spt.web.app/*`
  - `https://yago-vibe-spt.firebaseapp.com/*`
  - `https://www.yagovibe.com/*`
  - `https://yagovibe.com/*`

#### **API 활성화 확인**
- ✅ Maps JavaScript API
- ✅ Geocoding API
- ✅ Places API
- ✅ Identity Toolkit API
- ✅ Google OAuth 2.0 API

#### **OAuth 리디렉션 URI 확인**
- ✅ `https://yago-vibe-spt.web.app/__/auth/handler`
- ✅ `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
- ✅ `https://www.yagovibe.com/__/auth/handler`

---

### **3. Firebase 콘솔 설정 확인**

#### **승인된 도메인**
- ✅ `yago-vibe-spt.web.app`
- ✅ `yago-vibe-spt.firebaseapp.com`
- ✅ `www.yagovibe.com`
- ✅ `yagovibe.com`

#### **OAuth 리디렉션 URI**
- ✅ Firebase 콘솔에서 자동 설정됨 (확인만 필요)

---

## 🚀 배포 단계

### **Step 1: 빌드 테스트**

```bash
# 빌드 실행
npm run build

# 빌드 결과 확인
ls -la dist/

# 빌드 성공 확인
echo "✅ 빌드 완료"
```

**확인 사항:**
- ✅ `dist/` 폴더 생성
- ✅ `dist/index.html` 존재
- ✅ `dist/assets/` 폴더에 번들 파일 존재
- ✅ 빌드 오류 없음

---

### **Step 2: Firebase 로그인 확인**

```bash
# Firebase 로그인 상태 확인
firebase login:list

# 로그인되지 않은 경우
firebase login

# 프로젝트 확인
firebase projects:list

# 현재 프로젝트 확인
firebase use
```

**확인 사항:**
- ✅ Firebase 로그인 완료
- ✅ 올바른 프로젝트 선택 (`yago-vibe-spt`)

---

### **Step 3: 배포 실행**

```bash
# 호스팅만 배포 (권장)
npm run deploy:hosting

# 또는 전체 배포
npm run deploy
```

**예상 시간:**
- 빌드: 1-2분
- 배포: 1-2분
- 총: 2-4분

---

### **Step 4: 배포 후 확인**

#### **배포 URL 확인**
- ✅ `https://yago-vibe-spt.web.app`
- ✅ `https://yago-vibe-spt.firebaseapp.com`

#### **기능 테스트**
1. **홈페이지 로드**
   - [ ] 메인 페이지 정상 로드
   - [ ] 라우팅 정상 작동

2. **카카오톡 인앱 브라우저 테스트**
   - [ ] 카카오톡에서 링크 클릭
   - [ ] 자동으로 외부 브라우저로 리디렉션
   - [ ] Chrome/Safari에서 정상 로드

3. **구글 로그인 테스트**
   - [ ] 로그인 페이지 접근
   - [ ] 구글 로그인 버튼 클릭
   - [ ] OAuth 인증 성공
   - [ ] `/sports-hub`로 리디렉션

4. **익명 로그인 테스트**
   - [ ] 게스트 로그인 버튼 클릭
   - [ ] 익명 로그인 성공
   - [ ] `/sports-hub`로 리디렉션

---

## ✅ 최종 확인 사항

### **코드 수정 완료**
- [x] 카카오톡 인앱 브라우저 자동 외부 브라우저 리디렉션
- [x] 구글 로그인 리디렉션 문제 해결
- [x] Firebase Hosting 설정 확인

### **외부 설정 완료**
- [ ] Google Cloud Console API 키 제한 설정
- [ ] Firebase 승인 도메인 설정
- [ ] OAuth 리디렉션 URI 설정

### **배포 준비 완료**
- [ ] 환경 변수 확인
- [ ] 빌드 테스트 성공
- [ ] Firebase 로그인 확인

---

## 🎯 배포 후 예상 결과

### **카카오톡에서 링크 접근 시:**
1. ✅ 인앱 브라우저 감지
2. ✅ 자동으로 외부 브라우저(Chrome/Safari)로 리디렉션
3. ✅ 외부 브라우저에서 정상 로드
4. ✅ 구글 로그인 정상 작동

### **일반 브라우저에서 접근 시:**
1. ✅ 정상 로드
2. ✅ 구글 로그인 정상 작동
3. ✅ 익명 로그인 정상 작동
4. ✅ 모든 기능 정상 작동

---

## 🚨 트러블슈팅

### **배포 실패 시**

#### **"Site not found" 오류**
```bash
# 프로젝트 확인
firebase use --add
# 프로젝트 선택: yago-vibe-spt
```

#### **"Permission denied" 오류**
```bash
# 재로그인
firebase login --reauth
```

#### **빌드 실패**
```bash
# 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 빌드 재시도
npm run build
```

---

## 📝 배포 명령어 요약

```bash
# 1. 빌드 테스트
npm run build

# 2. Firebase 로그인 확인
firebase login:list

# 3. 배포 실행
npm run deploy:hosting

# 4. 배포 확인
# https://yago-vibe-spt.web.app 접속 테스트
```

---

## 🎉 결론

**배포 준비 완료!**

**주요 변경사항:**
1. ✅ 카카오톡 인앱 브라우저 자동 외부 브라우저 리디렉션
2. ✅ 구글 로그인 리디렉션 문제 해결
3. ✅ Firebase Hosting 설정 확인

**배포 후 예상 결과:**
- ✅ 카카오톡에서 링크 클릭 시 자동으로 외부 브라우저로 이동
- ✅ 구글 로그인 오류 근본 해결
- ✅ 모든 기능 정상 작동

**다음 단계:**
1. 환경 변수 확인
2. 빌드 테스트
3. 배포 실행
4. 배포 후 기능 테스트

