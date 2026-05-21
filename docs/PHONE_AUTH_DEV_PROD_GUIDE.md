# 🔥 Phone Auth 운영/개발 자동 분기 가이드

## 📋 개요

Firebase Phone Auth는 **환경에 따라 자동으로 분기**됩니다:
- **개발 환경 (DEV)**: Firebase Console 테스트 번호 사용 (SMS 발송 없음)
- **운영 환경 (PROD)**: 실제 SMS 발송

---

## ✅ 현재 구현 상태

### 1️⃣ 자동 분기 로직

**파일:** `src/utils/authPhone.ts`

```typescript
// 🔥 운영/개발 자동 분기
const isProd = import.meta.env.PROD;
const IS_DEV = !isProd;

if (IS_DEV) {
  console.log("🧪 [authPhone] DEV MODE - 테스트 번호 경로");
  console.log("🧪 [authPhone] Firebase Console 테스트 번호 사용:", phoneNumber);
} else {
  console.log("🚀 [authPhone] PROD MODE - 실 SMS 전송");
}
```

### 2️⃣ 테스트 번호 차단 (운영 환경)

```typescript
const TEST_PHONE = "+821056890800";

// 운영 환경에서 테스트 번호 차단 (사고 방지)
if (isProd && phoneNumber === TEST_PHONE) {
  throw new Error("🚫 테스트 번호는 운영 환경에서 사용할 수 없습니다.");
}
```

---

## 🎯 Firebase Console 설정

### 개발 환경 (DEV)

1. **Firebase Console → Authentication → Sign-in method → Phone**
2. **"테스트용 전화번호(선택사항)" 섹션**
3. 테스트 번호 추가:
   - 전화번호: `+821056890800`
   - 인증 코드: `123456`
4. **저장**

👉 개발 중에는 실제 SMS 없이 테스트 가능

---

### 운영 환경 (PROD)

1. **Firebase Console → Authentication → Sign-in method → Phone**
2. **"테스트용 전화번호(선택사항)" 섹션**
3. **모든 테스트 번호 삭제** ⚠️ 중요
4. **저장**

👉 운영 환경에서는 반드시 테스트 번호를 삭제해야 실제 SMS가 발송됩니다

---

## 🔍 환경 변수 확인

### `.env` 파일

```env
# 개발/운영 자동 분기 (Vite 기본값 사용)
# import.meta.env.PROD = true → 운영
# import.meta.env.PROD = false → 개발

# 테스트 모드 (선택사항)
VITE_AUTH_TEST_MODE=false

# App Check (Phone Auth와 무관)
VITE_USE_APP_CHECK=false
```

---

## 📊 동작 흐름

### 개발 환경 (DEV)

```
사용자 입력: +821056890800
  ↓
코드: DEV MODE 감지
  ↓
Firebase Console 테스트 번호 사용
  ↓
SMS 발송 없음 (테스트 코드 사용)
  ↓
인증 코드: 123456 (Firebase Console 설정값)
```

### 운영 환경 (PROD)

```
사용자 입력: +821012345678
  ↓
코드: PROD MODE 감지
  ↓
reCAPTCHA v2 검증
  ↓
실제 SMS 발송
  ↓
인증 코드: 실제 SMS로 수신
```

---

## ✅ 체크리스트

### 개발 환경

- [ ] Firebase Console에 테스트 번호 등록
- [ ] `import.meta.env.PROD = false` 확인
- [ ] 테스트 번호로 로그인 테스트

### 운영 환경

- [ ] Firebase Console에서 테스트 번호 삭제
- [ ] `import.meta.env.PROD = true` 확인
- [ ] 실제 번호로 SMS 발송 테스트
- [ ] SMS 수신 확인

---

## 🚨 주의사항

1. **운영 환경에서 테스트 번호 사용 금지**
   - 코드 레벨에서 차단됨
   - 사고 방지

2. **Firebase Console 설정 우선**
   - 테스트 번호가 있으면 실제 SMS가 발송되지 않음
   - 운영 환경에서는 반드시 삭제

3. **환경 변수 확인**
   - `import.meta.env.PROD` 값 확인
   - 빌드 모드에 따라 자동 분기

---

## 📞 문제 해결

### 문제: 개발 환경에서도 실제 SMS가 발송됨

**원인:**
- Firebase Console에 테스트 번호가 없음
- 또는 `import.meta.env.PROD = true`로 설정됨

**해결:**
1. Firebase Console에 테스트 번호 등록
2. 개발 서버 재시작 (`npm run dev`)

---

### 문제: 운영 환경에서 SMS가 발송되지 않음

**원인:**
- Firebase Console에 테스트 번호가 등록되어 있음

**해결:**
1. Firebase Console → Authentication → Sign-in method → Phone
2. 테스트 번호 삭제
3. 저장
4. 페이지 새로고침 후 다시 테스트

---

## 🎯 성공 기준

### 개발 환경

- ✅ 테스트 번호로 로그인 성공
- ✅ 실제 SMS 발송 없음
- ✅ 콘솔에 "DEV MODE" 로그 표시

### 운영 환경

- ✅ 실제 번호로 SMS 수신
- ✅ 인증번호 입력 화면으로 전환
- ✅ 콘솔에 "PROD MODE" 로그 표시
