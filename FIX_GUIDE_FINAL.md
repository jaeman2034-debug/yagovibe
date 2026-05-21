# 🚨 최종 해결 가이드: API 키 오타 + 리퍼러 누락

## 📊 발견된 두 가지 문제

### **문제 1: API 키 오타 (치명적)**
- **현재 키**: `AlzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY` (잘못됨)
- **올바른 형식**: `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY` (첫 글자는 **AI**)

### **문제 2: 리퍼러 누락**
- **현재 도메인**: `127.0.0.1:5173`
- **누락된 리퍼러**: `http://127.0.0.1:5173/*`

---

## 🛠️ 해결 방법

### **1단계: API 키 오타 수정 (최우선)**

#### **A. `.env.local` 파일 수정**

1. **프로젝트 루트 디렉토리에서 `.env.local` 파일 열기**

2. **`VITE_FIREBASE_API_KEY` 찾기**

3. **오타 수정:**
   ```env
   # ❌ 잘못된 형식 (현재)
   VITE_FIREBASE_API_KEY=AlzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY
   
   # ✅ 올바른 형식 (수정 후)
   VITE_FIREBASE_API_KEY=AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY
   ```
   **중요**: 첫 글자는 `AI`여야 합니다! (`Al`이 아니라 `AI`)

4. **저장**

#### **B. Google Cloud Console에서 올바른 API 키 확인**

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt

2. **Browser Key 목록 확인**
   - `AIzaSy...`로 시작하는 키 찾기
   - `AlzaSy...`로 시작하는 키는 잘못된 키

3. **올바른 API 키를 `.env.local`에 설정**

---

### **2단계: Google Cloud Console에 `127.0.0.1` 리퍼러 추가**

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt

2. **Browser Key 선택**
   - `AIzaSy...`로 시작하는 올바른 키 클릭

3. **편집 버튼 클릭**

4. **웹사이트 제한사항에 추가**
   - "Application restrictions" → "HTTP referrers (web sites)" 선택
   - "+ Add" 버튼 클릭
   - `http://127.0.0.1:5173/*` 추가
   - 저장 버튼 클릭

5. **5-10분 대기** (설정 적용 시간)

---

### **3단계: 브라우저 캐시 삭제 및 재시작**

1. **개발 서버 종료**
   - `Ctrl+C`로 현재 실행 중인 서버 종료

2. **브라우저 캐시 삭제**
   - `Ctrl+Shift+R` (강제 새로고침)
   - 또는 개발자 도구 → Application → Clear storage

3. **개발 서버 재시작**
   ```bash
   npm run dev
   ```

4. **재테스트**
   - `http://127.0.0.1:5173/login` 접속
   - Google 로그인 버튼 클릭
   - 오류 해결 확인

---

## 📋 최종 리퍼러 목록 (추가 후)

다음 리퍼러가 **모두** 등록되어 있어야 합니다:

```
http://localhost:5173/*
http://127.0.0.1:5173/*                    ← 추가 필요!
https://www.yagovibe.com/*
https://yago-vibe-spt.firebaseapp.com
https://yago-vibe-spt.firebaseapp.com/
https://yago-vibe-spt.firebaseapp.com/*
https://yago-vibe-spt.web.app/*
https://yagovibe.com/*
```

---

## ✅ 해결 확인 방법

### **오류가 해결되었는지 확인:**

1. **콘솔에서 다음 오류가 없어야 함:**
   - ❌ `auth/requests-from-referer-http://127.0.0.1:5173-are-blocked.`
   - ❌ `403 PERMISSION_DENIED`
   - ❌ `API_KEY_HTTP_REFERRER_BLOCKED`
   - ❌ `AlzaSy...` (API 키 오타)

2. **API 키 확인:**
   - 브라우저 콘솔에서 `auth.app.options.apiKey` 확인
   - `AIzaSy...`로 시작하는지 확인 (올바른 형식)

3. **Google 로그인 버튼 클릭 시:**
   - ✅ 오류 없음
   - ✅ Google 계정 선택 화면 표시
   - ✅ 또는 정상적인 리디렉션

---

## 🎯 우선순위

### **최우선:**
1. ✅ **API 키 오타 수정** (`.env.local` 파일)
   - `AlzaSy` → `AIzaSy` (첫 글자는 `AI`)

### **중간 우선순위:**
2. ✅ **`http://127.0.0.1:5173/*` 리퍼러 추가**
   - Google Cloud Console에 추가

### **저장 및 대기:**
3. ✅ **저장 후 5-10분 대기**
4. ✅ **브라우저 캐시 삭제**
5. ✅ **개발 서버 재시작**
6. ✅ **재테스트**

---

## 💡 중요 참고사항

### **API 키 오타:**
- `AlzaSy` → `AIzaSy` (첫 글자는 **AI**)
- 이것은 치명적인 오류입니다
- Google API 호출이 실패할 수 있습니다
- `.env.local` 파일에서 즉시 수정해야 합니다

### **리퍼러 패턴:**
- `localhost`와 `127.0.0.1`은 다르게 인식됩니다
- 둘 다 등록하는 것이 안전합니다

---

## 🎉 예상 결과

### **설정 적용 후:**
- ✅ Google 로그인 버튼 클릭 시 오류 없음
- ✅ Firebase 인증 핸들러 정상 작동
- ✅ Google 계정 선택 화면 표시
- ✅ 로그인 성공 후 `/sports-hub`로 리디렉션
- ✅ 콘솔에서 다음 오류가 없어야 함:
  - ❌ `403 PERMISSION_DENIED`
  - ❌ `API_KEY_HTTP_REFERRER_BLOCKED`
  - ❌ `Requests from referer http://127.0.0.1:5173 are blocked.`
  - ❌ `AlzaSy...` (API 키 오타)

---

## 🚨 현재 상태

### **문제:**
- ❌ `http://127.0.0.1:5173/*` 리퍼러 누락
- ❌ API 키 오타: `AlzaSy` → `AIzaSy` (치명적)

### **해결:**
- [ ] `.env.local` 파일에서 API 키 오타 수정 (`AlzaSy` → `AIzaSy`)
- [ ] Google Cloud Console에 `http://127.0.0.1:5173/*` 리퍼러 추가
- [ ] 저장 후 5-10분 대기
- [ ] 브라우저 캐시 삭제
- [ ] 개발 서버 재시작
- [ ] 재테스트

---

## ✅ 결론

**두 가지 문제가 있습니다:**

1. **API 키 오타** (치명적) - `.env.local` 파일 수정 필요
2. **`127.0.0.1` 리퍼러 누락** - Google Cloud Console에 추가 필요

**즉시 해결해야 합니다!**

