# 📊 월간 리포트 PDF 자동 생성 가이드

## 🎯 구현 완료

### 1. 의존성 추가
- `playwright`: PDF 생성
- `handlebars`: 템플릿 엔진

### 2. 템플릿 구조
```
functions/
├── templates/
│   ├── monthly-report.html      # HTML 템플릿
│   └── assets/
│       └── fonts/               # 한글 폰트 (NotoSansKR)
│           ├── NotoSansKR-Regular.woff2
│           └── NotoSansKR-Bold.woff2
```

### 3. 구현 파일
- `functions/src/monthlyReportPDFGenerator.ts`: PDF 생성 로직
- `functions/src/chartGenerator.ts`: SVG 차트 생성
- `functions/src/monthlyReportScheduler.ts`: HTTP 핸들러

---

## 📋 사용법

### 1. 의존성 설치

```bash
cd functions
npm install
npx playwright install chromium
```

### 2. 한글 폰트 추가

```bash
# NotoSansKR 폰트 다운로드 및 배치
mkdir -p functions/templates/assets/fonts
# woff2 파일을 해당 경로에 배치
```

### 3. 환경 변수 설정

```bash
# .env 또는 Firebase Functions 환경 변수
CRON_TOKEN=your-secret-token-here
```

### 4. 배포

```bash
cd functions
npm run build
firebase deploy --only functions:generateMonthlyReportScheduler
```

---

## 🔄 Cloud Scheduler 설정

### GCP Console에서 설정

1. **Cloud Scheduler** → **작업 만들기**
2. **이름**: `monthly-report-generator`
3. **지역**: `asia-northeast3`
4. **설명**: `매월 1일 00:05 KST 월간 리포트 생성`
5. **빈도**: `5 0 1 * *` (Cron 표현식)
6. **타임존**: `Asia/Seoul`
7. **대상**: `HTTP`
8. **URL**: `https://asia-northeast3-{project-id}.cloudfunctions.net/generateMonthlyReportScheduler`
9. **HTTP 메서드**: `GET` 또는 `POST`
10. **헤더**:
    - `X-CRON-TOKEN`: `your-secret-token-here`

### gcloud CLI로 설정

```bash
gcloud scheduler jobs create http monthly-report-generator \
  --location=asia-northeast3 \
  --schedule="5 0 1 * *" \
  --time-zone="Asia/Seoul" \
  --uri="https://asia-northeast3-{project-id}.cloudfunctions.net/generateMonthlyReportScheduler" \
  --http-method=GET \
  --headers="X-CRON-TOKEN=your-secret-token-here"
```

---

## 🔒 보안

### 토큰 검증

스케줄러는 `X-CRON-TOKEN` 헤더를 검증합니다:

```typescript
const cronToken = req.get("X-CRON-TOKEN");
const expectedToken = process.env.CRON_TOKEN;

if (!expectedToken || cronToken !== expectedToken) {
  res.status(403).json({ error: "Forbidden" });
  return;
}
```

### 환경 변수 설정

```bash
firebase functions:config:set cron.token="your-secret-token-here"
```

또는 Firebase Console에서 환경 변수 설정

---

## 📊 처리 흐름

```
1. Cloud Scheduler (매월 1일 00:05 KST)
   ↓
2. HTTP Trigger (generateMonthlyReportScheduler)
   ↓
3. 토큰 검증
   ↓
4. 대상 팀 조회 (enableNewFeeSystem=true)
   ↓
5. 각 팀별 처리:
   - 리포트 데이터 집계
   - HTML 템플릿 렌더링 (Handlebars)
   - PDF 생성 (Playwright)
   - Storage 업로드
   - Outbox 등록
   ↓
6. 결과 반환
```

---

## 🎨 템플릿 커스터마이징

### 템플릿 수정

`functions/templates/monthly-report.html` 파일을 수정하면 됩니다.

### Handlebars 문법

```handlebars
<!-- 변수 출력 -->
{{reportMonth}}

<!-- 조건문 -->
{{#if hasChart}}
  <!-- 차트 표시 -->
{{/if}}

<!-- 반복문 -->
{{#each alerts}}
  <div>{{type}}: {{count}}명</div>
{{/each}}

<!-- HTML 이스케이프 없이 출력 -->
{{{chartSvg}}}
```

---

## 🔧 문제 해결

### 1. 한글 폰트 깨짐

- 폰트 파일이 `templates/assets/fonts/` 경로에 있는지 확인
- `ASSET_DIR` 경로가 올바른지 확인
- Playwright가 `file://` 프로토콜을 지원하는지 확인

### 2. PDF 생성 실패

- Playwright Chromium이 설치되어 있는지 확인: `npx playwright install chromium`
- 메모리 부족 시 `memory` 옵션 증가
- 타임아웃 시 `timeoutSeconds` 증가

### 3. Storage 업로드 실패

- Firebase Storage 권한 확인
- Storage 버킷이 존재하는지 확인

---

## ✅ 체크리스트

- [x] Playwright, Handlebars 의존성 추가
- [x] 템플릿 파일 구조 생성
- [x] 템플릿 렌더러 구현
- [x] Playwright PDF 생성 함수
- [x] Cloud Functions HTTP 핸들러
- [x] Storage 업로드 + Outbox insert
- [ ] 한글 폰트 파일 추가
- [ ] Cloud Scheduler 설정
- [ ] 로컬/스테이징 테스트

---

## 🚀 다음 단계

1. **한글 폰트 추가**
   - NotoSansKR 폰트 다운로드
   - `functions/templates/assets/fonts/` 경로에 배치

2. **로컬 테스트**
   ```bash
   cd functions
   npm run build
   firebase emulators:start --only functions
   ```

3. **스테이징 배포**
   ```bash
   firebase deploy --only functions:generateMonthlyReportScheduler
   ```

4. **Cloud Scheduler 설정**
   - GCP Console 또는 gcloud CLI 사용

5. **프로덕션 배포**
   - 모든 테스트 완료 후 배포

