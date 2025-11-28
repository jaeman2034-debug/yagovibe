# 🔍 리디렉션 URI는 정상 - 다른 원인 확인

## ✅ 확인 완료

- 리디렉션 URI: 모두 `__/auth/handler` (언더스코어 2개)로 올바르게 설정됨 ✅

## 🔍 다른 가능한 원인들

### 1️⃣ 클라이언트 ID 불일치

**확인 필요:**
- Firebase Console의 "웹 클라이언트 ID"
- Google Cloud Console의 OAuth 클라이언트 ID
- 두 값이 **완전히 동일**해야 함

**확인 방법:**
1. Firebase Console → Authentication → Sign-in method → Google
2. "웹 클라이언트 ID" 필드 확인
3. Google Cloud Console의 클라이언트 ID와 비교

### 2️⃣ 클라이언트 Secret 불일치

**확인 필요:**
- Firebase Console의 "웹 클라이언트 보안 비밀번호"
- Google Cloud Console의 클라이언트 Secret
- 두 값이 **일치**해야 함

### 3️⃣ 프로젝트 지원 이메일 미설정

**확인 필요:**
- Firebase Console → Authentication → Settings
- "프로젝트 지원 이메일"이 올바르게 설정되어 있는지

### 4️⃣ OAuth 동의 화면 설정

**확인 필요:**
- Google Cloud Console → APIs & Services → OAuth consent screen
- 앱이 "테스트" 상태인지 "프로덕션" 상태인지
- 승인된 사용자 목록 확인

## 🎯 다음 확인 사항

1. **Firebase Console → Authentication → Sign-in method → Google**
   - 웹 클라이언트 ID가 Google Cloud Console과 일치하는지 확인
   - 웹 클라이언트 Secret이 일치하는지 확인

2. **Firebase Console → Authentication → Settings**
   - 프로젝트 지원 이메일 확인

3. **Google Cloud Console → APIs & Services → OAuth consent screen**
   - 앱 상태 확인
   - 승인된 도메인 확인

## 📸 확인 필요

Firebase Console → Authentication → Sign-in method → Google 화면에서:
- 웹 클라이언트 ID
- 웹 클라이언트 보안 비밀번호 (마스킹되어 있어도 됨)

이 값들을 Google Cloud Console의 값과 비교해주세요.

