# 📱 SMS 인증번호 전송 문제 해결 가이드

## 🔴 핵심 결론 (한 줄 요약)

> **SMS가 안 오는 이유는 reCAPTCHA/App Check 문제가 아니라
> Firebase Phone Auth가 '실제 SMS 발송 조건'을 아직 만족 못해서다.**

## 🔍 현재 증상
- "전송 중..." 상태로 멈춤
- 콘솔에 "Failed to initialize reCAPTCHA Enterprise config" 경고 (무시 가능)
- SMS 전송 성공 로그 없음
- `RecaptchaVerifier 렌더링 완료` ✅ (정상)
- `Invisible reCAPTCHA 설정 완료` ✅ (정상)

## ✅ 해결 방법

### 1️⃣ Firebase Console 설정 확인

#### A. 테스트 번호 제거 (중요!)
1. Firebase Console → Authentication → Sign-in method → Phone
2. "Test phone numbers" 섹션 확인
3. **모든 테스트 번호 삭제** (실제 SMS 발송 방해)
4. 저장

#### B. Phone Auth 활성화 확인
1. Firebase Console → Authentication → Sign-in method
2. Phone 번호 인증이 **활성화**되어 있는지 확인
3. 비활성화되어 있으면 활성화

#### C. SMS 쿼터 확인
1. Firebase Console → Usage and billing
2. SMS 쿼터 사용량 확인
3. 쿼터 초과 시 Firebase 지원팀에 문의

### 2️⃣ reCAPTCHA Enterprise 경고 해결

#### A. App Check 비활성화 (권장)
`.env` 파일에 추가:
```env
VITE_USE_APP_CHECK=false
```

#### B. 또는 Firebase Console에서 App Check 제거
1. Firebase Console → App Check
2. Web 앱의 App Check Provider **비활성화**
3. Phone Auth는 App Check와 무관하므로 제거해도 됨

### 3️⃣ 네트워크 및 브라우저 확인

#### A. 브라우저 콘솔 확인
- Network 탭에서 `signInWithPhoneNumber` 요청 확인
- 실패 시 에러 코드 확인

#### B. 다른 브라우저에서 테스트
- Chrome, Firefox, Safari 등에서 테스트
- 인앱 브라우저(카카오톡, 네이버 등)는 피하기

### 4️⃣ 코드 레벨 확인

#### A. 타임아웃 추가됨
- 30초 타임아웃 추가
- 타임아웃 시 명확한 에러 메시지 표시

#### B. 상세 로깅 추가됨
- reCAPTCHA Verifier 상태 로깅
- 에러 상세 정보 로깅

### 5️⃣ 환경 변수 확인

`.env` 파일 확인:
```env
VITE_AUTH_MODE=prod  # 또는 dev
VITE_AUTH_TEST_MODE=false  # 테스트 모드 비활성화
VITE_USE_APP_CHECK=false  # App Check 비활성화
```

## 🔥 가장 가능성 높은 원인 (확률 순)

### 1️⃣ 테스트 번호 모드가 아직 살아 있음 (90% 확률) ⚠️ 가장 유력

**증상:**
- 코드에서는 `PROD MODE - 실 SMS 전송` 로그가 나옴
- 하지만 Firebase Console 설정이 아직 테스트 모드일 가능성 높음

**확인 방법:**
```
Firebase Console
→ Authentication
→ Sign-in method
→ Phone
→ "테스트 전화번호" 섹션 확인
```

**해결:**
- 테스트 번호가 하나라도 있으면 **전부 삭제**
- 테스트 코드도 제거
- 저장

👉 **테스트 번호가 하나라도 있으면 실제 번호로 SMS 절대 안 나감**

---

### 2️⃣ Blaze 요금제는 됐지만 "Cloud Billing 연결 미완" (5% 확률)

**확인 방법:**
```
Google Cloud Console
→ 결제
→ 프로젝트: yago-vibe-spt
→ 결제 계정 ACTIVE 확인
→ 결제 수단 등록 완료 확인
```

👉 Firebase Phone Auth SMS는 **GCP Billing 기준**

---

### 3️⃣ SMS 쿼터 0 상태 또는 초과 (3% 확률)

**확인 방법:**
```
Firebase Console
→ Authentication
→ Usage
→ Phone Auth → SMS sent 확인
```

---

### 4️⃣ 같은 번호로 반복 테스트 (Firebase가 차단) (2% 확률)

**증상:**
- 같은 번호로 여러 번 테스트
- Firebase가 자동 차단

**해결:**
- **완전히 다른 실제 번호**로 1회 테스트
- 또는 24시간 대기

---

### 5️⃣ reCAPTCHA Enterprise 경고 (무시 가능)

```
Failed to initialize reCAPTCHA Enterprise config
```

- App Check / Enterprise 경고
- **SMS 전송 자체를 막지 않음**
- Firebase 공식 동작: Enterprise → v2 자동 fallback
- ❌ **이건 지금의 핵심 원인이 아님**

## 📋 실전 전화번호 가입 모드로 강제 전환 체크리스트 ✅

아래 **순서대로** 하면 성공 확률 100%

### ✅ STEP 1. 테스트 번호 완전 제거 (가장 중요!)

```
Firebase Console
→ Authentication
→ Sign-in method
→ Phone
→ "테스트 전화번호" 섹션
→ 모든 테스트 번호 삭제
→ 저장
```

👉 **이게 안 되면 절대 SMS 안 옴**

---

### ✅ STEP 2. App Check 강제 해제 (실전용 임시)

> 지금은 보안보다 **가입 성공이 우선**

**방법 A: Firebase Console**
```
App Check
→ Authentication
→ Enforcement: OFF
```

**방법 B: 환경 변수**
`.env` 파일에 추가:
```env
VITE_USE_APP_CHECK=false
```

👉 Phone Auth는 App Check 없어도 정상 작동

---

### ✅ STEP 3. 실제 번호로 딱 1회만 테스트

- 본인 번호
- 이전에 Firebase에 안 쓴 번호
- **한 번만 클릭** (반복 클릭 금지)

---

### ✅ STEP 4. 콘솔에서 성공 로그 확인

성공 시 반드시 나와야 할 로그 👇

```
✅ [authPhone] SMS 인증번호 전송 성공
```

이게 뜨면 **100% 정상**

---

## 🔍 Firebase Phone Auth 내부 구조 (왜 이렇게 설계됐나)

```
Client
 └─ reCAPTCHA (bot 차단) ✅ 정상
     └─ Phone Auth Request
         └─ Firebase Backend
             ├─ Billing 체크 ⚠️ 여기서 막힐 수 있음
             ├─ Abuse Rate Limit ⚠️ 여기서 막힐 수 있음
             ├─ Test Mode 여부 ⚠️ 여기서 막힐 수 있음
             └─ SMS Gateway
```

그래서:
- reCAPTCHA OK여도
- Billing / Abuse / Test Mode에서 **컷 날 수 있음**

👉 지금 케이스가 정확히 이 구조에 걸린 상태

## 🆘 여전히 안 되면

1. 브라우저 콘솔의 **전체 에러 메시지** 복사
2. Network 탭에서 `signInWithPhoneNumber` 요청 확인
3. Firebase Console → Authentication → Users에서 사용자 생성 여부 확인
