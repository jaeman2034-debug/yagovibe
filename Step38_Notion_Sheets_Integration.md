# Step 38: Notion / Google Sheets 연동 → 실시간 품질 대시보드 자동 생성

BigQuery 데이터를 Notion/Google Sheets로 실시간 동기화하고, 자동 시각화 대시보드를 생성합니다.

## 구성 요소

### 1. Google Sheets 연동
- **함수**: `exportQualityToSheets`
- **동작**: BigQuery에서 최근 30일간 일별 통계 조회 → Google Sheets 업데이트
- **범위**: `Quality!A1:E` (Date, AvgScore, Coverage, Gaps, Overlaps)

### 2. Notion 연동
- **함수**: `exportQualityToNotion`
- **동작**: BigQuery에서 최근 7일간 일별 통계 조회 → Notion Database에 페이지 생성
- **속성**: Date, Average Score, Coverage, Gaps, Overlaps

### 3. 자동 실행
- `sendWeeklyQualityReport` (Step 37) 완료 후 자동으로 Sheets/Notion 업데이트

## 설치 및 설정

### 1. 패키지 확인

`googleapis`는 이미 설치되어 있습니다. 추가 패키지 불필요.

### 2. Google Sheets 설정

#### 서비스 계정 생성

1. [Google Cloud Console](https://console.cloud.google.com/) → IAM & Admin → Service Accounts
2. 서비스 계정 생성
3. 서비스 계정 키 생성 (JSON 다운로드)
4. Google Sheets API 활성화

#### Google Sheets 준비

1. Google Sheets 생성
2. 시트 이름: `Quality` (또는 원하는 이름)
3. 첫 행: `Date`, `AvgScore`, `Coverage`, `Gaps`, `Overlaps`
4. 서비스 계정 이메일에 공유 권한 부여 (편집자 권한)

#### 환경 변수 설정

```bash
# 서비스 계정 JSON을 Base64로 인코딩하거나 환경 변수로 설정
export GOOGLE_CREDENTIALS_JSON='{"type":"service_account",...}'
export SHEETS_ID="your-google-sheet-id"
```

또는 Firebase Functions 환경 변수:

```bash
firebase functions:config:set \
  sheets.id="your-google-sheet-id" \
  google.credentials_json='{"type":"service_account",...}'
```

### 3. Notion 설정

#### Notion Integration 생성

1. [Notion Integrations](https://www.notion.so/my-integrations) → New integration 생성
2. Integration 이름: "YAGO VIBE Quality Sync"
3. Internal Integration 선택
4. Capabilities: Read content, Update content, Insert content
5. Integration Token 복사

#### Notion Database 생성

1. Notion 페이지에서 Database 생성
2. 속성 설정:
   - `Date` (Date)
   - `Average Score` (Number)
   - `Coverage` (Number)
   - `Gaps` (Number)
   - `Overlaps` (Number)
3. Database ID 복사 (URL에서 확인)

#### 환경 변수 설정

```bash
export NOTION_DB="your-notion-database-id"
export NOTION_TOKEN="secret_xxxxxxxx"
```

또는 Firebase Functions 환경 변수:

```bash
firebase functions:config:set \
  notion.db="your-notion-database-id" \
  notion.token="secret_xxxxxxxx"
```

### 4. Functions 배포

```bash
cd functions
firebase deploy --only functions:exportQualityToSheets,functions:exportQualityToNotion
```

## 사용 방법

### 자동 실행

매주 월요일 09:00 (Asia/Seoul)에 `sendWeeklyQualityReport` 실행 후 자동으로 Sheets/Notion 업데이트됩니다.

### 수동 실행

```bash
# Google Sheets 동기화
curl -X POST https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/exportQualityToSheets

# Notion 동기화
curl -X POST https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/exportQualityToNotion
```

## 시각화 설정

### Google Sheets 차트

1. `Quality!A1:E` 범위 선택
2. 삽입 → 차트
3. 차트 유형: 라인 차트
4. X축: Date
5. Y축: AvgScore, Coverage
6. 차트 제목: "주간 품질 트렌드"

### Notion Board View

1. Database에서 View → Board 선택
2. Group by: Date
3. Properties: Average Score, Coverage 표시
4. 필터: 최근 7일
5. 색상 태그: Average Score 기준
   - 0.9 이상: 녹색
   - 0.8-0.9: 노란색
   - 0.8 미만: 빨간색

## 데이터 형식

### Google Sheets

| Date | AvgScore | Coverage | Gaps | Overlaps |
|------|----------|----------|------|----------|
| 2025-11-01 | 0.93 | 97.4 | 2 | 1 |
| 2025-11-02 | 0.95 | 98.1 | 1 | 0 |

### Notion Database

각 날짜별로 페이지가 생성되며, 다음 속성을 가집니다:
- **Date**: 날짜
- **Average Score**: 평균 점수 (0-1)
- **Coverage**: 커버리지 (0-100)
- **Gaps**: 공백 구간 수
- **Overlaps**: 중복 구간 수

## 아키텍처

```
[Cloud Scheduler]
      ↓ (매주 월요일 9시)
[sendWeeklyQualityReport]
      ↓
[BigQuery 통계 조회]
      ↓
[Slack/Email 발송]
      ↓
[exportQualityToSheets] ──→ [Google Sheets]
      ↓
[exportQualityToNotion] ──→ [Notion Database]
```

## 문제 해결

### Google Sheets 권한 오류

```bash
# 서비스 계정 이메일 확인
# Google Sheets에서 서비스 계정 이메일에 공유 권한 부여
# Google Sheets API 활성화 확인
gcloud services enable sheets.googleapis.com
```

### Notion API 오류

```bash
# Integration Token 확인
# Database ID 확인 (URL에서 복사)
# Database에 Integration 연결 확인 (Database → ... → Connections)
```

### 환경 변수 확인

```bash
# Functions 환경 변수 확인
firebase functions:config:get

# 로컬 테스트
firebase functions:shell
> exportQualityToSheets()
```

## BigQuery 쿼리 예시

### 최근 30일간 일별 통계

```sql
SELECT 
    DATE(created_at) as date, 
    AVG(overallScore) as avg_score,
    AVG(coverage) as avg_coverage,
    SUM(gaps) as total_gaps,
    SUM(overlaps) as total_overlaps
FROM `yago_reports.quality_metrics`
WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY date 
ORDER BY date ASC
```

## 다음 단계

✅ Step 39: 실시간 모니터링 대시보드 (예고)
- Grafana/Data Studio 연동
- 실시간 알림 (품질 점수 임계치 초과 시)
- 자동 리포트 생성 및 배포

