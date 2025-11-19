# Step 42: AI Insights Dashboard

실시간 품질 메트릭, 리포트 뷰, 액션 패널을 포함한 종합 대시보드 컴포넌트입니다.

## 주요 기능

### 1. KPI 카드
- **품질 점수**: 전체 품질 점수 (0-1)
- **커버리지**: 문장 타임스탬프 커버리지 (%)
- **Gaps**: 공백 구간 개수
- **평균 길이**: 문장당 평균 오디오 길이 (초)

### 2. 리포트 뷰
- **오디오 플레이어**: 리포트 오디오 재생/일시정지
- **검색 기능**: 문장 검색
- **Tabs**:
  - **문장 목록**: 타임스탬프와 함께 문장 표시, 현재 재생 중인 문장 하이라이트
  - **키워드**: 클릭 시 해당 키워드가 포함된 첫 문장으로 이동

### 3. 액션 패널
자동화 액션 버튼들:
- **Sheets 갱신**: Google Sheets 동기화
- **Notion 갱신**: Notion Database 동기화
- **주간 AI 요약 생성**: Step 39 함수 호출
- **다음주 예측 보고**: Step 40 함수 호출
- **시각화 리포트**: Step 41 함수 호출
- **배치 큐잉**: Step 36 함수 호출 (리포트 처리)

## 사용 방법

### 1. 컴포넌트 사용

```tsx
import Step42_AIInsightsDashboard from "@/components/Step42_AIInsightsDashboard";

<Step42_AIInsightsDashboard reportId="REPORT_ID" />
```

### 2. 페이지 라우트

```
/app/admin/ai-insights/:reportId
```

예시:
```
/app/admin/ai-insights/abc123def456
```

### 3. ReportsPage에서 링크 추가

```tsx
import { Link } from "react-router-dom";

<Link to={`/app/admin/ai-insights/${report.id}`}>
  🧠 AI Insights
</Link>
```

## 컴포넌트 구조

### Step42_AIInsightsDashboard
- **Props**: `reportId: string`
- **기능**:
  - Firestore 실시간 구독 (`reports/{reportId}`)
  - 품질 리포트 로드 (`reports/{reportId}/qualityReports`)
  - 오디오 재생 및 현재 문장 추적
  - 문장 클릭 시 오디오 시크

### KPI
- **Props**: `title`, `value`, `footer?`
- **기능**: 메트릭 카드 표시

### ActionButton
- **Props**: `label`, `href`
- **기능**: 외부 함수 호출 링크

## UI 컴포넌트

### 새로 추가된 컴포넌트

1. **Tabs** (`src/components/ui/tabs.tsx`)
   - `Tabs`: 탭 컨테이너
   - `TabsList`: 탭 헤더 컨테이너
   - `TabsTrigger`: 탭 버튼
   - `TabsContent`: 탭 콘텐츠

2. **Badge** (`src/components/ui/badge.tsx`)
   - `variant`: "default" | "secondary" | "outline"
   - 키워드 표시용

## 데이터 구조

### Firestore 문서 구조

```
reports/{reportId}
  - content: string
  - audioUrl: string
  - sentenceTimestamps: SentenceTimestamp[]
  - keywords: string[]
  - lastQualityScore?: number

reports/{reportId}/qualityReports/{timestamp}
  - createdAt: Timestamp
  - metrics: {
      overallScore: number
      coverage: number
      gaps: number
      overlaps: number
      avgDur: number
    }
```

### SentenceTimestamp 인터페이스

```typescript
interface SentenceTimestamp {
    start: number; // 초 단위
    end: number;   // 초 단위
}
```

## 환경 변수

```env
VITE_FUNCTIONS_ORIGIN=https://asia-northeast3-yago-vibe-spt.cloudfunctions.net
```

## 함수 엔드포인트

액션 버튼들이 호출하는 함수들:

1. `/exportQualityToSheets` - Step 38
2. `/exportQualityToNotion` - Step 38
3. `/generateWeeklySummary` - Step 39
4. `/predictQualityTrend` - Step 40
5. `/generateVisualQualityReport` - Step 41
6. `/enqueueReportProcessing` - Step 36

## 스타일링

- **반응형 디자인**: 모바일/데스크톱 최적화
- **다크 모드 지원**: `dark:` 클래스 사용
- **애니메이션**: 현재 재생 문장 하이라이트 효과

## 개선 사항

### 추후 추가 가능한 기능

1. **실시간 차트**: 품질 점수 트렌드 차트
2. **알림 설정**: 품질 점수 임계치 초과 시 알림
3. **PDF 내보내기**: 대시보드 스냅샷 PDF 생성
4. **비교 뷰**: 여러 리포트 비교
5. **필터링**: 날짜/품질 점수 범위 필터

## 문제 해결

### 오디오 재생이 안 될 때

- `audioUrl`이 Firestore에 있는지 확인
- 브라우저 콘솔에서 CORS 오류 확인
- 오디오 파일 형식 확인 (MP3 권장)

### 품질 리포트가 표시되지 않을 때

- `reports/{reportId}/qualityReports` 컬렉션 확인
- Step 36 배치 처리 실행 여부 확인

### 액션 버튼이 작동하지 않을 때

- `VITE_FUNCTIONS_ORIGIN` 환경 변수 확인
- Firebase Functions 배포 상태 확인
- 브라우저 콘솔에서 네트워크 오류 확인

## 예시 스크린샷

```
┌─────────────────────────────────────────┐
│ 🧠 AI Insights Dashboard                 │
│ 리포트 ID: abc123def456                  │
├─────────────────────────────────────────┤
│ [품질 점수: 0.94] [커버리지: 98.1%]     │
│ [Gaps: 2] [평균 길이: 2.3s]             │
├─────────────────────────────────────────┤
│ 리포트 뷰                                │
│ [오디오 플레이어] [Play/Pause]           │
│ [검색 바]                                │
│ ┌─────────────────────────────────────┐ │
│ │ [문장 목록] [키워드]                │ │
│ │                                     │ │
│ │ ¶ 1 [00:12–00:15]                   │ │
│ │ 문장 내용...                        │ │
│ │ [키워드1] [키워드2]                 │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ 자동화 액션                              │
│ [Sheets 갱신] [Notion 갱신]            │
│ [주간 AI 요약] [다음주 예측]            │
│ [시각화 리포트] [배치 큐잉]            │
└─────────────────────────────────────────┘
```

## 다음 단계

✅ Step 43: 실시간 모니터링 알림 (예고)
- WebSocket 기반 실시간 업데이트
- 푸시 알림 (품질 점수 임계치 초과 시)
- 대시보드 자동 새로고침

