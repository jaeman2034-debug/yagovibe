# 🔍 로컬 환경 Google 로그인 문제 분석

## 📊 오류 분석

### **오류 메시지:**
```
"Requests from referer https://yago-vibe-spt.firebaseapp.com/ are blocked."
"reason": "API_KEY_HTTP_REFERRER_BLOCKED"
```

### **오류 발생 위치:**
- **브라우저 URL**: `localhost:5173/login` (로컬 환경)
- **실제 요청 도메인**: `https://yago-vibe-spt.firebaseapp.com/` (Firebase 인증 핸들러)

---

## 🔍 원인 분석

### **Firebase 인증 동작 방식:**

1. **로컬 환경에서 Google 로그인 시도:**
   - 사용자가 `localhost:5173/login`에서 Google 로그인 버튼 클릭
   - Firebase가 `signInWithPopup` 또는 `signInWithRedirect` 호출

2. **Firebase 인증 핸들러 리디렉션:**
   - Firebase가 OAuth 인증을 위해 `https://yago-vibe-spt.firebaseapp.com/_/auth/handler`로 리디렉션
   - 이 도메인에서 Google Identity Toolkit API 호출

3. **Google API 키 검증:**
   - Google Identity Toolkit API가 요청의 리퍼러(`https://yago-vibe-spt.firebaseapp.com/`)를 확인
   - Google Cloud Console의 Browser Key HTTP 리퍼러 제한 목록과 비교
   - **`https://yago-vibe-spt.firebaseapp.com/`가 목록에 없으면 차단**

---

## ✅ 사용자 분석 검증

### **사용자 분석:**
> "로컬 환경(localhost:5173)의 정책적 제약 때문에 발생하는 것이 확인되었습니다."

### **실제 원인:**
- ❌ **로컬 환경의 정책적 제약이 아님**
- ✅ **Google Cloud Console 설정 누락**

**정확한 원인:**
- Firebase 인증 핸들러가 `https://yago-vibe-spt.firebaseapp.com/`에서 실행됨
- 이 도메인이 Google Cloud Console의 리퍼러 목록에 없음
- 따라서 Google API 키가 차단됨

---

## 🛠️ 해결 방법

### **방법 1: Google Cloud Console 설정 수정 (가장 간단하고 권장)**

**즉시 해결:**
1. Google Cloud Console → Browser Key → 웹사이트 제한사항
2. 다음 리퍼러 추가:
   - `https://yago-vibe-spt.firebaseapp.com`
   - `https://yago-vibe-spt.firebaseapp.com/`
   - `https://yago-vibe-spt.firebaseapp.com/*`
3. 저장 후 5-10분 대기
4. 브라우저 캐시 삭제
5. 재테스트

**장점:**
- ✅ 가장 간단하고 빠름
- ✅ 로컬 환경과 배포 환경 모두에서 작동
- ✅ 추가 도구나 설정 불필요

---

### **방법 2: Firebase Emulator Suite 사용 (개발 전용)**

**설정:**
1. Firebase Emulator Suite 설치
2. 로컬에서 인증 시뮬레이션
3. 실제 Google 로그인 대신 에뮬레이터 사용

**장점:**
- ✅ 실제 클라우드 환경에 데이터 기록 안 함
- ✅ 독립적으로 테스트 가능

**단점:**
- ❌ 실제 Google 로그인 플로우와 다름
- ❌ 추가 설정 필요
- ❌ 배포 환경과 다른 동작

---

### **방법 3: HTTPS 프록시 환경 구축**

**설정:**
1. Vite에서 HTTPS 활성화
2. 프록시 도구 사용
3. 포트 443 사용

**단점:**
- ❌ 복잡한 설정
- ❌ 추가 도구 필요
- ❌ 여전히 Firebase 인증 핸들러는 `firebaseapp.com` 사용

---

### **방법 4: hosts 파일 수정 및 가짜 도메인 사용**

**설정:**
1. Firebase Console에 가짜 도메인 추가
2. hosts 파일에 `127.0.0.1 dev-test.com` 추가
3. `http://dev-test.com`으로 접속

**단점:**
- ❌ 복잡한 설정
- ❌ 여전히 Firebase 인증 핸들러는 `firebaseapp.com` 사용
- ❌ 실제 배포 환경과 다름

---

## 🎯 권장 해결 방법

### **최우선: Google Cloud Console 설정 수정**

**이유:**
1. ✅ 가장 간단하고 빠름
2. ✅ 로컬 환경과 배포 환경 모두에서 작동
3. ✅ 실제 Google 로그인 플로우 테스트 가능
4. ✅ 추가 도구나 설정 불필요

**작업:**
1. Google Cloud Console → Browser Key
2. 웹사이트 제한사항에 `https://yago-vibe-spt.firebaseapp.com/` 추가
3. 저장 후 5-10분 대기
4. 재테스트

---

## 📝 결론

### **사용자 분석 평가:**

> "로컬 환경(localhost:5173)의 정책적 제약 때문에 발생하는 것이 확인되었습니다."

**부분적으로 맞지만, 정확하지 않음:**

- ✅ 로컬 환경에서 발생하는 문제는 맞음
- ❌ 하지만 "정책적 제약"이 아니라 "설정 누락"임
- ✅ Firebase 인증 핸들러가 `firebaseapp.com`에서 실행되므로, 이 도메인을 Google Cloud Console에 추가해야 함

### **실제 해결 방법:**

1. **Google Cloud Console 설정 수정** (가장 간단하고 권장)
   - `https://yago-vibe-spt.firebaseapp.com/` 리퍼러 추가
   - 저장 후 5-10분 대기
   - 재테스트

2. **Firebase Emulator Suite 사용** (개발 전용)
   - 실제 Google 로그인 대신 에뮬레이터 사용
   - 배포 환경과 다른 동작

3. **배포 환경에서 테스트** (확실한 방법)
   - 실제 배포된 서버에서 테스트
   - 가장 확실하지만 배포 필요

---

## ✅ 최종 권장사항

**즉시 해결:**
1. Google Cloud Console → Browser Key
2. 웹사이트 제한사항에 `https://yago-vibe-spt.firebaseapp.com/` 추가
3. 저장 후 5-10분 대기
4. 브라우저 캐시 삭제
5. 재테스트

**이 방법이 가장 간단하고 빠르며, 로컬 환경과 배포 환경 모두에서 작동합니다!**

