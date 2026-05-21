# 🔑 API 키 재생성 가이드 (최종 해결책)

## ⚠️ 중요: 먼저 현재 코드 수정으로 테스트하세요!

**현재까지 완료된 수정:**
- ✅ AuthProvider.tsx: 중복 리디렉션 로직 제거
- ✅ LoginPage.tsx: 모바일 감지 로직 통일
- ✅ OAuth 클라이언트 ID 클린업 완료

**권장 순서:**
1. **먼저 현재 코드로 테스트** (무한 루프 문제가 해결되었을 가능성이 높음)
2. **여전히 API 키 관련 오류가 발생하는 경우에만** 이 가이드를 따라 API 키 재생성

---

## 🎯 API 키 재생성이 필요한 경우

다음 오류가 발생하는 경우에만 API 키 재생성이 필요합니다:
- `auth/api-key-not-valid`
- `auth/requests-from-referer-are-blocked`
- `auth/requests-to-this-api-identitytoolkit-method-google.cloud.identitytoolkit.v1.projectconfigservice.getprojectconfig-are-blocked`

---

## 📝 단계별 API 키 재생성 가이드

### 1단계: 기존 API 키 확인 및 삭제 (선택 사항)

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/
   - 프로젝트: `yago-vibe-spt` 선택

2. **APIs & Services → Credentials 이동**
   - 왼쪽 메뉴: APIs & Services → Credentials
   - 또는 직접 링크: https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt

3. **현재 사용 중인 API 키 확인**
   - 브라우저 콘솔(F12)에서 `🔍 [firebase.ts] ⚠️⚠️⚠️ 실제 사용되는 Firebase API 키 (전체) ⚠️⚠️⚠️` 로그 확인
   - 이 키를 Google Cloud Console에서 찾기

4. **기존 API 키 삭제 (선택 사항)**
   - **'Browser key (auto created by Firebase)'** 또는 현재 사용 중인 키 선택
   - [삭제] 버튼 클릭
   - ⚠️ **주의**: 삭제 전에 새 키를 생성하고 코드에 적용한 후 삭제하는 것을 권장합니다.

### 2단계: 새로운 API 키 생성

1. **Google Cloud Console → APIs & Services → Credentials 페이지 유지**

2. **+ CREATE CREDENTIALS 클릭**
   - 상단의 **"+ CREATE CREDENTIALS"** 버튼 클릭
   - 드롭다운에서 **"API key"** 선택

3. **새 API 키 생성**
   - 새로운 API 키가 자동으로 생성됨
   - 키 문자열을 **즉시 복사** (예: `AIzaSyCzNxZoL...[새 키]...HxxDY`)
   - ⚠️ **중요**: 키를 복사하지 않으면 나중에 다시 확인할 수 없습니다!

### 3단계: 새 API 키 제한 설정 (보안 권장)

#### 옵션 A: 제한 없음 (빠른 테스트용 - 보안 위험)

1. **새로 생성된 API 키 클릭**하여 편집 화면으로 이동

2. **애플리케이션 제한사항**
   - **"없음"** 선택

3. **API 제한사항**
   - **"키 제한 안 함"** 선택

4. **[저장]** 버튼 클릭

⚠️ **보안 경고**: 이 설정은 모든 도메인에서 API 키를 사용할 수 있게 하므로, 프로덕션 환경에서는 권장하지 않습니다.

#### 옵션 B: HTTP 리퍼러 제한 (권장 - 보안)

1. **새로 생성된 API 키 클릭**하여 편집 화면으로 이동

2. **애플리케이션 제한사항**
   - **"HTTP 리퍼러(웹 사이트)"** 선택

3. **웹사이트 제한 추가**
   - **+ 항목 추가** 클릭하여 다음 항목들을 각각 추가:
     ```
     http://localhost:5173/*
     http://127.0.0.1:5173/*
     https://yago-vibe-spt.web.app/*
     https://yago-vibe-spt.firebaseapp.com/*
     https://yagovibe.com/*
     https://www.yagovibe.com/*
     ```

4. **API 제한사항**
   - **"키 제한 안 함"** 선택 (또는 "특정 API 제한" 선택 시 "Identity Toolkit API" 포함 확인)

5. **[저장]** 버튼 클릭

### 4단계: 코드에 새 API 키 적용

#### 4-1. 로컬 개발 환경 (.env.local)

1. **프로젝트 루트의 `.env.local` 파일 열기**
   - 파일이 없으면 `.env.example`을 복사하여 생성

2. **API 키 업데이트**
   ```env
   VITE_FIREBASE_API_KEY=새로_복사한_API_키_문자열
   ```

3. **파일 저장**

#### 4-2. 프로덕션 환경 (.env.production)

1. **프로젝트 루트의 `.env.production` 파일 열기**

2. **API 키 업데이트**
   ```env
   VITE_FIREBASE_API_KEY=새로_복사한_API_키_문자열
   ```

3. **파일 저장**

#### 4-3. Firebase Hosting 환경 변수 (배포 환경)

1. **Firebase Console 접속**
   - https://console.firebase.google.com/
   - 프로젝트: `yago-vibe-spt` 선택

2. **Hosting → 환경 변수 이동**
   - 왼쪽 메뉴: Hosting → 환경 변수
   - 또는 Settings → Environment variables

3. **환경 변수 추가/수정**
   - `VITE_FIREBASE_API_KEY` 변수 추가 또는 수정
   - 값: 새로 생성한 API 키

4. **저장 후 재배포**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

### 5단계: 변경사항 적용 대기

- Google Cloud Console 설정 변경은 **최소 5-10분** 정도 전파 시간이 필요합니다
- 코드 변경은 즉시 적용됩니다 (개발 서버 재시작 필요)

### 6단계: 테스트

1. **개발 서버 재시작**
   ```bash
   npm run dev
   ```

2. **브라우저 캐시 완전 삭제**
   - 개발자 도구 (F12) → Application 탭
   - Storage → Clear site data
   - 모든 항목 선택 후 Clear site data 클릭

3. **시크릿 모드에서 테스트**
   - 시크릿 모드 (Ctrl + Shift + N)
   - `http://localhost:5173/login` 접속
   - Google 로그인 테스트
   - 무한 루프 없이 정상적으로 `/sports-hub`로 이동하는지 확인

4. **브라우저 콘솔 확인**
   - F12 → Console 탭
   - `🔍 [firebase.ts] ⚠️⚠️⚠️ 실제 사용되는 Firebase API 키 (전체) ⚠️⚠️⚠️` 로그 확인
   - 새로 생성한 API 키가 사용되고 있는지 확인

---

## ✅ 체크리스트

- [ ] 기존 API 키 확인 (브라우저 콘솔에서)
- [ ] 새 API 키 생성 완료
- [ ] API 키 제한 설정 완료 (옵션 A 또는 B)
- [ ] `.env.local` 파일에 새 API 키 추가
- [ ] `.env.production` 파일에 새 API 키 추가
- [ ] Firebase Hosting 환경 변수 업데이트 (배포 환경)
- [ ] 개발 서버 재시작 완료
- [ ] 브라우저 캐시 삭제 완료
- [ ] 시크릿 모드에서 테스트 완료
- [ ] 무한 루프 없이 정상 로그인 확인

---

## 🔍 문제 해결

### 새 API 키가 적용되지 않는 경우

1. **환경 변수 확인**
   - 브라우저 콘솔에서 `🔍 [firebase.ts] 환경 변수 확인` 로그 확인
   - `VITE_FIREBASE_API_KEY`가 올바르게 로드되는지 확인

2. **파일 위치 확인**
   - `.env.local` 파일이 프로젝트 루트에 있는지 확인
   - 파일 이름이 정확한지 확인 (`.env.local`, `.env.production`)

3. **서버 재시작**
   - 환경 변수 변경 후 반드시 개발 서버 재시작 필요
   ```bash
   # 서버 중지 (Ctrl + C)
   npm run dev
   ```

4. **빌드 캐시 삭제**
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

### 여전히 API 키 오류가 발생하는 경우

1. **Google Cloud Console 확인**
   - 새 API 키가 올바르게 생성되었는지 확인
   - API 제한사항이 올바르게 설정되었는지 확인
   - HTTP 리퍼러 제한이 올바르게 설정되었는지 확인

2. **Identity Toolkit API 활성화 확인**
   - Google Cloud Console → APIs & Services → Library
   - "Identity Toolkit API" 검색
   - "사용 설정됨" 상태인지 확인

3. **Firebase Authentication API 활성화 확인**
   - Google Cloud Console → APIs & Services → Library
   - "Firebase Authentication API" 검색
   - "사용 설정됨" 상태인지 확인

---

## 📚 참고 자료

- [Firebase Authentication 문서](https://firebase.google.com/docs/auth)
- [Google Cloud Console API 키 관리](https://console.cloud.google.com/apis/credentials)
- [Firebase Hosting 환경 변수](https://firebase.google.com/docs/hosting/config)

---

## ⚠️ 보안 주의사항

1. **API 키는 절대 공개 저장소에 커밋하지 마세요**
   - `.env.local`, `.env.production` 파일은 `.gitignore`에 포함되어야 합니다

2. **프로덕션 환경에서는 HTTP 리퍼러 제한을 반드시 설정하세요**
   - "키 제한 안 함" 설정은 개발/테스트 환경에서만 사용하세요

3. **API 키를 정기적으로 교체하세요**
   - 보안을 위해 주기적으로 API 키를 재생성하는 것을 권장합니다

