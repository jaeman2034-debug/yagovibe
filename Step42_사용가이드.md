# Step 42: AI Insights Dashboard 사용 가이드

## 📋 개요

Step 42 AI Insights Dashboard는 리포트 상세 정보를 종합적으로 보여주는 대시보드입니다. 품질 메트릭, 트렌드 차트, 리포트 뷰어, 원클릭 액션을 제공합니다.

## 🚀 빠른 시작

### 1. 컴포넌트 사용

```tsx
import Step42_AIInsightsDashboard from "@/components/Step42_AIInsightsDashboard";

export default function AdminInsightsPage() {
  return <Step42_AIInsightsDashboard reportId="REPORT_DOC_ID" />;
}
```

### 2. 페이지/라우트에서 사용

```tsx
// src/pages/admin/AIInsightsPage.tsx
import { useParams } from "react-router-dom";
import Step42_AIInsightsDashboard from "@/components/Step42_AIInsightsDashboard";

export default function AIInsightsPage() {
  const { reportId } = useParams<{ reportId: string }>();
  
  if (!reportId) {
    return <div>리포트 ID가 필요합니다.</div>;
  }

  return <Step42_AIInsightsDashboard reportId={reportId} />;
}
```

### 3. ReportsPage에서 링크 추가

```tsx
// src/pages/admin/ReportsPage.tsx
import { Link } from "react-router-dom";

// 리포트 목록에서
<Link to={`/app/admin/ai-insights/${report.id}`}>
  🧠 AI Insights
</Link>
```

## 📦 필요 패키지

```bash
npm install recharts lucide-react
# 또는
pnpm add recharts lucide-react
```

### UI 컴포넌트 (shadcn/ui)

- `@/components/ui/card`
- `@/components/ui/tabs`
- `@/components/ui/button`
- `@/components/ui/badge`

### Firestore 초기화

`@/lib/firebase`가 준비되어 있어야 합니다:

```tsx
// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = { /* ... */ };
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

## 🎯 주요 기능

### 1. KPI 카드

- **품질 점수**: 전체 품질 점수 (0-1)
- **커버리지**: 문장 타임스탬프 커버리지 (%)
- **키워드 수**: 추출된 키워드 개수
- **Gaps**: 공백 구간 개수
- **평균 길이**: 문장당 평균 오디오 길이 (초)

### 2. 4주 트렌드 차트

- **recharts** LineChart 사용
- Score & Coverage 트렌드 시각화
- 최근 4주간의 일별 평균 데이터

### 3. 리포트 뷰어

- **오디오 플레이어**: 재생/일시정지
- **검색 기능**: 문장 검색
- **Tabs**:
  - **문장 목록**: 타임스탬프와 함께 문장 표시, 현재 재생 중인 문장 하이라이트
  - **키워드**: 클릭 시 해당 키워드가 포함된 첫 문장으로 이동
- **문장 클릭**: 오디오 해당 구간으로 시크

### 4. 원클릭 액션

#### PDF 내보내기
- 📄 **PDF 내보내기**: 기본 PDF
- 🔥 **Heatmap PDF**: 키워드 히트맵 포함 PDF

#### EPUB 내보내기
- 📚 **EPUB 내보내기**: 기본 EPUB
- 🔊 **Read-Aloud EPUB**: SMIL Media Overlays 포함 EPUB

#### 동기화
- 📊 **Sheets 갱신**: Google Sheets 동기화
- 📝 **Notion 갱신**: Notion Database 동기화

#### AI 리포트
- 🧠 **주간 AI 요약**: Step 39 함수 호출
- 📈 **다음주 예측**: Step 40 함수 호출
- 🎨 **시각화 리포트**: Step 41 함수 호출

#### 배치 처리
- ⚙️ **배치 큐잉**: Step 36 함수 호출 (리포트 처리)

## 📊 데이터 구조

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

## 🔧 환경 변수

```env
VITE_FUNCTIONS_ORIGIN=https://asia-northeast3-yago-vibe-spt.cloudfunctions.net
```

## 📱 반응형 디자인

- **모바일**: 1열 그리드
- **태블릿**: 2-3열 그리드
- **데스크톱**: 3-5열 그리드

## 🎨 커스터마이징

### KPI 카드 색상 변경

```tsx
// src/components/Step42_AIInsightsDashboard.tsx
function KPI({ title, value, footer }: { ... }) {
  return (
    <Card className="shadow-sm border-purple-200">
      {/* ... */}
    </Card>
  );
}
```

### 차트 색상 변경

```tsx
<Line 
  yAxisId="left" 
  type="monotone" 
  dataKey="score" 
  stroke="#your-color"  // 색상 변경
  strokeWidth={2} 
  name="Score" 
/>
```

## 🐛 문제 해결

### 트렌드 차트가 표시되지 않을 때

1. **Firestore 데이터 확인**: `reports/{reportId}/qualityReports` 컬렉션에 최근 4주 데이터가 있는지 확인
2. **콘솔 확인**: 브라우저 개발자 도구에서 오류 메시지 확인
3. **인덱스 확인**: Firestore에서 `createdAt` 필드에 대한 인덱스가 생성되었는지 확인

### 오디오 재생이 안 될 때

1. **audioUrl 확인**: Firestore에 `audioUrl` 또는 `audioURL` 필드가 있는지 확인
2. **CORS 확인**: 오디오 파일 서버의 CORS 설정 확인
3. **파일 형식**: MP3 형식 권장

### 액션 버튼이 작동하지 않을 때

1. **환경 변수 확인**: `VITE_FUNCTIONS_ORIGIN`이 올바르게 설정되었는지 확인
2. **Functions 배포 확인**: Firebase Functions가 배포되었는지 확인
3. **네트워크 확인**: 브라우저 개발자 도구 Network 탭에서 요청 상태 확인

## 📝 예시 코드

### 완전한 예시 페이지

```tsx
// src/pages/admin/AIInsightsPage.tsx
import { useParams } from "react-router-dom";
import Step42_AIInsightsDashboard from "@/components/Step42_AIInsightsDashboard";

export default function AIInsightsPage() {
    const { reportId } = useParams<{ reportId: string }>();

    if (!reportId) {
        return (
            <div className="p-6 text-center text-red-600">
                리포트 ID가 필요합니다.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
            <div className="container mx-auto py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        🧠 AI Insights Dashboard
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        리포트 ID: {reportId}
                    </p>
                </div>
                <Step42_AIInsightsDashboard reportId={reportId} />
            </div>
        </div>
    );
}
```

### ReportsPage에서 링크 추가

```tsx
// src/pages/admin/ReportsPage.tsx
import { Link } from "react-router-dom";

// 리포트 목록에서
{reports.map((report) => (
  <div key={report.id}>
    <h3>{report.title}</h3>
    <Link 
      to={`/app/admin/ai-insights/${report.id}`}
      className="text-blue-600 hover:underline"
    >
      🧠 AI Insights 보기
    </Link>
  </div>
))}
```

## 🎯 다음 단계

- Step 43: 실시간 모니터링 알림 (예고)
- Step 44: 대시보드 비교 뷰 (예고)
- Step 45: 자동 리포트 생성 워크플로우 (예고)

