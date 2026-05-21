# ✅ 배포 자동화 완성본 세트 (실전 DevOps)

## 🎯 목표 달성

> 👉 버튼 한 번 = hosting + functions + rules + indexes 전부 배포
> 👉 실수 방지 + 롤백 + 환경 분리

---

## ✅ 완료된 작업

### 1️⃣ 배포 스크립트 개선

**파일**: `package.json`

**추가된 스크립트**:
```json
{
  "deploy:all": "npm run pre-deploy && npm run build && firebase deploy",
  "deploy:hosting": "npm run build && firebase deploy --only hosting",
  "deploy:fn": "cd functions && npm run build && cd .. && firebase deploy --only functions",
  "deploy:rules": "firebase deploy --only firestore:rules",
  "deploy:index": "firebase deploy --only firestore:indexes",
  "deploy:safe": "npm run pre-deploy && npm run build && npm run deploy:rules && npm run deploy:fn && npm run deploy:hosting && npm run deploy:index"
}
```

**사용법**:
```bash
# 전체 배포 (빠른 방식)
npm run deploy:all

# 안전 배포 (순서 보장)
npm run deploy:safe

# 개별 배포
npm run deploy:hosting
npm run deploy:fn
npm run deploy:rules
npm run deploy:index
```

---

### 2️⃣ 배포 전 안전 체크리스트

**파일**: `scripts/predeploy-check.sh`

**체크 항목**:
1. ✅ Functions 타입 체크
2. ✅ Firestore Rules 문법 체크
3. ✅ Firestore 인덱스 체크
4. ✅ 클라이언트 빌드 체크

**사용법**:
```bash
bash scripts/predeploy-check.sh
```

---

### 3️⃣ 안전 배포 스크립트

**파일**: `scripts/deploy-safe.sh`

**배포 순서** (중요):
1. Firestore Rules (최우선)
2. Functions
3. Hosting
4. Firestore Indexes (마지막)

**사용법**:
```bash
bash scripts/deploy-safe.sh
```

---

### 4️⃣ 환경 분리

**파일**: `.firebaserc`

**구조**:
```json
{
  "projects": {
    "default": "yago-vibe-spt",
    "dev": "yago-vibe-dev",
    "prod": "yago-vibe-spt"
  }
}
```

**사용법**:
```bash
# 개발 환경
firebase use dev
npm run deploy:all

# 프로덕션 환경
firebase use prod
npm run deploy:safe
```

---

### 5️⃣ Firestore 인덱스 추가

**파일**: `firestore.indexes.json`

**추가된 인덱스**:
- ✅ `chatRooms` - `postId` + `userId` (채팅방 검색)
- ✅ `chatRooms` - `members` (array-contains) + `createdAt` (채팅방 목록)

---

## 📊 배포 순서 (중요)

### 필수 배포 순서

1. **Firestore Rules** (최우선)
   - 보안 규칙이 먼저 적용되어야 함
   - Functions가 Rules에 의존

2. **Functions**
   - Rules 적용 후 배포
   - 서버 로직 업데이트

3. **Hosting**
   - 클라이언트 코드 배포
   - Functions와 호환되는 버전

4. **Firestore Indexes** (마지막)
   - 인덱스는 비동기 생성
   - 배포 후 자동 생성됨

---

## 🔒 안전 배포 체크리스트

### 배포 전

- ✅ Functions 타입 체크 통과
- ✅ Firestore Rules 문법 체크 통과
- ✅ 클라이언트 빌드 성공
- ✅ 환경 확인 (dev/prod)

### 배포 중

- ✅ 순서 보장 (rules → functions → hosting → indexes)
- ✅ 에러 발생 시 즉시 중단
- ✅ 롤백 준비

### 배포 후

- ✅ Functions 로그 확인
- ✅ Firestore Rules 테스트
- ✅ 인덱스 생성 확인

---

## 🚨 롤백 전략

### Hosting 롤백

```bash
firebase hosting:rollback
```

### Functions 롤백

```bash
firebase functions:rollback
```

### Rules 롤백

```bash
# 이전 버전으로 수동 복구
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules
```

---

## 🧪 테스트 명령

### 로컬 에뮬레이터

```bash
# Firestore만
npm run emulators

# 전체
firebase emulators:start
```

### 배포 전 테스트

```bash
# 타입 체크
cd functions && npm run build

# Rules 체크
firebase deploy --only firestore:rules --dry-run

# 빌드 체크
npm run build
```

### Windows 사용자 안내

Windows에서는 `bash` 스크립트 대신 npm 스크립트를 사용하세요:

```powershell
# 전체 배포 (권장)
npm run deploy:all

# 안전 배포 (순서 보장)
npm run deploy:safe

# 개별 배포
npm run deploy:rules
npm run deploy:fn
npm run deploy:hosting
npm run deploy:index
```

또는 Git Bash 또는 WSL을 사용하여 bash 스크립트를 실행할 수 있습니다.

---

## 📊 CI/CD 통합 (GitHub Actions)

**파일**: `.github/workflows/deploy.yml` (기존 파일 확인 필요)

**추천 구조**:
```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
    
    - run: npm install
    - run: cd functions && npm install
    
    - run: npm run deploy:safe
      env:
        FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

---

## ✅ 완료 체크리스트

| 항목 | 상태 | 비고 |
|------|------|------|
| 배포 스크립트 개선 | ✅ | deploy:all, deploy:safe 추가 |
| 배포 전 체크리스트 | ✅ | predeploy-check.sh |
| 안전 배포 스크립트 | ✅ | deploy-safe.sh |
| 환경 분리 | ✅ | .firebaserc (dev/prod) |
| Firestore 인덱스 추가 | ✅ | chatRooms 인덱스 |
| 배포 순서 보장 | ✅ | rules → functions → hosting → indexes |

---

## 🎯 결론

**배포 자동화 완성본 세트 적용 완료** 🚀

- ✅ 버튼 한 번으로 전체 배포
- ✅ 실수 방지 (predeploy 체크)
- ✅ 환경 분리 (dev/prod)
- ✅ 안전 배포 순서 보장
- ✅ 롤백 전략

**다음 단계**: 인원 초과 차단 또는 전체 통합 테스트 💪
