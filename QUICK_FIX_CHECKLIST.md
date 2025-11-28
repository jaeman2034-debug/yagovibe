# ⚡ 빠른 해결 체크리스트

## 🔥 "Unable to verify that the app domain is authorized" 오류 해결

### Step 1: Firebase Console (가장 중요!)

1. Firebase Console 접속: https://console.firebase.google.com
2. 프로젝트 선택: `yago-vibe-spt`
3. **Authentication** → **Settings** 탭
4. **Authorized domains** 섹션 확인
5. **`localhost`가 없으면**:
   - "Add domain" 버튼 클릭
   - `localhost` 입력
   - "Add" 클릭
6. 저장

**확인할 도메인**:
- ✅ `localhost` (필수!)
- ✅ `yago-vibe-spt.firebaseapp.com`
- ✅ `yago-vibe-spt.web.app`
- ✅ `yagovibe.com`
- ✅ `www.yagovibe.com`

### Step 2: Google Cloud Console

1. Google Cloud Console 접속: https://console.cloud.google.com
2. 프로젝트 선택: `yago-vibe-spt`
3. **APIs & Services** → **Credentials**
4. OAuth 2.0 클라이언트 ID 클릭 (웹 클라이언트)

**승인된 리디렉션 URI 확인**:
- ✅ `http://localhost:5173/_/auth/handler`
- ✅ `https://yago-vibe-spt.firebaseapp.com/_/auth/handler`
- ✅ 기타 프로덕션 도메인의 `/_/auth/handler`

### Step 3: 브라우저 캐시 삭제

1. **Ctrl + Shift + Delete**
2. "전체 기간" 선택
3. "쿠키 및 기타 사이트 데이터" 체크
4. "캐시된 이미지 및 파일" 체크
5. "데이터 삭제" 클릭
6. **Chrome 완전 종료 후 재시작**

### Step 4: Service Worker 제거

1. 주소창에 입력: `chrome://serviceworker-internals`
2. `yago-vibe-spt.firebaseapp.com` 찾기
3. "Unregister" 클릭
4. Chrome 재시작

### Step 5: 테스트

1. `http://localhost:5173/login` 접속
2. Google 로그인 버튼 클릭
3. 오류 확인

## ⏱️ 예상 소요 시간

- Firebase Console 설정: 2분
- Google Cloud Console 확인: 1분
- 브라우저 캐시 삭제: 1분
- **총 5분 이내**

## 🎯 핵심 포인트

**가장 중요한 것**: Firebase Console의 Authorized Domains에 `localhost` 추가!

이것만 해도 90% 해결됩니다.

