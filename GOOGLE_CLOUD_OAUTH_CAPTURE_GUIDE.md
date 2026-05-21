# 📸 Google Cloud Console OAuth 설정 캡처 가이드

## 🎯 캡처해야 할 정보

다음 2가지 설정을 캡처해주세요:

1. **승인된 JavaScript 원본** (Authorized JavaScript origins)
2. **승인된 리디렉션 URI** (Authorized redirect URIs)

## 📋 단계별 캡처 방법

### Step 1: Google Cloud Console 접속

1. **Google Cloud Console 접속**
   ```
   https://console.cloud.google.com
   ```

2. **프로젝트 선택**
   - 상단에서 프로젝트 선택
   - 프로젝트: `yago-vibe-spt` (또는 Firebase 프로젝트와 동일한 프로젝트)

### Step 2: OAuth 2.0 클라이언트 ID 페이지로 이동

1. **APIs & Services → Credentials**
   ```
   왼쪽 메뉴 > APIs & Services > Credentials
   ```

2. **OAuth 2.0 클라이언트 ID 찾기**
   - "OAuth 2.0 클라이언트 ID" 섹션에서
   - **웹 클라이언트** 타입의 클라이언트 ID 찾기
   - 클라이언트 ID 클릭 (또는 편집 아이콘 클릭)

### Step 3: 설정 페이지 캡처

**캡처해야 할 섹션**:

#### 1. 승인된 JavaScript 원본 (Authorized JavaScript origins)

**위치**: OAuth 2.0 클라이언트 ID 편집 페이지의 상단 부분

**캡처 내용**:
- "승인된 JavaScript 원본" 섹션 전체
- 목록에 있는 모든 URL
- "URI 추가" 버튼이 보이는 부분까지

**예상되는 항목들**:
- `https://yago-vibe-spt.firebaseapp.com`
- `https://yago-vibe-spt.web.app`
- `https://yagovibe.com`
- `https://www.yagovibe.com`
- `http://localhost:5173` (개발용)

#### 2. 승인된 리디렉션 URI (Authorized redirect URIs)

**위치**: OAuth 2.0 클라이언트 ID 편집 페이지의 하단 부분

**캡처 내용**:
- "승인된 리디렉션 URI" 섹션 전체
- 목록에 있는 모든 URL
- "URI 추가" 버튼이 보이는 부분까지

**예상되는 항목들**:
- `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
- `https://yago-vibe-spt.firebaseapp.com/_/auth/handler` (오타 가능성)
- `https://yago-vibe-spt.web.app/__/auth/handler`
- `https://yagovibe.com/__/auth/handler`
- `http://localhost:5173/__/auth/handler` (개발용)

## 📸 스크린샷 방법

### 방법 1: 전체 페이지 스크린샷 (권장)

1. **F12 → Console 탭 닫기** (개발자 도구 닫기)
2. **페이지 스크롤하여 두 섹션 모두 보이도록**
3. **전체 페이지 스크린샷** (Windows: Win + Shift + S, Mac: Cmd + Shift + 4)

### 방법 2: 섹션별 스크린샷

1. **"승인된 JavaScript 원본" 섹션 스크린샷**
2. **"승인된 리디렉션 URI" 섹션 스크린샷**

## 🔍 확인해야 할 항목

### 승인된 JavaScript 원본 확인 사항

- [ ] `https://yago-vibe-spt.firebaseapp.com` 포함 여부
- [ ] `https://yago-vibe-spt.web.app` 포함 여부
- [ ] `https://yagovibe.com` 포함 여부 (커스텀 도메인 사용 시)
- [ ] `http://localhost:5173` 포함 여부 (개발용)
- [ ] 프로토콜이 `https://`로 시작하는지 확인
- [ ] 포트 번호가 올바른지 확인

### 승인된 리디렉션 URI 확인 사항

- [ ] `https://yago-vibe-spt.firebaseapp.com/__/auth/handler` 포함 여부
  - ⚠️ **중요**: `/__/auth/handler` (언더스코어 2개)
  - ❌ `/__auth/handler` (오타)
  - ❌ `/_/auth/handler` (언더스코어 1개)
- [ ] `https://yago-vibe-spt.web.app/__/auth/handler` 포함 여부
- [ ] `https://yagovibe.com/__/auth/handler` 포함 여부 (커스텀 도메인 사용 시)
- [ ] `http://localhost:5173/__/auth/handler` 포함 여부 (개발용)
- [ ] 프로토콜이 `https://`로 시작하는지 확인
- [ ] 경로가 정확한지 확인 (`/__/auth/handler`)

## ⚠️ 주의사항

1. **민감한 정보**
   - 클라이언트 ID는 보안상 문제없지만, 필요시 마스킹 가능
   - 클라이언트 시크릿은 절대 캡처하지 마세요

2. **전체 URL 확인**
   - URL이 잘려서 보이지 않도록 주의
   - 스크롤하여 전체 URL 확인

3. **오타 확인**
   - `/__/auth/handler` (언더스코어 2개)가 정확한지 확인
   - `/__auth/handler` 또는 `/_/auth/handler` 같은 오타가 있는지 확인

## 📋 캡처 후 전달

스크린샷을 전달해주시면:
1. ✅ 누락된 항목 확인
2. ✅ 오타 확인
3. ✅ 잘못된 설정 확인
4. ✅ 정확한 수정 방법 제시

## ✅ 완료

스크린샷을 보내주시면 정확한 문제를 파악하고 해결 방법을 제시하겠습니다!

