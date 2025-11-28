# 🔍 Firebase Google 로그인 활성화 확인

## ✅ 현재 확인된 사항
- [x] Firebase Console > Authentication > 사용자: `jaeman2034@gmail.com` 존재 ✅
- [x] 이메일/비밀번호 로그인 작동 중 ✅

## 🚨 지금 확인해야 할 것

### Step 1: Firebase Console > Authentication > 로그인 방법

1. **"로그인 방법" 탭 클릭**
   - 현재 "사용자" 탭에 있으므로, 상단의 **"로그인 방법"** 탭 클릭

2. **Google 제공업체 확인**
   - 제공업체 목록에서 **"Google"** 찾기
   - 상태가 **"사용 설정됨"** (Enabled)인지 확인
   - 비활성화되어 있으면:
     - Google 클릭
     - **"사용 설정"** 토글 활성화
     - **"프로젝트 지원 이메일"** (Project support email) 설정
     - **"저장"** 클릭

3. **프로젝트 지원 이메일 확인**
   - Google 제공업체 설정에서
   - **"프로젝트 지원 이메일"**이 실제 이메일 주소로 설정되어 있는지 확인
   - 예: `jaeman2034@gmail.com` 또는 다른 실제 이메일

### Step 2: Google Cloud Console > OAuth 동의 화면

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트 "yago-vibe-spt" 선택

2. **OAuth 동의 화면 확인**
   - 왼쪽 메뉴 > **"API 및 서비스"** > **"OAuth 동의 화면"**

3. **테스트 사용자 확인**
   - **"테스트 사용자"** 섹션 확인
   - **본인 이메일 추가**: `jaeman2034@gmail.com`
   - 없으면:
     - **"+ 사용자 추가"** 클릭
     - 이메일 입력: `jaeman2034@gmail.com`
     - **"저장"** 클릭

### Step 3: Identity Toolkit API 활성화 확인

1. **Google Cloud Console > API 라이브러리**
   - 왼쪽 메뉴 > **"API 및 서비스"** > **"라이브러리"**

2. **Identity Toolkit API 검색**
   - 검색창에 **"Identity Toolkit API"** 입력
   - 클릭

3. **활성화 상태 확인**
   - **"사용 설정됨"** 또는 **"관리"** 버튼이 보이면 활성화된 것
   - **"사용 설정"** 버튼이 보이면 비활성화 → 클릭하여 활성화

## 📋 체크리스트

- [ ] Firebase Console > Authentication > 로그인 방법 > Google **"사용 설정됨"** 확인
- [ ] Firebase Console > Authentication > 로그인 방법 > Google > 프로젝트 지원 이메일 설정됨
- [ ] Google Cloud Console > OAuth 동의 화면 > 테스트 사용자에 `jaeman2034@gmail.com` 추가됨
- [ ] Google Cloud Console > API 라이브러리 > Identity Toolkit API 활성화됨

## 🔥 가장 중요한 것

**Firebase Console > Authentication > 로그인 방법 > Google이 "사용 설정됨" 상태여야 합니다!**

비활성화되어 있으면 Google 로그인이 절대 작동하지 않습니다.

