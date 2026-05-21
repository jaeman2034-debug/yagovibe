# 📱 실전 전화번호 인증 모드 체크리스트

## 🔥 핵심 원칙

**Phone Auth는 App Check/Enterprise와 완전히 분리됩니다.**
- Phone Auth: RecaptchaVerifier(v2 Invisible) 단독 사용
- App Check: Firestore/Functions 보호용 (Phone Auth 무관)
- Enterprise: 대규모 트래픽 분석용 (Phone Auth 무관)

**"Failed to initialize reCAPTCHA Enterprise" 경고는 Phone Auth에 영향 없습니다.**

## ✅ Firebase Console 설정 (필수)

### 1. Authentication → Sign-in method
- [ ] **Phone** 활성화 확인
- [ ] **테스트 전화번호(Test phone numbers) 섹션 확인**
- [ ] **등록된 테스트 번호 모두 삭제** ⚠️ 가장 중요
  - 특히 `+821056890800` 같은 번호 삭제
  - 테스트 번호가 있으면 실제 SMS 절대 안 옴

### 2. Authentication → Settings → Authorized domains
- [ ] `localhost` 확인
- [ ] `yagovibe.com` 확인
- [ ] `www.yagovibe.com` 확인
- [ ] `yago-vibe-spt.web.app` 확인

### 3. 요금제 확인
- [ ] **Blaze 요금제** 적용 확인 (실전 SMS 발송 필수)
- [ ] 무료 플랜(Spark)은 SMS 제한 있음

---

## ✅ 코드 레벨 확인 (완료)

### 1. 환경 변수
- [ ] `.env`에 `VITE_AUTH_TEST_MODE=false` 설정 (실전 모드)
- [ ] `VITE_RECAPTCHA_SITE_KEY` 설정 확인

### 2. 테스트 모드 제거
- [x] `PhoneLoginPage.tsx` - 테스트 안내 문구 환경 변수 제어
- [x] `PhoneLogin.tsx` - 테스트 안내 문구 환경 변수 제어
- [x] 테스트 자동 입력 로직 환경 변수 제어

---

## ⚠️ 중요: Enterprise 경고 해석

### "Failed to initialize reCAPTCHA Enterprise config" 경고

**의미:**
- App Check용 Enterprise 설정이 불완전함
- Firebase가 자동으로 v2로 fallback
- **Phone Auth SMS 발송에는 영향 없음**

**무시 가능:**
- ✅ Phone Auth는 RecaptchaVerifier(v2) 사용
- ✅ App Check와 Phone Auth는 별개
- ✅ v2 fallback은 정상 동작

---

## 🔍 SMS 발송 실패 시 확인 포인트

### 1. Firebase Console 확인
- Authentication → Usage → SMS 전송 이력 확인
- 일일 쿼터 초과 여부 확인

### 2. 전화번호 형식 확인
- E.164 형식 필수: `+821012345678`
- 국가 코드 포함 필수

### 3. 테스트 번호 확인
- Firebase Console에서 테스트 번호 삭제 확인
- 테스트 번호가 있으면 실제 SMS 안 옴

### 4. 통신사 필터
- 일부 통신사는 스팸 필터로 차단 가능
- 1~2분 대기 후 재시도

---

## ✅ 정상 동작 시 콘솔 로그

```
✅ [authPhone] RecaptchaVerifier 렌더링 완료
✅ [authPhone] Invisible reCAPTCHA 설정 완료
📱 [authPhone] SMS 인증번호 전송 시도: +821012345678
✅ [authPhone] SMS 인증번호 전송 성공: { verificationId: "✅ 존재" }
```

**Enterprise 경고는 무시 가능:**
```
Failed to initialize reCAPTCHA Enterprise config.  ← 이건 무시 OK
Triggering the reCAPTCHA v2 verification.          ← 정상 fallback
```

---

## 🎯 실전 테스트 순서

1. Firebase Console에서 테스트 번호 삭제
2. `.env`에 `VITE_AUTH_TEST_MODE=false` 설정
3. 개발 서버 재시작
4. 실제 전화번호로 테스트
5. 1~2분 대기 후 SMS 수신 확인

---

## 📌 핵심 정리

| 항목 | 상태 | 비고 |
|------|------|------|
| Phone Auth 코드 | ✅ 완료 | RecaptchaVerifier(v2) 사용 |
| App Check | ✅ 완료 | Enterprise 경고는 무시 가능 |
| 테스트 모드 제거 | ✅ 완료 | 환경 변수 제어 |
| Firebase Console | ⚠️ 확인 필요 | 테스트 번호 삭제 필수 |

---

## 🚀 다음 단계

1. Firebase Console에서 테스트 번호 삭제
2. 실제 전화번호로 SMS 발송 테스트
3. SMS 수신 확인

**SMS가 안 오면:**
- Firebase Console → Authentication → Usage 확인
- 일일 쿼터 확인
- 통신사 필터 확인
