# 🧪 월간 리포트 PDF 생성 테스트 가이드

## ✅ 현재 상태

- [x] Playwright 설치 완료
- [x] 폰트 디렉토리 생성 완료
- [x] 코드 빌드 완료
- [ ] 폰트 파일 (선택사항 - 폰트 없이도 동작)

## 📋 테스트 단계

### 1. 로컬 에뮬레이터 실행

```bash
cd functions
firebase emulators:start --only functions
```

### 2. HTTP 호출 테스트

PowerShell에서:

```powershell
# 프로젝트 ID 확인 필요
$projectId = "your-project-id"
$token = "test-token-123"  # 임시 토큰

# 환경 변수 설정 (에뮬레이터용)
$env:CRON_TOKEN = $token

# HTTP 호출
Invoke-WebRequest -Uri "http://localhost:5001/$projectId/asia-northeast3/generateMonthlyReportScheduler" `
  -Method GET `
  -Headers @{"X-CRON-TOKEN"=$token} `
  | Select-Object -ExpandProperty Content
```

또는 curl 사용:

```bash
curl -X GET \
  "http://localhost:5001/{project-id}/asia-northeast3/generateMonthlyReportScheduler" \
  -H "X-CRON-TOKEN: test-token-123"
```

### 3. 예상 결과

성공 시:
```json
{
  "ok": true,
  "reportMonth": "2025-01",
  "processed": 1,
  "succeeded": 1,
  "failed": 0,
  "results": [
    {
      "teamId": "team-123",
      "success": true,
      "pdfUrl": "https://storage.googleapis.com/..."
    }
  ]
}
```

### 4. 로그 확인

에뮬레이터 콘솔에서 다음 로그 확인:
- `[Scheduler] 월간 리포트 생성 시작`
- `[Scheduler] 팀 처리 시작: {teamId}`
- `[Scheduler] 팀 처리 완료: {teamId}`

### 5. PDF 확인

Storage에 업로드된 PDF 파일 확인:
- Firebase Console → Storage
- `reports/team_{teamId}/monthly/{yyyyMM}/monthly_report_v1.pdf`

## 🔧 문제 해결

### 에러: "CRON_TOKEN이 없습니다"

에뮬레이터에서는 환경 변수 설정:
```powershell
$env:CRON_TOKEN = "test-token-123"
```

### 에러: "팀을 찾을 수 없습니다"

테스트용 팀 데이터가 Firestore에 있는지 확인:
- `teams/{teamId}` 문서 존재
- `enableNewFeeSystem: true` 설정

### 에러: "Playwright 브라우저를 찾을 수 없습니다"

```bash
npx playwright install chromium
```

### 한글 깨짐

폰트 파일이 없어도 동작하지만, 한글이 시스템 기본 폰트로 표시될 수 있습니다.
폰트 추가 방법: `templates/assets/fonts/DOWNLOAD_INSTRUCTIONS.md` 참고

## 🚀 프로덕션 배포

### 1. 환경 변수 설정

```bash
firebase functions:config:set cron.token="your-secret-token-here"
```

### 2. 배포

```bash
firebase deploy --only functions:generateMonthlyReportScheduler
```

### 3. Cloud Scheduler 설정

GCP Console 또는 gcloud CLI:
- Cron: `5 0 1 * *`
- Timezone: `Asia/Seoul`
- URL: `https://asia-northeast3-{project-id}.cloudfunctions.net/generateMonthlyReportScheduler`
- 헤더: `X-CRON-TOKEN: your-secret-token-here`

