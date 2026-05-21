# 🧠 Voice Agent MVP (Production-Ready)

**팀 헌법 + 운영 규칙**

---

## 🎯 목표

**Hands-free voice agent:**
Wake → STT → Silence end → Agent decides → Maps executes.

**No "stop recording", no buttons.**

---

## 🏗️ 아키텍처

### Mobile
- **listens** + **streams STT** + **detects silence** + **executes instruction**

### Server
- **single Agent call (LLM)** + **deterministic recovery** + **returns instruction**

### Shared
- **enums/types** (optional, recommended)

---

## 📋 Non-Negotiables (팀 헌법)

### 1. LLM decides, code executes.
- ❌ 모바일에서 LLM 판단 금지
- ✅ 서버에서 LLM 1회만 호출
- ✅ 모바일은 **결과대로 실행만**

### 2. LLM calls must be <= 1 per user command.
- ❌ 여러 번 LLM 호출 금지
- ✅ Agent 1회로 모든 결정
- ✅ 비용 예측 가능

### 3. Every command must produce an action (never return null).
- ❌ NULL 리턴 금지
- ✅ 항상 뭔가 실행됨
- ✅ 실패해도 검색 열기

### 4. State count on client <= 4.
- **IDLE** → 대기 중
- **LISTENING** → STT Streaming 중
- **PROCESSING** → 서버 처리 중
- **EXECUTING** → 실행 중

### 5. Failures are silent.
- ❌ 에러 메시지 사용자에게 노출 금지
- ✅ 조용히 Fallback 실행
- ✅ Fallback = Maps search with raw text

---

## 🔄 Mobile Flow

```
1) Wake Word 감지
   ↓
2) Whisper Streaming 시작
   ↓
3) Silence 1.8s → finalize
   ↓
4) POST /v1/voice/step { finalText, memorySummary }
   ↓
5) Execute instruction:
   - OPEN_NAVIGATE → Google Maps 길찾기
   - OPEN_SEARCH → Google Maps 검색
   - NOOP → 아무것도 안 함
   ↓
6) Save memory (최근 1~3개)
```

---

## 🔄 Server Flow

```
1) runAgent(finalText, memory)
   ↓
2) deterministic recovery:
   - REPEAT_LAST → 메모리에서 목적지 찾기
   - SEARCH_ALTERNATIVE → 다시 검색
   - NAVIGATE → Places 검색 + 선택 (옵션)
   - SEARCH → 필터 조합 + 검색
   - NONE → 기본 검색
   ↓
3) return instruction
```

---

## 📊 Server Instruction

```typescript
type ServerInstruction =
  | { kind: 'OPEN_SEARCH'; query: string }
  | { kind: 'OPEN_NAVIGATE'; destination: string }
  | { kind: 'NOOP' };
```

**핵심**: 모바일은 이 3가지만 처리

---

## 🐛 Debug Logs

서버는 항상 `debug` 정보를 반환:

```typescript
{
  instruction: ServerInstruction;
  debug?: {
    finalText: string;
    action: string;
    fallback?: string;
    latencyMs?: number;
  };
}
```

**사용 목적**:
- QA/테스트
- 성능 모니터링
- 에러 추적

---

## 🔧 Extension Points

### 1. Places Integration (서버만 수정)

**현재**: 쿼리 문자열 그대로 네비게이션

**확장**: Places 검색 → 후보 5개 → 최적 1개 선택 → NAVIGATE

```typescript
// voiceStep.ts에서만 수정
if (agent.action === 'NAVIGATE') {
  const result = await executeAgentAction({
    action: 'SEARCH',
    query: agent.query,
    filters: agent.filters,
    userText: finalText,
    autoNavigate: true,
  });

  if (result.action === 'NAVIGATE' && result.destination) {
    instruction = { kind: 'OPEN_NAVIGATE', destination: result.destination };
  }
}
```

### 2. Memory Evolution

**현재**: 최근 1~3개 리스트 (세션 단위)

**확장**: Thread-based conversation steps

### 3. Modes (운전/도보)

**현재**: 단일 모드

**확장**: 운전 모드 (NAVIGATE 우선), 도보 모드 (SEARCH 우선)

**구현**: Agent 프롬프트에 mode 추가

---

## 🧪 테스트 시나리오

### 시나리오 1: 기본 검색
```
입력: "강남역 카페 찾아줘"
→ SEARCH
→ OPEN_SEARCH
```

### 시나리오 2: 자동 길안내
```
입력: "강남역 카페 안내해줘"
→ NAVIGATE
→ Places 검색 → 선택
→ OPEN_NAVIGATE
```

### 시나리오 3: 지시어 해석
```
입력 1: "강남역 카페 찾아줘"
입력 2: "아까 그 데 다시"
→ REPEAT_LAST
→ 메모리에서 목적지 찾기
→ OPEN_NAVIGATE
```

### 시나리오 4: 실패 복구
```
입력: "존재하지 않는 곳"
→ SEARCH → 검색 결과 0개
→ 조건 완화 재검색
→ OPEN_SEARCH (최소한 검색 화면은 열림)
```

---

## 📁 핵심 파일

### Mobile
- `src/voice/hooks/useVoiceAgent.ts` - **앱의 심장**
- `src/voice/audio/*` - 음성 계층
- `src/voice/executor/*` - 실행 계층
- `src/voice/memory/*` - 컨텍스트 메모리

### Server
- `functions/src/voiceStep.ts` - **통합 엔드포인트**
- `functions/src/agent/*` - Agent 레이어
- `functions/src/executor/*` - 서버 결정 흐름
- `functions/src/recovery/*` - 실패 복구

---

## 🚨 주의사항

### Agent enum 절대 증가 금지
- 새 기능 = enum 재사용 + 파라미터만 추가
- enum 증가 = 복잡도 증가

### Fallback 체인 유지
- 모든 경로에서 실행 보장
- NULL 리턴 금지

### 상태 머신 4개 고정
- 새 상태 추가 금지
- 상태 전이 외 로직 금지

---

## 📈 성능 지표

### 비용
- **평균 명령 1회**: ~$0.01
  - STT: Whisper (서버)
  - Agent: GPT-4o-mini 1회
  - Places: Google Places 1회 (옵션)

### 응답 시간
- **STT**: < 1초 (chunk 처리)
- **Agent**: < 2.5초
- **전체**: < 5초

---

## ✅ 프로덕션 체크리스트

- [ ] 네트워크 reconnect 처리
- [ ] Timeout 관리 (Agent 2.5초)
- [ ] 로깅 시스템 (finalText, action, fallback)
- [ ] 에러 추적 (Sentry 등)
- [ ] 메트릭 수집 (성공률, 응답 시간)

---

## 📚 참고 문서

- [프로덕션 구조](./docs/PRODUCTION_STRUCTURE.md)
- [아키텍처](./docs/VOICE_AGENT_ARCHITECTURE.md)
- [개발 가이드](./docs/TEAM_DEVELOPMENT_GUIDE.md)

---

**이 구조는 프로덕션 수준입니다.**

**팀에 넘겨도 바로 개발 가능합니다.**

---

## 🧠 천재 모드 핵심 교훈

1. **LLM이 중앙에 있지만 지배하지 않음**
   - 결정만, 실행은 코드가

2. **모든 실패 경로가 이미 설계됨**
   - Fallback 체인 완전성

3. **기능 추가 = enum or filter 추가**
   - 구조 변경 최소화

4. **UX는 코드보다 타이밍과 침묵**
   - 300ms 딜레이, 1.8초 침묵 감지

---

**이건 우연이 아니다.**
