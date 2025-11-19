# 🚀 Step 32 배포 가이드 (타입 오류 우회)

## ⚠️ 현재 상황

다른 파일들에 타입 오류가 있어 전체 빌드가 실패합니다. 하지만 Step 32 파일들(`releaseCheck.ts`, `generateReleaseNotes.ts`)은 타입 오류가 없습니다.

## ✅ 해결 방법

### 방법 1: 타입 체크 건너뛰고 배포 (임시)

```bash
cd functions

# tsconfig.json에서 strict 모드 비활성화 확인 (이미 false)
# 또는 빌드 스크립트 수정

# 직접 JavaScript로 컴파일 후 배포
npx tsc src/releaseCheck.ts src/generateReleaseNotes.ts --outDir lib --skipLibCheck --module commonjs --target es2021

# 또는 기존 빌드 실패 시에도 강제 배포 (권장하지 않음)
firebase deploy --only functions:releaseCheck,functions:generateReleaseNotes --force
```

### 방법 2: 타입 체크 수정 후 배포 (권장)

1. **generateReleaseNotes.ts 수정 확인**:
   - ✅ `checkSnap.exists()` → `checkSnap.exists` (이미 수정됨)

2. **다른 파일들의 타입 오류는 별도 수정 필요**

### 방법 3: 개별 함수만 빌드 (권장)

```bash
cd functions

# Step 32 파일들만 별도 빌드
mkdir -p lib
npx tsc src/releaseCheck.ts src/generateReleaseNotes.ts --outDir lib --skipLibCheck --module commonjs --target es2021 --esModuleInterop

# 배포
firebase deploy --only functions:releaseCheck,functions:generateReleaseNotes
```

## 📝 테스트 플로우 (수정된 버전)

### 1️⃣ Functions 배포 (개별 함수만)

```bash
cd functions

# Step 32 파일들만 컴파일
npx tsc src/releaseCheck.ts --outDir lib --skipLibCheck --module commonjs --target es2021 --esModuleInterop
npx tsc src/generateReleaseNotes.ts --outDir lib --skipLibCheck --module commonjs --target es2021 --esModuleInterop

# 배포
firebase deploy --only functions:releaseCheck,functions:generateReleaseNotes
```

### 2️⃣ Functions Shell에서 수동 트리거

```bash
firebase functions:shell

# 실행
releaseCheck()
generateReleaseNotes()
```

### 3️⃣ HTTP 함수로 직접 호출 (대안)

```bash
# 릴리즈 체크
curl -X POST https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/releaseCheck

# 릴리즈 노트 생성
curl -X POST https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/generateReleaseNotes
```

### 4️⃣ Slack 알림 확인

- Slack 채널에서 메시지 확인
- SLO 충족/미충족 상태 확인

### 5️⃣ Firestore 문서 검증

Firebase Console에서 확인:
- `releaseChecks/latest`
- `releaseNotes/latest`

### 6️⃣ 관리자 대시보드 확인

`/admin` 접속 → ReleaseBoard 컴포넌트 확인

## 🔧 빠른 테스트 (HTTP 함수 사용)

배포가 실패하는 경우, 로컬에서 HTTP 함수를 직접 호출하여 테스트할 수 있습니다:

```bash
# 릴리즈 체크
curl -X POST https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/releaseCheck

# 릴리즈 노트 생성
curl -X POST https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/generateReleaseNotes
```

## 📊 예상 결과

### 릴리즈 체크 성공 시:
```json
{
  "ok": true,
  "data": {
    "total": 100,
    "errors": 0,
    "errorRate": "0.00",
    "sloMet": true,
    ...
  }
}
```

### 릴리즈 노트 생성 성공 시:
```json
{
  "ok": true,
  "note": "# 릴리즈 노트\n\n## 주요 개선사항\n..."
}
```

