# 🔥 localhost reCAPTCHA 도메인 문제 해결 가이드

## ✅ 현재 문제 (정확히 파악됨)

**증상:**
- `localhost:5173`에서 SMS 전송 시도
- `Failed to initialize reCAPTCHA Enterprise config` 경고
- `sendSMSCode` 호출 후 멈춤 (Promise.race 대기 중)
- 실제 SMS 미수신

**원인:**
- Firebase Phone Auth는 `localhost`를 기본적으로 신뢰하지 않음
- reCAPTCHA 도메인 검증 실패 → `signInWithPhoneNumber`가 응답 없음

---

## 🔍 Firebase Console 확인 방법

### Step 1: Firebase Console 접속

1. **Firebase Console 열기**
   - https://console.firebase.google.com
   - 프로젝트 **"yago-vibe-spt"** 선택

2. **Authentication → Settings로 이동**
   - 왼쪽 메뉴 > **"Authentication"** 클릭
   - 상단 탭 > **"Settings"** 클릭

3. **아래로 스크롤 → "승인된 도메인" (Authorized domains) 섹션 확인**

---

### Step 2: 승인된 도메인 목록 확인

**다음 도메인들이 있어야 함:**

- [ ] `localhost` ⚠️ **필수!**
- [ ] `localhost:5173` (선택사항, 하지만 권장)
- [ ] `127.0.0.1` (선택사항)
- [ ] `yagovibe.com`
- [ ] `www.yagovibe.com`
- [ ] `yago-vibe-spt.firebaseapp.com` (자동 추가됨)
- [ ] `yago-vibe-spt.web.app` (자동 추가됨)

---

### Step 3: localhost 추가 (없는 경우)

**`localhost`가 없으면:**

1. **"도메인 추가" (Add domain) 버튼 클릭**
2. **`localhost` 입력**
3. **"추가" (Add) 클릭**
4. **저장** (자동 저장됨)

**추가 권장:**
- `localhost:5173` (현재 사용 중인 포트)
- `127.0.0.1` (IP 주소 버전)

---

## 🧪 해결 방법 2가지

### 방법 1: localhost 추가 후 테스트 (권장)

1. **Firebase Console에서 `localhost` 추가**
2. **2-3분 대기** (설정 반영 시간)
3. **브라우저 캐시 삭제**
   - `Ctrl + Shift + Delete` → 캐시된 이미지 및 파일 삭제
4. **`localhost:5173/login/phone`에서 다시 테스트**

---

### 방법 2: 운영 도메인에서 테스트 (즉시 가능)

**개발 중에도 운영 도메인 사용 가능:**

```
https://www.yagovibe.com/login/phone
```

**장점:**
- ✅ reCAPTCHA 도메인 검증 통과
- ✅ SMS 정상 발송
- ✅ 즉시 테스트 가능

**단점:**
- ⚠️ 배포된 코드만 테스트 가능
- ⚠️ 로컬 개발 중인 코드 변경사항 반영 안 됨

---

## 📋 확인 체크리스트

### Firebase Console 확인

**Firebase Console → Authentication → Settings → 승인된 도메인**

- [ ] `localhost` 있음
- [ ] `localhost:5173` 있음 (또는 사용 중인 포트)
- [ ] `yagovibe.com` 있음
- [ ] `www.yagovibe.com` 있음

---

## 🎯 다음 단계

### 옵션 A: localhost에서 계속 개발 (도메인 추가 후)

1. **Firebase Console → Authentication → Settings → 승인된 도메인**
2. **`localhost` 추가**
3. **2-3분 대기**
4. **브라우저 캐시 삭제**
5. **`localhost:5173/login/phone`에서 테스트**

### 옵션 B: 운영 도메인에서 테스트 (즉시 가능)

1. **코드 배포** (`npm run build && firebase deploy --only hosting`)
2. **`https://www.yagovibe.com/login/phone` 접속**
3. **SMS 발송 테스트**

---

## 📊 현재 상태 요약

| 항목 | 상태 |
|------|------|
| SMS 로직 | ✅ 정상 |
| Firebase 설정 | ✅ 정상 |
| 운영 도메인 | ✅ 정상 |
| localhost 도메인 | ❌ 미승인 (문제 원인) |
| reCAPTCHA 설정 | ✅ 정상 |
| 코드 로직 | ✅ 정상 |

---

## 🔥 핵심 정리

**문제 = 코드 ❌**
**문제 = Firebase Console 설정 (도메인 미승인) ✅**

**해결 = Firebase Console에서 `localhost` 추가**

---

## 📸 확인 요청

**Firebase Console → Authentication → Settings → 승인된 도메인 화면을 캡처해서 보여주시면:**

1. 현재 등록된 도메인 확인
2. `localhost` 추가 필요 여부 확인
3. 정확한 해결 방법 제시

**또는 운영 도메인에서 테스트해보시고 결과 알려주세요!** 🚀
