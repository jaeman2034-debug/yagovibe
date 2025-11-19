# Step 63: Compliance Export & DSAR Automation (감사 번들 및 데이터 주체 요청 자동화)

YAGO VIBE 플랫폼의 법적 준수·개인정보 보호 체계의 완성 단계로, AI 의사결정 로그, 사용자 데이터, 증거 번들을 자동 수집·압축·배포·삭제하는 기능을 다룹니다.

## 📋 목표

1. GDPR / 한국 개인정보보호법 / ISO 27001 기준에 맞춘 감사 번들 ZIP/PDF 자동 생성
2. DSAR (Data Subject Access Request) 자동 접수/검증/완료 리포트
3. Retention(보존기간) 만료 자동 파기 파이프라인
4. Slack·Email로 진행 상태 알림 + 관리자 승인 워크플로우

## 🧩 전체 아키텍처

```
[auditLogs/*, insightReports/*, userProfiles/*]
   ↓
[Functions: complianceExporter]
   ├─ 사용자 UID / 기간별 데이터 수집
   ├─ PDF + JSON + Hash Manifest 생성
   ├─ GCS 업로드 (Immutable Path)
   └─ Firestore: complianceExports/{id}

[Functions: dsarHandler]
   ├─ 사용자 요청(Email/Form/Slack) 수신
   ├─ 본인인증(OAuth/Token)
   ├─ exportAuditForSubject 호출
   ├─ 승인 후 링크 발행
   └─ 완료 로그 기록 (status='done')

[Functions: retentionCleaner]
   ├─ 정책 기반 삭제
   └─ 대상: auditLogs older than N days
```

## 🗄️ 데이터 스키마

### complianceExports/{exportId}

```typescript
{
  uid: string;
  manifest: {
    start: string;
    end: string;
    exportedAt: string;
    counts: {
      audits: number;
      reports: number;
    };
    hash: string;
    format: string;
    compliance: {
      gdpr: boolean;
      pipa: boolean;
      iso27001: boolean;
    };
  };
  gcsUri: string;
  publicUrl: string;
  status: "completed" | "failed";
  createdAt: Timestamp;
}
```

### dsarRequests/{requestId}

```typescript
{
  uid: string;
  type: "access" | "delete" | "portability";
  status: "pending" | "done" | "failed";
  createdAt: Timestamp;
  verifiedAt?: Timestamp;
  completedAt?: Timestamp;
  result?: any;
}
```

### deletionRequests/{requestId}

```typescript
{
  uid: string;
  requestedAt: Timestamp;
  status: "pending" | "completed" | "failed";
  dsarRequestId: string;
  deletedCount?: number;
  completedAt?: Timestamp;
  error?: string;
}
```

## ⚙️ Functions 구현

### 1. complianceExporter (감사 번들 생성)

**파일**: `functions/src/step63.complianceExporter.ts`

- **엔드포인트**: `GET /complianceExporter?uid=USER_UID&from=DATE&to=DATE`
- **기능**:
  - 사용자 UID / 기간별 데이터 수집
  - ZIP 파일 생성 (auditLogs.json, insightReports.json, manifest.json)
  - GCS 업로드 (Immutable Path)
  - Firestore 기록

### 2. dsarHandler (DSAR 자동화)

**파일**: `functions/src/step63.dsarHandler.ts`

- **엔드포인트**: `POST /dsarHandler`
- **Body**: `{ uid: string, token: string, type: 'access' | 'delete' | 'portability' }`
- **기능**:
  - 토큰 검증 (OAuth/Email Code)
  - 타입별 처리 (access/portability: export, delete: 삭제 요청)
  - Slack/Email 알림
  - 완료 로그 기록

### 3. retentionCleaner (보존기간 만료 파기)

**파일**: `functions/src/step63.retentionCleaner.ts`

- **스케줄**: 매일 02:00
- **기능**:
  - 기본 180일 보존 기간 적용
  - 만료된 auditLogs 삭제
  - DSAR 삭제 요청 처리
  - 시스템 로그 기록
  - Slack 알림

### 4. listComplianceExports (감사 번들 목록)

**파일**: `functions/src/step63.listComplianceExports.ts`

- **엔드포인트**: `GET /listComplianceExports?uid=USER_UID&limit=20`
- **기능**: 감사 번들 목록 조회

### 5. listDSARRequests (DSAR 요청 목록)

**파일**: `functions/src/step63.listComplianceExports.ts`

- **엔드포인트**: `GET /listDSARRequests?uid=USER_UID&status=pending|done`
- **기능**: DSAR 요청 목록 조회

## 🖥️ Frontend - ComplianceCenter

**파일**: `src/pages/admin/ComplianceCenter.tsx`

### 기능

- 감사 번들 테이블 (UID, 기간, 건수, 해시, 상태, 다운로드)
- DSAR 요청 테이블 (UID, 타입, 상태, 요청일, 완료일, 다운로드)
- 법적 준수 항목 매핑 테이블

### 접근 경로

```
/app/admin/compliance
(Owner/SecOps 권한 필요)
```

## ⚖️ 법적 준수 항목 매핑

| 항목 | 규정 | 대응 메커니즘 |
|------|------|-------------|
| 데이터 접근권 | GDPR Art. 15 | DSAR 자동화 (dsarHandler) |
| 삭제권(망각권) | GDPR Art. 17 | retentionCleaner |
| 보존기간 제한 | PIPA 제21조 | Retention 정책 (180일 기본) |
| 이식권(Portability) | GDPR Art. 20 | complianceExporter ZIP/PDF |
| 기록관리의무 | ISO 27001 A.12 | auditLogs + SHA256 무결성 |

## 🔒 보안/권한

### Step 43 Role System 연동

**Frontend (ComplianceCenter.tsx)**:
- `useRoleAccess` 훅 사용
- Owner/SecOps 권한 확인
- 권한 없음 시 접근 차단 UI 표시

**Firestore Rules**:
- `complianceExports`: 요청자 또는 SecOps만 읽기 가능, Functions에서만 쓰기 가능
- `dsarRequests`: 요청자 또는 SecOps만 읽기 가능, Functions에서만 쓰기 가능
- `deletionRequests`: 요청자 또는 SecOps만 읽기 가능, Functions에서만 쓰기 가능
- `systemLogs`: SecOps만 읽기 가능, Functions에서만 쓰기 가능

## 🔧 배포 절차

### 1. 패키지 설치

```bash
cd functions
npm install archiver @google-cloud/storage
npm install --save-dev @types/archiver
```

### 2. GCS 버킷 생성

```bash
gsutil mb gs://yago-vibe-exports
gsutil iam ch serviceAccount:YOUR_FUNCTION_SERVICE_ACCOUNT:objectAdmin gs://yago-vibe-exports
```

### 3. 환경 변수 설정

```bash
firebase functions:config:set \
  gcs.export_bucket="yago-vibe-exports" \
  retention.days="180" \
  slack.webhook_url="YOUR_SLACK_WEBHOOK_URL" \
  smtp.user="YOUR_EMAIL" \
  smtp.pass="YOUR_PASSWORD"
```

### 4. Functions 배포

```bash
firebase deploy --only functions:complianceExporter,functions:dsarHandler,functions:retentionCleaner,functions:listComplianceExports,functions:listDSARRequests
```

### 5. 프론트엔드 접근

```
/app/admin/compliance
(Owner/SecOps 권한 필요)
```

## 📊 사용 시나리오

### 시나리오 1: 감사 번들 생성

1. Compliance Center 접근
2. 사용자 UID 입력
3. 기간 선택 (기본 90일)
4. `complianceExporter` 호출
5. ZIP 파일 다운로드

### 시나리오 2: DSAR 요청

1. 사용자가 DSAR 요청 (Email/Form/Slack)
2. `dsarHandler` 호출 (토큰 검증)
3. 타입별 처리 (access/delete/portability)
4. Slack/Email 알림 발송
5. 완료 로그 기록

### 시나리오 3: 보존기간 만료 파기

1. 매일 02:00 자동 실행
2. 180일 이상 된 auditLogs 삭제
3. DSAR 삭제 요청 처리
4. 시스템 로그 기록
5. Slack 알림 발송

## 🎨 확장 아이디어

### 1. PDF 형식 지원

- ZIP 내부에 PDF 요약 보고서 추가
- pdfmake 또는 pdf-lib 사용

### 2. 자동 승인 워크플로우

- DSAR 요청 자동 승인 (특정 조건)
- 관리자 승인 대기 큐

### 3. 실시간 모니터링

- DSAR 요청 대기 상태 실시간 알림
- 보존기간 만료 예고 알림

## 🐛 문제 해결

### 문제 1: ZIP 파일 생성 실패

**원인**: archiver 패키지 미설치 또는 GCS 권한 오류

**해결**:
```bash
npm install archiver @google-cloud/storage
gsutil iam ch serviceAccount:YOUR_FUNCTION_SERVICE_ACCOUNT:objectAdmin gs://yago-vibe-exports
```

### 문제 2: 토큰 검증 실패

**원인**: 토큰 검증 로직 오류

**해결**:
- OAuth/JWT 서명 검증 구현
- Firestore에 토큰 저장 후 확인

### 문제 3: 보존기간 파기 실패

**원인**: Firestore Rules 또는 배치 크기 제한

**해결**:
- Firestore Rules 확인
- 배치 크기 제한 (500개씩 처리)

## 📚 다음 단계

- Step 64: PDF 형식 지원
- Step 65: 자동 승인 워크플로우
- Step 66: 실시간 모니터링

