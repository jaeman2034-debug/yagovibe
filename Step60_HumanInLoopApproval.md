# Step 60: Human-In-The-Loop Approval Workflow (인사이트 승인 워크플로우)

Step 59에서 자동 생성된 인사이트 초안(주간 리포트)을 운영자가 검토·수정·승인 후 배포하도록 하는 Human-In-The-Loop 승인 파이프라인을 구축합니다.

## 📋 목표

1. 인사이트 리포트 초안 생성 (status: 'draft')
2. 운영자 검토 UI 제공
3. 승인/반려 기능
4. 승인 시 자동 배포 (Slack/Email)
5. 리비전 관리

## 🧩 전체 구조

```
[runProactiveInsights]  →  insightReports/{id}
       ↓ (status: 'draft')

[Admin Reviewer UI]  →  검토 / 코멘트 / 승인 / 반려
       ↓

[Functions: publishInsight]
       ↓

Slack · Email · PDF · TTS 배포
```

## 🗄️ Firestore 스키마 확장

### insightReports/{reportId}

**추가된 필드**:

```typescript
{
  // 기존 필드...
  status: "draft" | "approved" | "rejected" | "published";
  reviewer: {
    uid: string;
    name: string;
  };
  comments: Array<{
    uid: string;
    name: string;
    text: string;
    createdAt: Timestamp;
  }>;
  reviewHistory: Array<{
    action: "approve" | "reject" | "updated";
    uid: string;
    name: string;
    ts: Timestamp;
    comment?: string;
  }>;
  publishedAt?: Timestamp;
  revision: number; // 리비전 번호
  updatedAt?: Timestamp;
}
```

## ⚙️ Functions 구현

### 1. publishInsight (승인/반려)

**파일**: `functions/src/step60.publishInsight.ts`

- **엔드포인트**: `POST /publishInsight`
- **Body**: `{ id: string, decision: 'approve' | 'reject', reviewer: { uid, name }, comment?: string }`
- **기능**:
  - 리포트 상태 업데이트
  - 리뷰 히스토리 추가
  - 승인 시 자동 배포 (Slack/Email)
  - 반려 시 코멘트 저장

### 2. updateInsight (리비전 생성)

**파일**: `functions/src/step60.publishInsight.ts`

- **엔드포인트**: `POST /updateInsight`
- **Body**: `{ id: string, summary: string, highlights: any[], reviewer: { uid, name } }`
- **기능**:
  - 리포트 수정
  - 리비전 번호 증가
  - 상태를 'draft'로 변경

### 3. getInsightReports (리포트 조회)

**파일**: `functions/src/step60.getInsightReports.ts`

- **엔드포인트**: `GET /getInsightReports?status=draft&teamId=SOHEUL_FC&limit=20`
- **기능**: 리포트 조회 (status, teamId 필터 지원)

## 🖥️ Frontend - InsightReview

**파일**: `src/pages/admin/InsightReview.tsx`

### 기능

- 리포트 목록 표시 (status 필터)
- 리포트 상세 정보 표시 (요약, 하이라이트, 경보, 리뷰 히스토리, 코멘트)
- 승인 버튼
- 반려 버튼 (코멘트 필수)
- 수정 버튼 (리비전 생성)
- 상태별 색상 구분

### 접근 경로

```
/app/admin/insight-review
(관리자 권한 필요)
```

## 📊 Workflow 상태 전이 규칙

| 현재 상태 | 액션 | 결과 |
|----------|------|------|
| `draft` | `approve` | `approved` → `published` (자동 배포) |
| `draft` | `reject` | `rejected` |
| `approved` | 수정됨 | `draft` (리비전 생성) |
| `published` | 재검토 요청 | `draft` (리비전 증가) |

## 🔄 데이터 흐름

### 1. 리포트 생성 (Step 59)

```
runProactiveInsights → insightReports/{id} (status: 'draft')
```

### 2. 검토 (Step 60)

```
InsightReview UI → 리포트 목록 조회 (status: 'draft')
```

### 3. 승인/반려

```
승인 → publishInsight → status: 'approved' → 배포 → status: 'published'
반려 → publishInsight → status: 'rejected' → 코멘트 저장
```

### 4. 수정

```
수정 → updateInsight → revision 증가 → status: 'draft'
```

## 📝 Slack/Email 통합 메시지 예시

### 승인 시

```
📣 [YAGO VIBE 인사이트 승인]

팀: 소흘FC
요약: 조치 연결률 72%, 상위 원인 규칙 3개
결정: ✅ 승인됨 by 운영자 (2025-11-04)
리포트 ID: abc123
```

## 🔧 배포 절차

### 1. Functions 배포

```bash
firebase deploy --only functions:publishInsight,functions:updateInsight,functions:getInsightReports
```

### 2. 프론트엔드 접근

```
/app/admin/insight-review
(관리자 권한 필요)
```

## 📈 사용 시나리오

### 시나리오 1: 승인 워크플로우

1. Step 59에서 리포트 자동 생성 (status: 'draft')
2. InsightReview 페이지 접근
3. 리포트 상세 정보 확인
4. "승인" 버튼 클릭
5. 자동 배포 (Slack/Email)
6. status: 'published'로 변경

### 시나리오 2: 반려 워크플로우

1. 리포트 상세 정보 확인
2. "반려" 버튼 클릭
3. 코멘트 입력 (필수)
4. status: 'rejected'로 변경
5. 코멘트 저장

### 시나리오 3: 수정 워크플로우

1. 승인된 리포트 확인
2. "수정" 버튼 클릭
3. 요약 수정
4. 리비전 생성 (revision 증가)
5. status: 'draft'로 변경

## 🎨 확장 아이디어

### 1. 다중 승인자

- 여러 승인자가 순차적으로 승인 필요
- 승인 체인 설정

### 2. 승인 대기 알림

- 리포트 생성 시 Slack 알림
- 승인 대기 시간 경과 시 리마인더

### 3. 승인 템플릿

- 승인 시 자동 생성되는 메시지 템플릿 커스터마이징
- 팀별 다른 템플릿

## 🐛 문제 해결

### 문제 1: 승인 후 배포가 안됨

**원인**: 환경 변수 미설정

**해결**:
```bash
firebase functions:config:get
# SLACK_WEBHOOK_URL, SMTP_USER, SMTP_PASS 확인
```

### 문제 2: 리비전이 생성되지 않음

**원인**: updateInsight 함수 호출 실패

**해결**:
- Functions 로그 확인
- 권한 확인

### 문제 3: 코멘트가 저장되지 않음

**원인**: 반려 시 코멘트가 비어있음

**해결**:
- 반려 시 코멘트 필수 입력 확인
- UI에서 코멘트 입력 강제

## 📚 다음 단계

- Step 61: 다중 승인자 체인
- Step 62: 승인 대기 알림
- Step 63: 승인 템플릿 커스터마이징

