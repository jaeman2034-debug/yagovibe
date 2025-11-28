# 🔍 Firebase Google 제공자 상세 설정 확인

## 📋 현재 상태

Firebase Console → Authentication → Sign-in method 화면에서:
- ✅ Google 제공자가 **"사용 설정됨"** 상태
- ✅ 이메일/비밀번호, 전화, 익명도 모두 활성화됨

## 🎯 다음 단계

### Google 제공자 상세 설정 확인

현재 화면에서 **"G Google"** 제공자를 **클릭**하세요.

클릭하면 다음 정보를 확인할 수 있습니다:

1. **웹 클라이언트 ID**
   - 예상 값: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
   - 이 값이 Google Cloud Console의 OAuth 클라이언트 ID와 일치해야 함

2. **웹 클라이언트 Secret**
   - Google Cloud Console의 Secret과 일치해야 함

3. **프로젝트 지원 이메일**
   - 올바른 이메일 주소가 설정되어 있어야 함

## ⚠️ 확인해야 할 사항

### 1. 웹 클라이언트 ID 일치 확인
- Firebase Console의 웹 클라이언트 ID
- Google Cloud Console의 OAuth 클라이언트 ID
- **두 값이 완전히 동일해야 함**

### 2. Google Cloud Console 확인
1. https://console.cloud.google.com 접속
2. 프로젝트: `yago-vibe-spt` 선택
3. **APIs & Services** → **Credentials**
4. **OAuth 2.0 클라이언트 ID** 확인
5. **승인된 리디렉션 URI** 확인:
   - `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
   - `http://localhost:5173`
   - `https://yago-vibe-spt.web.app/__/auth/handler`

## 📸 요청

**"G Google" 제공자를 클릭**하여 상세 설정 화면을 캡처해주세요.

다음 항목이 보이도록 캡처:
- 웹 클라이언트 ID 필드
- 웹 클라이언트 Secret 필드 (마스킹되어 있어도 됨)
- 프로젝트 지원 이메일 필드

그러면 Google Cloud Console의 값과 비교하여 정확히 확인해드리겠습니다!

