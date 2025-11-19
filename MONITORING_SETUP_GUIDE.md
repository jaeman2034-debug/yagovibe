# 📊 YAGO VIBE 모니터링 시스템 설정 가이드

Production 배포 전 필수 모니터링 시스템 구축 가이드입니다.

## 📋 목차

1. [Sentry 설정](#1-sentry-설정)
2. [Firebase Cloud Logging](#2-firebase-cloud-logging)
3. [성능 모니터링](#3-성능-모니터링)
4. [사용자 피드백 수집](#4-사용자-피드백-수집)
5. [알림 설정](#5-알림-설정)

---

## 1. Sentry 설정

### 🔧 1-1. Sentry 계정 생성 및 프로젝트 설정

1. **Sentry 가입**: https://sentry.io
   - GitHub 계정으로 로그인 (권장)

2. **프로젝트 생성**:
   - Dashboard → "Create Project"
   - Platform: **React**
   - Project Name: `yago-vibe-spt`

3. **DSN 확인**:
   - Project Settings → Client Keys (DSN)
   - DSN 복사 (예: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

### 🔧 1-2. 환경 변수 설정

#### 로컬 개발 (.env.local)

```bash
# Sentry DSN
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# 앱 버전 (선택)
VITE_APP_VERSION=1.0.0
```

#### Vercel 환경 변수

**Vercel Dashboard** → **Project Settings** → **Environment Variables**:

```bash
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
VITE_APP_VERSION=1.0.0
```

### 🔧 1-3. Sentry 기능 확인

#### ✅ 이미 구현된 기능

- ✅ **에러 자동 추적**: React ErrorBoundary 통합
- ✅ **사용자 컨텍스트**: 로그인 시 자동 설정
- ✅ **성능 모니터링**: API 호출 성능 추적
- ✅ **세션 재생**: 에러 발생 시 사용자 세션 재생
- ✅ **에러 필터링**: 불필요한 에러 자동 제외

#### 📊 Sentry Dashboard에서 확인 가능한 정보

- **에러 발생 빈도**: 시간대별 에러 통계
- **에러 상세 정보**: 스택 트레이스, 사용자 정보, 브라우저 정보
- **성능 메트릭**: API 응답 시간, 페이지 로딩 시간
- **사용자 영향**: 에러를 경험한 사용자 수

---

## 2. Firebase Cloud Logging

### 🔧 2-1. Cloud Functions 로깅

이미 `firebase-functions/logger`를 사용 중입니다.

#### 로그 확인 방법

```bash
# Functions 로그 실시간 확인
firebase functions:log

# 특정 함수 로그만 확인
firebase functions:log --only searchProducts

# 최근 100개 로그
firebase functions:log --limit 100
```

#### Firebase Console에서 확인

1. **Firebase Console** → **Functions** → **Logs**
2. 실시간 로그 스트림 확인
3. 에러 필터링 및 검색

### 🔧 2-2. 로그 레벨 설정

Functions에서 사용하는 로그 레벨:

- `logger.info()` - 일반 정보
- `logger.warn()` - 경고
- `logger.error()` - 에러

---

## 3. 성능 모니터링

### 🔧 3-1. Sentry Performance Monitoring

이미 설정되어 있습니다:

```typescript
// src/lib/sentry.ts
tracesSampleRate: import.meta.env.MODE === "production" ? 0.1 : 1.0
```

**확인 가능한 메트릭**:
- 페이지 로딩 시간
- API 호출 응답 시간
- 사용자 상호작용 시간

### 🔧 3-2. Web Vitals 모니터링

이미 `usePerformanceMonitor` hook이 있습니다.

**확인 가능한 메트릭**:
- **LCP** (Largest Contentful Paint): 페이지 로딩 속도
- **FID** (First Input Delay): 사용자 상호작용 반응 속도
- **CLS** (Cumulative Layout Shift): 레이아웃 안정성

---

## 4. 사용자 피드백 수집

### 🔧 4-1. 에러 발생 시 사용자 피드백

ErrorBoundary에서 이미 구현되어 있습니다.

사용자가 에러를 경험하면:
1. 에러 화면 표시
2. Sentry에 자동 전송
3. 사용자에게 새로고침 옵션 제공

### 🔧 4-2. 사용자 피드백 수집 시스템 (추가 가능)

필요시 다음 기능을 추가할 수 있습니다:

```typescript
// 사용자 피드백 수집 함수
export function collectUserFeedback(
  errorId: string,
  feedback: string,
  userEmail?: string
): void {
  // Firestore에 피드백 저장
  // 또는 Sentry User Feedback API 사용
}
```

---

## 5. 알림 설정

### 🔧 5-1. Sentry 알림 설정

1. **Sentry Dashboard** → **Project Settings** → **Alerts**
2. **New Alert Rule** 생성:
   - **Trigger**: 에러 발생 시
   - **Conditions**: 
     - 에러 수 > 10개/시간
     - 특정 에러 발생 시
   - **Actions**: 
     - Email 알림
     - Slack 알림 (선택)
     - Discord 알림 (선택)

### 🔧 5-2. Firebase Functions 알림

Firebase Console에서:
1. **Functions** → **Monitoring**
2. 에러율 임계값 설정
3. Cloud Monitoring 알림 규칙 생성

---

## 📊 모니터링 체크리스트

### ✅ Sentry 설정

- [ ] Sentry 계정 생성 완료
- [ ] 프로젝트 생성 완료
- [ ] DSN 환경 변수 설정 완료
- [ ] 로컬 개발 환경 테스트 완료
- [ ] Vercel 환경 변수 설정 완료
- [ ] 에러 발생 테스트 완료
- [ ] 알림 규칙 설정 완료

### ✅ Firebase Logging

- [ ] Functions 로그 확인 가능
- [ ] 에러 로그 필터링 가능
- [ ] 로그 검색 기능 확인

### ✅ 성능 모니터링

- [ ] Sentry Performance 활성화 확인
- [ ] Web Vitals 수집 확인
- [ ] API 응답 시간 모니터링 확인

### ✅ 사용자 피드백

- [ ] ErrorBoundary 동작 확인
- [ ] 에러 화면 표시 확인
- [ ] Sentry 에러 전송 확인

---

## 🚨 문제 해결

### 문제: Sentry 이벤트가 전송되지 않음

1. **DSN 확인**:
   ```bash
   # 브라우저 콘솔에서 확인
   console.log(import.meta.env.VITE_SENTRY_DSN)
   ```

2. **네트워크 확인**:
   - 브라우저 개발자 도구 → Network 탭
   - `sentry.io` 요청 확인

3. **Sentry Dashboard 확인**:
   - Issues 탭에서 이벤트 수신 확인

### 문제: Functions 로그가 보이지 않음

```bash
# Functions 재배포
cd functions
npm install
firebase deploy --only functions

# 로그 확인
firebase functions:log
```

---

## 📈 모니터링 대시보드

### Sentry Dashboard

- **URL**: https://sentry.io/organizations/YOUR_ORG/projects/yago-vibe-spt/
- **주요 메뉴**:
  - **Issues**: 에러 목록
  - **Performance**: 성능 메트릭
  - **Releases**: 배포 버전별 에러 추적
  - **Alerts**: 알림 규칙 관리

### Firebase Console

- **URL**: https://console.firebase.google.com/project/yago-vibe-spt
- **주요 메뉴**:
  - **Functions** → **Logs**: Functions 로그
  - **Functions** → **Monitoring**: Functions 성능 모니터링

---

## 🎉 모니터링 시스템 완성!

이제 YAGO VIBE는 다음을 자동으로 모니터링합니다:

✅ **에러 추적**: 모든 에러를 자동으로 추적하고 알림
✅ **성능 모니터링**: 페이지 로딩, API 응답 시간 추적
✅ **사용자 컨텍스트**: 에러 발생 시 사용자 정보 포함
✅ **세션 재생**: 에러 발생 시 사용자 행동 재생
✅ **로그 관리**: Functions 로그 자동 수집

**Production 배포 후 즉시 문제를 파악하고 해결할 수 있습니다!**

