# YAGO VIBE 프로덕션 배포 가이드

> 서비스 출시 전 필수 문서 · 배포 설계 및 실행 체크리스트

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 프로젝트 | yago-vibe-spt |
| Hosting | Firebase Hosting |
| Functions | Firebase Cloud Functions (asia-northeast3) |
| Database | Firestore |
| Auth | Firebase Authentication |

---

## 2. 배포 전 체크리스트

### 2.1 환경 변수

**프로덕션 빌드 시 반드시 확인:**

| 변수 | 용도 | 필수 |
|------|------|------|
| VITE_FIREBASE_API_KEY | Firebase API Key | ✓ |
| VITE_FIREBASE_AUTH_DOMAIN | Auth 도메인 (yago-vibe-spt.firebaseapp.com) | ✓ |
| VITE_FIREBASE_MESSAGING_SENDER_ID | FCM Sender ID | ✓ |
| VITE_FIREBASE_APP_ID | Firebase App ID | ✓ |
| VITE_USE_EMULATOR | "false" (프로덕션) | ✓ |
| VITE_FCM_VAPID_KEY | 푸시 알림용 | 선택 |

> ⚠️ `.env`는 git에 올리지 않음. CI/CD 또는 수동으로 설정.

### 2.2 에뮬레이터 비활성화

프로덕션 배포 시 에뮬레이터 연결 해제:

```env
VITE_USE_AUTH_EMULATOR=false
VITE_USE_FIRESTORE_EMULATOR=false
VITE_USE_FUNCTIONS_EMULATOR=false
```

### 2.3 Firebase Authorized Domains

Firebase Console → Authentication → Settings → Authorized domains:

- `localhost` (개발)
- `yago-vibe-spt.firebaseapp.com`
- `yago-vibe-spt.web.app`
- 커스텀 도메인 (사용 시)

### 2.4 코드 검증

- [ ] `npm run build` 성공
- [ ] `cd functions && npm run build` 성공
- [ ] TypeScript/Lint 에러 없음

---

## 3. 배포 순서

### 3.1 전체 배포

```bash
# 1) 프론트엔드 빌드
npm run build

# 2) 전체 배포 (Hosting + Firestore + Functions + Storage)
firebase deploy
```

### 3.2 개별 배포

```bash
# Hosting만
firebase deploy --only hosting

# Functions만
firebase deploy --only functions

# Firestore Rules만
firebase deploy --only firestore:rules

# Firestore Indexes만
firebase deploy --only firestore:indexes

# Storage Rules만
firebase deploy --only storage
```

### 3.3 Functions 선택 배포

```bash
# 특정 함수만
firebase deploy --only functions:createTeam,functions:onTeamCreated
```

---

## 4. 배포 후 검증

### 4.1 Hosting

- [ ] https://yago-vibe-spt.web.app 접속
- [ ] 로그인 화면 정상
- [ ] SPA 라우팅 동작

### 4.2 Authentication

- [ ] Google 로그인
- [ ] 이메일 로그인
- [ ] 로그아웃

### 4.3 Firestore

- [ ] 팀 목록 조회
- [ ] 채팅 동작
- [ ] 마켓 게시글 조회

### 4.4 Functions

- [ ] createTeam 호출
- [ ] 트리거 로그 확인 (Cloud Console → Functions → 로그)

---

## 5. 모니터링 및 로깅

### 5.1 Firebase Console

- **Functions**: 실행 수, 에러율, 지연
- **Firestore**: 읽기/쓰기 사용량
- **Authentication**: 활성 사용자
- **Hosting**: 트래픽

### 5.2 Google Cloud (권장)

| 서비스 | 용도 |
|--------|------|
| Cloud Logging | Functions 로그 수집 |
| Error Reporting | 에러 자동 수집 |
| Performance Monitoring | 클라이언트 성능 |

### 5.3 Sentry

프로젝트에 `@sentry/react` 적용 시 Sentry 대시보드에서 에러 모니터링.

---

## 6. 롤백

### 6.1 Hosting

Firebase Console → Hosting → 릴리스 이력에서 이전 버전 복원.

### 6.2 Functions

```bash
firebase functions:log
# 이전 버전 배포 또는 문제 함수 비활성화
```

### 6.3 Firestore Rules

이전 rules 버전을 복사 후 `firebase deploy --only firestore:rules`

---

## 7. 관련 문서

| 문서 | 설명 |
|------|------|
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | 상세 배포 가이드 |
| [DEPLOYMENT_QUICK_START.md](./DEPLOYMENT_QUICK_START.md) | 빠른 시작 |
| [PRODUCTION_DEPLOYMENT_CHECKLIST.md](./PRODUCTION_DEPLOYMENT_CHECKLIST.md) | 기능별 체크리스트 |
| [YAGO_PLATFORM_ARCHITECTURE.md](./YAGO_PLATFORM_ARCHITECTURE.md) | 플랫폼 아키텍처 |

---

## 8. 빠른 배포 명령 요약

```bash
# 전체 빌드 + 배포
npm run build && firebase deploy

# Hosting만 (프론트 수정 후)
npm run build && firebase deploy --only hosting

# Functions만 (백엔드 수정 후)
cd functions && npm run build && cd .. && firebase deploy --only functions
```

---

*서비스 출시 전 CTO/Tech Lead 검토용 문서*
