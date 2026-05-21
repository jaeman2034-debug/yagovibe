# 🔥 Firebase Admin SDK 설정 가이드

## 📋 목적
백엔드에서 Firestore에 접근하여 실시간 구독을 위한 dual write 구현

## 🚀 설정 방법 (2가지 옵션)

### 옵션 1: Service Account 키 사용 (권장 - 프로덕션)

#### Step 1: Firebase Console에서 Service Account 키 생성

1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트 선택: `yago-vibe-spt`

2. **Service Account 생성**
   - ⚙️ **Project Settings** (왼쪽 상단) 클릭
   - **Service accounts** 탭
   - **Generate new private key** 클릭
   - JSON 파일 다운로드

3. **환경 변수 설정**
   - 다운로드한 JSON 파일을 `server/` 디렉토리에 저장 (예: `server/firebase-service-account.json`)
   - **⚠️ 중요**: `.gitignore`에 추가하여 Git에 커밋하지 않도록 주의!

#### Step 2: 환경 변수 설정

**방법 A: 환경 변수 파일 사용 (로컬 개발)**

`server/.env` 파일 생성:
```env
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

또는 JSON 내용을 직접 환경 변수로:
```env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"yago-vibe-spt",...}'
```

**방법 B: 시스템 환경 변수 사용**
```bash
# Windows PowerShell
$env:FIREBASE_SERVICE_ACCOUNT_PATH="C:\path\to\firebase-service-account.json"

# Linux/Mac
export FIREBASE_SERVICE_ACCOUNT_PATH="./firebase-service-account.json"
```

---

### 옵션 2: 기본 인증 사용 (로컬 개발 - 간단)

#### Step 1: Google Cloud SDK 설치

```bash
# Windows (Chocolatey)
choco install gcloudsdk

# Mac (Homebrew)
brew install google-cloud-sdk

# Linux
curl https://sdk.cloud.google.com | bash
```

#### Step 2: 인증 설정

```bash
gcloud auth application-default login
```

이 명령어를 실행하면 브라우저가 열리고 Google 계정으로 로그인하면 됩니다.

#### Step 3: 프로젝트 설정

```bash
gcloud config set project yago-vibe-spt
```

---

## ✅ 설정 확인

### 방법 1: Service Account 키 사용 시

`server/src/data/firestore.ts`에서 자동으로 인식합니다:
- `FIREBASE_SERVICE_ACCOUNT` 환경 변수가 있으면 JSON 파싱
- `FIREBASE_SERVICE_ACCOUNT_PATH` 환경 변수가 있으면 파일 경로로 읽기

### 방법 2: 기본 인증 사용 시

`server/src/data/firestore.ts`에서 자동으로 `GOOGLE_APPLICATION_CREDENTIALS` 환경 변수를 확인하거나 기본 인증을 사용합니다.

---

## 🧪 테스트

BFF 서버를 시작하면 콘솔에 다음 메시지가 표시됩니다:

```
✅ [Firestore Admin] 초기화 완료
```

만약 초기화 실패 시:
```
❌ [Firestore Admin] 초기화 실패: [에러 메시지]
```

---

## 🔒 보안 주의사항

1. **Service Account 키는 절대 Git에 커밋하지 마세요!**
   - `server/.gitignore`에 추가:
     ```
     firebase-service-account.json
     .env
     ```

2. **프로덕션 환경에서는 환경 변수로만 관리**
   - Vercel, Railway 등 배포 플랫폼의 환경 변수 설정 사용

3. **Service Account 권한**
   - Firebase Console > IAM & Admin에서 확인
   - 최소 권한: Firestore 읽기/쓰기

---

## 📝 다음 단계

설정 완료 후:
1. `cd server && npm install` (firebase-admin 패키지 설치)
2. `npm run dev:bff` (BFF 서버 시작)
3. 콘솔에서 `✅ [Firestore Admin] 초기화 완료` 확인
4. 유저 행동 → Prisma + Firestore 동시 저장 확인
