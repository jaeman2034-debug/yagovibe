# ✅ Firebase Console 확인 완료 - Google Cloud Console 확인 필요

## ✅ Firebase Console 상태

Firebase Console의 "승인된 도메인"에 다음이 포함되어 있습니다:
- ✅ `yago-vibe-spt.firebaseapp.com` (Default)
- ✅ `www.yagovibe.com` (Custom)
- ✅ `yagovibe.com` (Custom)

**Firebase Console은 문제없습니다!**

## 🔍 Google Cloud Console 확인 필요

오류 메시지: `auth/requests-from-referer-https://yago-vibe-spt.firebaseapp.com-are-blocked.`

이것은 **Google Cloud Console의 OAuth 설정** 문제입니다.

### 1️⃣ OAuth 클라이언트 ID - 승인된 JavaScript 원본

**확인 위치:**
- Google Cloud Console → APIs & Services → Credentials
- OAuth 2.0 클라이언트 ID 클릭 (Firebase 프로젝트의 것)

**확인 사항:**
- "승인된 JavaScript 원본" 섹션에 다음이 포함되어 있는지:
  - ✅ `https://yago-vibe-spt.firebaseapp.com`
  - ✅ `https://www.yagovibe.com`

**없다면 추가:**
1. "URI 추가" 버튼 클릭
2. `https://yago-vibe-spt.firebaseapp.com` 입력
3. 저장

### 2️⃣ OAuth 동의 화면 - 승인된 도메인

**확인 위치:**
- Google Cloud Console → APIs & Services → OAuth consent screen

**확인 사항:**
- "승인된 도메인" 섹션에 다음이 포함되어 있는지:
  - ✅ `yago-vibe-spt.firebaseapp.com`
  - ✅ `www.yagovibe.com`

**없다면 추가:**
1. "도메인 추가" 버튼 클릭
2. `yago-vibe-spt.firebaseapp.com` 입력
3. 저장

### 3️⃣ OAuth 클라이언트 ID - 승인된 리디렉션 URI

**확인 위치:**
- Google Cloud Console → APIs & Services → Credentials
- OAuth 2.0 클라이언트 ID 클릭

**확인 사항:**
- "승인된 리디렉션 URI" 섹션에 다음이 포함되어 있는지:
  - ✅ `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`

**없다면 추가:**
1. "URI 추가" 버튼 클릭
2. `https://yago-vibe-spt.firebaseapp.com/__/auth/handler` 입력
3. 저장

## 📝 체크리스트

### Google Cloud Console - OAuth 클라이언트 ID
- [ ] APIs & Services → Credentials → OAuth 2.0 클라이언트 ID
- [ ] "승인된 JavaScript 원본"에 `https://yago-vibe-spt.firebaseapp.com` 포함됨
- [ ] "승인된 리디렉션 URI"에 `https://yago-vibe-spt.firebaseapp.com/__/auth/handler` 포함됨

### Google Cloud Console - OAuth 동의 화면
- [ ] APIs & Services → OAuth consent screen
- [ ] "승인된 도메인"에 `yago-vibe-spt.firebaseapp.com` 포함됨

## 🎯 다음 단계

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 올바른 프로젝트 선택 (Firebase 프로젝트와 동일한 것)

2. **위 체크리스트 확인 및 수정**

3. **변경 사항 저장 후 브라우저 새로고침**

