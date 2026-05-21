# 🔧 배포 후 설정 가이드

## ✅ 배포 완료!

`generateMonthlyReportScheduler` 함수가 성공적으로 배포되었습니다.

## 📋 다음 단계

### 1. 환경 변수 설정 (CRON_TOKEN)

Firebase Functions v2에서는 환경 변수를 Secrets로 관리합니다.

#### 방법 1: Firebase Console (권장)

1. Firebase Console → Functions
2. `generateMonthlyReportScheduler` 함수 선택
3. **설정** 탭 → **Secrets** 섹션
4. **새 Secret 추가** 클릭
5. **이름**: `CRON_TOKEN`
6. **값**: 강력한 랜덤 문자열 입력 (예: `your-secret-token-here-12345`)
7. **저장**

#### 방법 2: Firebase CLI

```bash
firebase functions:secrets:set CRON_TOKEN
# 프롬프트에서 Secret 값 입력
```

### 2. Cloud Scheduler 설정

#### GCP Console에서 설정

1. **GCP Console** → **Cloud Scheduler**
2. **작업 만들기** 클릭
3. 설정 입력:
   - **이름**: `monthly-report-generator`
   - **지역**: `asia-northeast3`
   - **설명**: `매월 1일 00:05 KST 월간 리포트 생성`
   - **빈도**: `5 0 1 * *` (Cron 표현식)
   - **타임존**: `Asia/Seoul`
   - **대상**: `HTTP`
   - **URL**: `https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/generateMonthlyReportScheduler`
   - **HTTP 메서드**: `GET`
   - **헤더**:
     - **이름**: `X-CRON-TOKEN`
     - **값**: 위에서 설정한 `CRON_TOKEN` 값

#### gcloud CLI로 설정

```bash
gcloud scheduler jobs create http monthly-report-generator \
  --location=asia-northeast3 \
  --schedule="5 0 1 * *" \
  --time-zone="Asia/Seoul" \
  --uri="https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/generateMonthlyReportScheduler" \
  --http-method=GET \
  --headers="X-CRON-TOKEN=your-secret-token-here"
```

### 3. 수동 테스트

배포 후 즉시 테스트:

```powershell
$token = "your-secret-token-here"
Invoke-WebRequest -Uri "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/generateMonthlyReportScheduler" `
  -Method GET `
  -Headers @{"X-CRON-TOKEN"=$token} `
  | Select-Object -ExpandProperty Content
```

예상 응답:
```json
{
  "ok": true,
  "reportMonth": "2025-01",
  "processed": 1,
  "succeeded": 1,
  "failed": 0,
  "results": [...]
}
```

### 4. 로그 확인

```bash
firebase functions:log --only generateMonthlyReportScheduler --limit 20
```

## ✅ 체크리스트

- [x] 함수 배포 완료
- [ ] CRON_TOKEN 환경 변수 설정
- [ ] Cloud Scheduler 설정
- [ ] 수동 테스트 성공
- [ ] 로그 확인

## 🔍 문제 해결

### 에러: "Forbidden" (403)

- CRON_TOKEN이 올바르게 설정되었는지 확인
- Cloud Scheduler 헤더에 토큰이 포함되었는지 확인

### 에러: "팀을 찾을 수 없습니다"

- Firestore에 `teams` 컬렉션 존재 확인
- `enableNewFeeSystem: true` 설정 확인

### 에러: "Playwright 브라우저를 찾을 수 없습니다"

- Cloud Functions에서 Playwright Chromium이 자동 설치되는지 확인
- 필요 시 `package.json`에 `playwright` 의존성 확인

## 📊 모니터링

배포 후 다음을 모니터링:

1. **함수 실행 횟수**: Firebase Console → Functions → 사용량
2. **에러 로그**: Firebase Console → Functions → 로그
3. **Storage 사용량**: Firebase Console → Storage
4. **Outbox 레코드**: Firestore → `notificationOutbox` 컬렉션

