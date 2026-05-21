# ✅ 배포 성공!

## 🎉 배포 완료

`generateMonthlyReportScheduler` 함수가 성공적으로 배포되었습니다.

### 함수 정보

- **함수명**: `generateMonthlyReportScheduler`
- **함수 URL**: `https://generatemonthlyreportscheduler-2q3hdcfwca-du.a.run.app`
- **리전**: `asia-northeast3`
- **런타임**: Node.js 20 (2nd Gen)

---

## 📋 다음 단계 (필수)

### 1. CRON_TOKEN 환경 변수 설정

Firebase Console에서:
1. Firebase Console → Functions
2. `generateMonthlyReportScheduler` 함수 선택
3. **설정** 탭 → **Secrets** 섹션
4. **새 Secret 추가** 클릭
5. **이름**: `CRON_TOKEN`
6. **값**: 강력한 랜덤 문자열 입력 (예: `your-secret-token-here-12345`)
7. **저장**

### 2. Cloud Scheduler 설정

GCP Console에서:
1. **Cloud Scheduler** → **작업 만들기**
2. 설정:
   - **이름**: `monthly-report-generator`
   - **지역**: `asia-northeast3`
   - **빈도**: `5 0 1 * *` (Cron 표현식)
   - **타임존**: `Asia/Seoul`
   - **대상**: `HTTP`
   - **URL**: `https://generatemonthlyreportscheduler-2q3hdcfwca-du.a.run.app`
   - **HTTP 메서드**: `GET`
   - **헤더**:
     - **이름**: `X-CRON-TOKEN`
     - **값**: 위에서 설정한 `CRON_TOKEN` 값

### 3. 수동 테스트

```powershell
$token = "your-secret-token-here"
Invoke-WebRequest -Uri "https://generatemonthlyreportscheduler-2q3hdcfwca-du.a.run.app" `
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

---

## 🔧 문제 해결

### 404 에러

- 함수 URL이 올바른지 확인
- 함수가 실제로 배포되었는지 확인: `firebase functions:list`

### 403 Forbidden

- CRON_TOKEN이 올바르게 설정되었는지 확인
- 헤더에 `X-CRON-TOKEN`이 포함되었는지 확인

### 함수 실행 실패

- 로그 확인: `firebase functions:log --only generateMonthlyReportScheduler`
- Playwright Chromium 설치 확인 (자동 설치됨)
- Storage 권한 확인

---

## ✅ 체크리스트

- [x] 함수 배포 완료
- [ ] CRON_TOKEN 환경 변수 설정
- [ ] Cloud Scheduler 설정
- [ ] 수동 테스트 성공
- [ ] 로그 확인

---

## 📊 모니터링

배포 후 다음을 모니터링:

1. **함수 실행 횟수**: Firebase Console → Functions → 사용량
2. **에러 로그**: Firebase Console → Functions → 로그
3. **Storage 사용량**: Firebase Console → Storage
4. **Outbox 레코드**: Firestore → `notificationOutbox` 컬렉션

