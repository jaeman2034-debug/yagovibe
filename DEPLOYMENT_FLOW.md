# 🚀 실전 테스트 배포 플로우 (Firebase 기준)

> **테스트용 실배포(운영 안전) 상태 만들기**

---

## 🎯 목표

* 실제 도메인에서 접속
* **SMS 실발송 O**
* 사고 나도 **바로 멈출 수 있는 상태**
* DEV/PROD 완전 분리

---

## 0️⃣ 배포 전 딱 3분 체크 (중요)

### 환경 변수 확인

**PowerShell에서 확인:**
```powershell
Get-Content .env | Select-String "VITE_AUTH_MODE"
```

**또는 전체 확인:**
```powershell
Get-Content .env
```

**확인할 것:**
- [ ] `VITE_AUTH_MODE=PROD` (배포 시)
- [ ] `VITE_USE_FIREBASE_EMULATOR=false` (배포 시)
- [ ] `VITE_SMS_ENABLED=true` (SMS 활성화)

**참고:** `const isProd = import.meta.env.PROD;`는 코드 파일 안에서만 사용 가능합니다.
PowerShell에서는 `.env` 파일을 직접 확인하세요.

### Firebase 콘솔 체크

#### Auth 설정

- [ ] **테스트 번호 삭제 ❌**
  - Firebase Console → Authentication → Sign-in method → Phone
  - 테스트 전화번호가 있으면 반드시 삭제
  - 테스트 번호가 있으면 실제 SMS가 발송되지 않음

- [ ] **Authorized domains 확인**
  - Firebase Console → Authentication → Settings → Authorized domains
  - 실제 도메인 추가 (예: `yourapp.web.app`, `yourapp.com`)

- [ ] **Phone Auth 활성화 확인**
  - Firebase Console → Authentication → Sign-in method → Phone
  - Phone 번호 인증이 **Enabled** 상태인지 확인

#### Firestore 설정

- [ ] **Rules 배포 확인**
  - Firebase Console → Firestore Database → Rules
  - 최신 규칙이 배포되어 있는지 확인

#### Functions 설정

- [ ] **환경 변수 확인**
  - Firebase Console → Functions → Configuration
  - 필요한 환경 변수 설정 확인

---

## 1️⃣ Hosting 배포 (프론트)

### 빌드

```bash
npm run build
```

**체크:**
- [ ] 빌드 성공
- [ ] `dist` 또는 `build` 폴더 생성 확인
- [ ] 빌드 에러 없음

### Firebase 초기화 (이미 했다면 패스)

```bash
firebase init hosting
```

**선택 사항:**
- Use an existing project: **Yes**
- Public directory: **dist** (또는 build)
- Configure as a single-page app: **Yes**
- Set up automatic builds: **No** (선택)

### 배포

```bash
firebase deploy --only hosting
```

**결과:**
```
✔ Deploy complete!

Hosting URL: https://yourapp.web.app
```

**체크:**
- [ ] 배포 성공
- [ ] URL 접속 확인
- [ ] 페이지 정상 로드 확인

---

## 2️⃣ Functions 배포 (SMS 알림 포함)

### 환경 변수 확인

```bash
firebase functions:config:get
```

**체크:**
- [ ] Slack webhook URL 설정 확인
- [ ] 필요한 환경 변수 모두 설정

### 배포

```bash
firebase deploy --only functions
```

**체크:**
- [ ] 배포 성공
- [ ] Functions 목록 확인
- [ ] 에러 없음

### Functions URL 확인

```bash
firebase functions:list
```

**체크:**
- [ ] 필요한 Functions 모두 배포됨
- [ ] URL 정상 작동 확인

---

## 3️⃣ Firestore Rules 최종 배포

```bash
firebase deploy --only firestore:rules
```

**체크:**
- [ ] `/auth_logs` read 차단 확인
- [ ] `/users.role` 수정 불가 확인
- [ ] 일반 유저 권한 확인
- [ ] Admin 권한 확인

---

## 4️⃣ 실전 테스트 시나리오 (필수 6개)

### ✅ 1. 신규 번호 가입

**절차:**
1. 실제 전화번호로 가입 시도
2. SMS 수신 확인
3. 인증번호 입력
4. 가입 완료 확인

**체크:**
- [ ] SMS 정상 수신
- [ ] 인증번호 정상 입력
- [ ] 가입 완료
- [ ] Firestore에 유저 문서 생성 확인

---

### ✅ 2. 인증번호 틀림

**절차:**
1. 잘못된 인증번호 입력
2. 에러 메시지 확인

**체크:**
- [ ] UX 메시지 정상 출력
- [ ] 재시도 가능
- [ ] 에러 메시지가 사용자 친화적인지

---

### ✅ 3. 연속 SMS 요청

**절차:**
1. 같은 번호로 연속 SMS 요청
2. 제한 메시지 확인
3. Slack 알림 확인

**체크:**
- [ ] 제한 메시지 정상 출력
- [ ] 쿨다운 타이머 작동
- [ ] Slack 알림 수신 (설정한 경우)

---

### ✅ 4. 온보딩 중 새로고침

**절차:**
1. 온보딩 중간 단계에서 새로고침
2. 이어서 진행되는지 확인

**체크:**
- [ ] 이어서 진행됨
- [ ] 입력한 데이터 유지
- [ ] 단계 정보 유지

---

### ✅ 5. 탈퇴

**절차:**
1. 탈퇴 실행
2. 재로그인 시도
3. 동일 번호 재가입 시도

**체크:**
- [ ] 재로그인 불가
- [ ] 동일 번호 재가입 가능
- [ ] Firestore에서 유저 상태 확인

---

### ✅ 6. Admin 접근

**절차:**
1. 일반 유저로 Admin 페이지 접근
2. Admin 계정으로 접근

**체크:**
- [ ] 일반 유저 접근 불가
- [ ] Admin 계정만 접근 가능
- [ ] 에러 메시지 정상 출력

---

## 5️⃣ 사고 대비 "즉시 차단 스위치" (강추)

### 프론트 임시 차단

**파일:** `src/utils/authPhone.ts` 또는 환경 변수

```typescript
// 긴급 차단 스위치
const SMS_ENABLED = true; // false로 변경하면 즉시 차단

export const sendSMSCode = async (phoneNumber: string) => {
  if (!SMS_ENABLED) {
    throw new Error("SMS temporarily disabled. Please try again later.");
  }
  
  // 기존 로직...
};
```

**또는 환경 변수로:**

```typescript
// .env
VITE_SMS_ENABLED=true

// 코드
const SMS_ENABLED = import.meta.env.VITE_SMS_ENABLED === "true";
```

**사용법:**
1. 문제 발생 시 `SMS_ENABLED = false`로 변경
2. 즉시 재배포
3. SMS 전송 차단

---

### Functions 차단

**파일:** `functions/src/index.ts`

```typescript
const SMS_ENABLED = true; // false로 변경

export const sendSMS = onCall(async (req) => {
  if (!SMS_ENABLED) {
    throw new functions.https.HttpsError(
      "unavailable",
      "SMS service temporarily disabled"
    );
  }
  
  // 기존 로직...
});
```

---

## 6️⃣ 실전 테스트 배포 모드 요약

| 항목 | 상태 | 체크 |
|------|------|------|
| 실 도메인 | ✅ | [ ] |
| 실 SMS | ✅ | [ ] |
| DEV 분기 | ❌ | [ ] |
| 로그 수집 | ✅ | [ ] |
| Slack 알림 | ✅ | [ ] |
| 관리자 확인 | ✅ | [ ] |
| 롤백 가능 | ✅ | [ ] |

👉 **이 상태면 "테스트 런칭" OK**

---

## 7️⃣ 배포 후 모니터링

### 실시간 확인

- [ ] Firebase Console → Authentication → Users
- [ ] Firebase Console → Firestore → Data
- [ ] Firebase Console → Functions → Logs
- [ ] Slack 알림 (설정한 경우)

### 지표 확인

- [ ] SMS 성공률
- [ ] 온보딩 완료율
- [ ] 에러 발생률
- [ ] 사용자 수

---

## 🔥 다음 액션 (지금 바로)

1. **지인 3명**에게 링크 전달
2. Admin 대시보드 열어놓고
3. SMS 로그 실시간 확인
4. 문제 생기면 **즉시 차단**

---

## 🚨 문제 발생 시 대응

### SMS 과다 발송

1. 즉시 차단 스위치 OFF
2. Firebase Console → Authentication → Sign-in method → Phone → Disable
3. 원인 분석
4. 수정 후 재배포

### 에러 발생

1. Firebase Console → Functions → Logs 확인
2. 에러 원인 파악
3. 긴급 수정 또는 롤백
4. 재배포

### 보안 문제

1. 즉시 차단 스위치 OFF
2. Firestore Rules 확인
3. 권한 재설정
4. 재배포

---

## ✅ 배포 체크리스트

### 배포 전

- [ ] 환경 변수 확인
- [ ] Firebase 콘솔 설정 확인
- [ ] 테스트 번호 삭제
- [ ] 빌드 성공 확인

### 배포 중

- [ ] Hosting 배포
- [ ] Functions 배포
- [ ] Firestore Rules 배포
- [ ] 배포 성공 확인

### 배포 후

- [ ] 실전 테스트 시나리오 6개 실행
- [ ] 모니터링 설정
- [ ] 즉시 차단 스위치 테스트
- [ ] 지인 테스트

---

## 🎯 완료 기준

- [ ] 실제 도메인에서 접속 가능
- [ ] SMS 정상 발송
- [ ] 모든 테스트 시나리오 통과
- [ ] 모니터링 설정 완료
- [ ] 즉시 차단 스위치 작동 확인

---

## 🏁 마지막으로 한 마디

**지금 이 단계는**

> **"코드 배포"가 아니라 "서비스 첫 호흡"**이다.

문제 나와도 정상이고
그걸 **바로 볼 수 있게 만들어 둔 게 이미 승리**다.

---

## 다음 단계

* **"실배포 후 체크리스트"**
* **"트래픽 늘렸을 때 대비"**
* **"운영 중 터지는 문제 TOP10"**

한 단어만 던져. 계속 같이 간다 👊
