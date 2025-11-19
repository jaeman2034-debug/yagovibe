# Step 53: Copilot 멀티턴 메모리 + 권한 확인 대화(Approvals)

Ops Copilot(음성/텍스트)이 대화 맥락을 기억하고, 위험/파괴적 명령은 확인 대화와 권한 검증을 거쳐 실행하도록 안전장치를 추가합니다.

## 📋 목표

1. 멀티턴 메모리: 대화 맥락(팀, 기간, 마지막 의도) 유지
2. 승인 플로우: 위험/파괴적 명령에 대한 확인 대화
3. 권한 검증: 역할 기반 접근 제어 (Step 43 연동)
4. 안전 가드: 쿨다운, 만료, 감사 로그

## 🗄️ 데이터 모델

### opsSessions/{sessionId}

```typescript
{
  user: { uid: string, email?: string, role?: string },
  context: {
    teamId?: string,
    window: '7d',
    lastIntent?: string,
    lastParams?: any,
    updatedAt: Timestamp
  },
  pending: {
    intent: string,
    params: { teamId?: string },
    createdAt: Timestamp,
    nonce: string,
    expiresAt: Timestamp,
    risk: 'low' | 'med' | 'high'
  },
  createdAt: Timestamp
}
```

### opsSessions/{sessionId}/logs/{ts}

```typescript
{
  when: Timestamp,
  role: 'user' | 'assistant' | 'system',
  text: string,
  meta?: {
    intent?: string,
    pending?: boolean,
    nonce?: string,
    approved?: boolean,
    rejected?: boolean,
    cooldown?: boolean
  }
}
```

### teams/{teamId}/auditLogs/{ts}

```typescript
{
  createdAt: Timestamp,
  type: 'approval_approved' | 'approval_rejected',
  intent: string,
  userId?: string,
  nonce?: string,
  reason?: string
}
```

## 🚀 구현 사항

### 1. Backend - opsRouterV2

**파일**: `functions/src/step53.opsRouterV2.ts`

- **엔드포인트**: `POST /opsRouterV2`
- **기능**:
  - 세션 로드/생성
  - Intent 추출 (Step 52 INTENTS 재사용)
  - 멀티턴 컨텍스트 업데이트
  - 위험도 평가 및 승인 토큰 발급
  - 쿨다운 체크

- **위험 Intent 목록**:
  - `retuning`: 재튜닝
  - `deploy_model`: 모델 배포
  - `bulk_alert`: 대량 알림
  - `model_reload`: 모델 재로드

- **응답 형식**:
  ```typescript
  // 승인 필요
  { needConfirm: true, nonce: string, message: string, intent: string, risk: 'med' | 'high' }
  
  // 즉시 처리
  { message: string, intent: string }
  
  // 쿨다운 차단
  { blocked: true, message: string }
  ```

### 2. Backend - opsConfirm

**파일**: `functions/src/step53.opsConfirm.ts`

- **엔드포인트**: `POST /opsConfirm`
- **기능**:
  - Nonce 검증
  - 만료 확인
  - 역할 기반 권한 검증
  - 승인/거부 처리
  - 실제 액션 실행
  - 감사 로그 기록

- **권한 체계**:
  - 고위험 작업 (`deploy_model`, `bulk_alert`): `owner`, `admin`만 가능
  - 중위험 작업 (`retuning`, `model_reload`): `owner`, `coach`, `editor`, `admin` 가능

- **응답 형식**:
  ```typescript
  { ok: true, message: string }
  { error: string, role?: string, required?: string }
  ```

### 3. Frontend - OpsCopilot 확장

**파일**: `src/components/OpsCopilot.tsx`

- **추가 기능**:
  - 세션 ID 생성 및 유지 (`crypto.randomUUID()`)
  - 승인 확인 UI (ConfirmBar)
  - 승인/거부 버튼
  - 위험도 표시 (고위험/중위험)

- **변경 사항**:
  - `opsRouter` → `opsRouterV2` 사용
  - `sessionId`, `uid` 파라미터 추가
  - 승인 상태 관리

## 🛡️ 안전 가드

### 1. 쿨다운

- 동일 `intent + teamId` 승인 후 5분 내 재시도 차단
- 세션 레벨에서 최근 승인 로그 확인
- 쿨다운 중 메시지: "쿨다운 중입니다. X분 후 재시도 가능합니다."

### 2. 역할 필터

- 고위험 작업: `owner`, `admin`만 가능
- 중위험 작업: `owner`, `coach`, `editor`, `admin` 가능
- 권한 부족 시 거부 메시지 표시

### 3. 감사 로그

- 모든 승인/거부/실행을 `teams/{teamId}/auditLogs`에 기록
- 세션 로그는 `opsSessions/{sessionId}/logs`에 기록
- `nonce`, `userId`, `intent` 포함

### 4. 만료/무효화

- 승인 토큰(`nonce`) 만료 시간: 10분
- 만료 시 자동 취소
- `expiresAt` 초과 시 거부 응답

## 📊 사용 시나리오

### 시나리오 1: 안전한 명령 (즉시 처리)

1. 사용자: "팀 요약 알려줘"
2. 시스템: 즉시 처리, 응답 재생
3. 세션 컨텍스트에 `teamId` 저장 (다음 명령에서 참조)

### 시나리오 2: 위험한 명령 (승인 필요)

1. 사용자: "재튜닝 실행해"
2. 시스템: 승인 확인 UI 표시
3. 사용자: "확인" 클릭
4. 시스템: 권한 검증 → 실행 → 감사 로그 기록

### 시나리오 3: 멀티턴 대화

1. 사용자: "소흘FC 요약"
2. 시스템: `teamId = "소흘FC"` 저장
3. 사용자: "그 팀 재튜닝" (팀명 생략)
4. 시스템: 컨텍스트에서 `teamId` 참조하여 처리

### 시나리오 4: 쿨다운 차단

1. 사용자: "재튜닝 실행" → 승인 → 실행
2. 3분 후: "재튜닝 실행" (재시도)
3. 시스템: "쿨다운 중입니다. 2분 후 재시도 가능합니다."

## 🔧 배포 절차

### 1. Functions 배포

```bash
firebase deploy --only functions:opsRouterV2,functions:opsConfirm
```

### 2. Firestore 인덱스 생성 (선택사항)

```bash
# opsSessions/{sessionId}/logs 컬렉션 쿼리 최적화
# Firebase Console에서 수동 생성 또는 firestore.indexes.json에 추가
```

### 3. 환경 변수 설정

```bash
firebase functions:config:set \
  functions.origin="https://asia-northeast3-yago-vibe-spt.cloudfunctions.net"
```

### 4. 프론트엔드 빌드

```bash
npm run build
firebase deploy --only hosting
```

## 🧪 테스트 체크리스트

### 기능 테스트

- [ ] 세션 생성 및 유지
- [ ] 멀티턴 컨텍스트 저장 (teamId, lastIntent)
- [ ] 위험 Intent 감지 및 승인 요청
- [ ] 승인/거부 처리
- [ ] 권한 검증 (고위험/중위험 작업)
- [ ] 쿨다운 체크
- [ ] 만료 토큰 처리
- [ ] 감사 로그 기록

### 통합 테스트

- [ ] "팀 요약" → 즉시 처리
- [ ] "재튜닝 실행" → 승인 요청 → 확인 → 실행
- [ ] "재튜닝 실행" → 승인 요청 → 거부 → 취소
- [ ] "재튜닝 실행" → 승인 → 3분 후 재시도 → 쿨다운 차단
- [ ] "소흘FC 요약" → "그 팀 재튜닝" → 멀티턴 컨텍스트 참조

### 권한 테스트

- [ ] owner/admin: 고위험 작업 승인 가능
- [ ] coach/editor: 중위험 작업만 승인 가능
- [ ] viewer: 모든 작업 거부

## 🐛 문제 해결

### 문제 1: 세션이 생성되지 않음

**원인**: `sessionId`가 전달되지 않음

**해결**: 
- 프론트엔드에서 `crypto.randomUUID()`로 세션 ID 생성
- 모든 요청에 `sessionId` 포함

### 문제 2: 승인 토큰이 만료됨

**원인**: 10분 이내 승인하지 않음

**해결**: 
- 만료 시간 연장 (선택사항)
- 사용자에게 명확한 만료 시간 안내

### 문제 3: 권한 검증 실패

**원인**: 역할 정보가 Firestore에 없음

**해결**: 
- Step 43의 역할 시스템 확인
- `teams/{teamId}/roles/{uid}` 또는 `teams/{teamId}/members/{uid}` 확인

## 📚 다음 단계

- Step 54: Copilot 테스트 하니스 + 시나리오 회귀 테스트
- Step 55: Slack Slash Command 통합
- Step 56: OpenAI NLU 업그레이드

