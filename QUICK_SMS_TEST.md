# 🔥 SMS 인증 빠른 확인 가이드

## ✅ 이전에 성공했었다면...

이전에 SMS 인증이 성공했다면, 지금 문제는 **일시적**일 가능성이 높습니다.

---

## 🧪 빠른 테스트 방법

### 1️⃣ 운영 도메인에서 테스트 (가장 확실)

```
https://www.yagovibe.com/login/phone
```

**장점:**
- ✅ localhost 도메인 문제 없음
- ✅ Firebase 설정 완료됨
- ✅ 즉시 테스트 가능

---

### 2️⃣ localhost에서 테스트 (개발 중)

```
http://localhost:5173/login/phone
```

**확인 사항:**
1. **브라우저 콘솔 열기** (F12)
2. **SMS 전송 버튼 클릭**
3. **콘솔 로그 확인:**

```
✅ 정상 흐름:
🔐 [authPhone] reCAPTCHA 초기화 시작...
✅ [authPhone] RecaptchaVerifier 렌더링 완료
📱 [authPhone] SMS 인증번호 전송 시도: +8210...
⏳ [authPhone] Promise.race 시작 (SMS 전송 대기 중...)
✅ [authPhone] signInWithPhoneNumber 성공
✅ [authPhone] Promise.race 완료 - confirmationResult 받음

❌ 문제 흐름:
⏳ [authPhone] Promise.race 시작 (SMS 전송 대기 중...)
(여기서 멈춤)
⏱️ [authPhone] SMS 전송 타임아웃 (30초 초과)
```

---

## 🔍 문제 진단

### Case 1: 타임아웃 발생
**원인:** Firebase Phone Auth 응답 없음
**해결:**
- Firebase Console → Authentication → Settings → 승인된 도메인
- `localhost` 확인
- 브라우저 캐시 삭제 후 재시도

### Case 2: reCAPTCHA 설정 실패
**원인:** 컨테이너 없음 또는 verifier 초기화 실패
**해결:**
- `index.html`의 `<div id="recaptcha-container"></div>` 확인
- 페이지 새로고침

### Case 3: 정상 작동
**결과:** SMS 수신 → 인증번호 입력 → 로그인 성공

---

## 📋 체크리스트

- [ ] 운영 도메인에서 테스트 (`www.yagovibe.com`)
- [ ] localhost에서 테스트 (`localhost:5173`)
- [ ] 브라우저 콘솔 로그 확인
- [ ] Firebase Console → 승인된 도메인 확인
- [ ] 브라우저 캐시 삭제 후 재시도

---

## 🎯 다음 단계

**테스트 후 결과 알려주세요:**
1. 어떤 도메인에서 테스트했나요? (localhost / 운영)
2. 콘솔 로그에 어떤 메시지가 나오나요?
3. SMS가 수신되나요?

**이전에 성공했었다면, 지금도 작동해야 합니다!** 🚀
