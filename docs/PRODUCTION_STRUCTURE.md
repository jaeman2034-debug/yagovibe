# 🏗️ Voice Agent 프로덕션 구조

**팀에 던져도 바로 개발 가능한 수준**

---

## 📂 전체 폴더 구조

```
yago-vibe-spt/
├─ mobileApp/
│  ├─ src/
│  │  └─ voice/                    # Voice Agent 모듈
│  │     ├─ types.ts               # 타입 정의
│  │     ├─ config.ts              # 설정값
│  │     ├─ index.ts               # 모듈 export
│  │     │
│  │     ├─ audio/                 # 🎙️ 음성 계층
│  │     │  ├─ microphone.ts       # Raw audio stream
│  │     │  ├─ whisperStream.ts    # STT streaming
│  │     │  ├─ silenceDetector.ts # 말 끝 감지
│  │     │  ├─ wakeWord.ts         # Wake Word 감지
│  │     │  └─ index.ts
│  │     │
│  │     ├─ agent/                 # 🧠 Agent 클라이언트
│  │     │  ├─ agentClient.ts      # 서버 Agent 호출
│  │     │  └─ index.ts
│  │     │
│  │     ├─ executor/              # ⚙️ 실행 계층
│  │     │  ├─ executor.ts         # Action 실행
│  │     │  └─ index.ts
│  │     │
│  │     ├─ memory/                # 🧩 컨텍스트 메모리
│  │     │  ├─ recentMemory.ts     # 메모리 관리
│  │     │  └─ index.ts
│  │     │
│  │     ├─ state/                 # 🔁 상태 머신
│  │     │  ├─ voiceState.ts       # 상태 관리
│  │     │  └─ index.ts
│  │     │
│  │     ├─ services/              # 서비스 레이어
│  │     │  ├─ agentService.ts
│  │     │  ├─ executeIntentService.ts
│  │     │  ├─ sttService.ts
│  │     │  └─ mapService.ts
│  │     │
│  │     ├─ utils/                 # 유틸리티
│  │     │  ├─ wakeWordDetector.ts
│  │     │  └─ commandParser.ts
│  │     │
│  │     └─ hooks/                 # 🔌 커스텀 훅
│  │        ├─ useVoiceAgent.ts    # ⭐ 앱의 심장
│  │        ├─ useWakeWord.ts
│  │        └─ index.ts
│  │
│  └─ app/
│     └─ (tabs)/
│        └─ index.tsx              # UI (훅만 사용)
│
└─ functions/src/
   ├─ stt.ts                       # Whisper STT 엔드포인트
   ├─ agent.ts                     # Agent HTTP 엔드포인트
   ├─ executeIntent.ts             # Execute Intent HTTP 엔드포인트
   │
   ├─ agent/                       # 🧠 Agent 레이어
   │  ├─ systemPrompt.ts           # Agent 프롬프트
   │  ├─ agentSchema.ts            # Structured Output 스키마
   │  ├─ runAgent.ts               # Agent 실행
   │  └─ index.ts
   │
   ├─ places/                      # 📍 Places API
   │  ├─ searchPlaces.ts           # Places 검색
   │  └─ index.ts
   │
   ├─ recovery/                    # 🛡️ 실패 복구
   │  ├─ relaxFilters.ts           # 조건 완화
   │  ├─ fallback.ts               # Fallback 전략
   │  └─ index.ts
   │
   ├─ executor/                    # ⚙️ 서버 결정 흐름
   │  ├─ executeAgentAction.ts     # Action 실행
   │  ├─ selectBestPlace.ts        # 후보 선택
   │  └─ index.ts
   │
   └─ index.ts                     # Export
```

---

## 🔗 레이어별 책임 분리

### 📱 모바일 앱

#### audio/ - 음성 계층
- **책임**: 소리 듣기만
- **원칙**: 비즈니스 로직 0, 이벤트만 emit
- **함수**: `onWake()`, `onTextChunk()`, `onSilence()`

#### agent/ - Agent 클라이언트
- **책임**: 서버 호출만
- **원칙**: 모바일에 LLM 없음, 항상 서버에 위임
- **함수**: `runAgent()`

#### executor/ - 실행 계층
- **책임**: 실제 실행만
- **원칙**: 판단 금지, 단순 실행
- **함수**: `execute(action)`

#### memory/ - 컨텍스트 메모리
- **책임**: 최근 컨텍스트 관리
- **원칙**: 최대 3개, 순서 보장
- **함수**: `add()`, `getLast()`, `getAlternative()`

#### state/ - 상태 머신
- **책임**: 상태 전이만
- **원칙**: 상태 4개 고정, 전이 외 로직 금지
- **상태**: `IDLE` → `LISTENING` → `PROCESSING` → `EXECUTING` → `IDLE`

#### hooks/ - 통합 레이어
- **책임**: 모든 레이어 통합
- **원칙**: UI는 이 훅만 호출
- **훅**: `useVoiceAgent()`

---

### 🌐 서버

#### agent/ - 단일 Agent
- **책임**: 결정만 (Intent + Reference + Select)
- **원칙**: Structured Output, enum 고정, temperature=0
- **파일**: `systemPrompt.ts`, `agentSchema.ts`, `runAgent.ts`

#### places/ - Places API
- **책임**: 외부 Places API 통합
- **원칙**: 결과 normalize, 에러 처리
- **파일**: `searchPlaces.ts`

#### recovery/ - 실패 복구
- **책임**: 조건 완화, silent retry
- **원칙**: 항상 뭔가 나옴
- **파일**: `relaxFilters.ts`, `fallback.ts`

#### executor/ - 서버 결정 흐름
- **책임**: Agent Action 실행 흐름
- **원칙**: 실행은 안 함, 결정만
- **파일**: `executeAgentAction.ts`, `selectBestPlace.ts`

---

## 🔄 전체 데이터 흐름

```
Wake Word 감지
  ↓ (onWake)
STT Streaming 시작
  ↓ (onTextChunk)
텍스트 누적
  ↓ (onSilence)
finalText
  ↓
Server Agent 호출
  ↓
Action JSON
  ↓
Server Execute (Search → Select)
  ↓
Instruction
  ↓
Mobile Executor
  ↓
Google Maps 실행
```

**핵심**: LLM은 **딱 1번**, 나머지는 deterministic

---

## 📐 책임 분리 헌법

| 레이어      | 책임      | 원칙           |
| -------- | ------- | ------------ |
| audio    | 소리 듣기   | 비즈니스 로직 0    |
| silence  | 말 끝 판단  | 이벤트만 emit    |
| agent    | 무엇을 할지  | 서버에 위임       |
| executor | 실제 실행   | 판단 금지        |
| memory   | 맥락 유지   | 최대 3개        |
| recovery | 실패 복구   | 항상 뭔가 나옴    |

**이 표가 팀의 헌법**

---

## 🚀 사용 예시

### 기본 사용

```typescript
import { useVoiceAgent } from '@/voice/hooks';

function VoiceScreen() {
  const {
    startStreaming,
    liveText,
    isStreaming,
    toggleAlwaysOn,
    isAlwaysOn,
  } = useVoiceAgent();

  return (
    <View>
      <Text>{liveText}</Text>
      <Button onPress={startStreaming}>시작</Button>
      <Switch value={isAlwaysOn} onValueChange={toggleAlwaysOn} />
    </View>
  );
}
```

### Always-On 모드

```typescript
import { useVoiceAgent, useWakeWord } from '@/voice/hooks';

function VoiceScreen() {
  const {
    isAlwaysOn,
    toggleAlwaysOn,
    wakeState,
    startStreaming,
  } = useVoiceAgent();

  const { startWakeWordDetection } = useWakeWord({
    isAlwaysOn,
    wakeState,
    onWakeDetected: () => {
      startStreaming();
    },
  });

  useEffect(() => {
    if (isAlwaysOn) {
      startWakeWordDetection();
    }
  }, [isAlwaysOn]);

  return (
    <View>
      <Switch value={isAlwaysOn} onValueChange={toggleAlwaysOn} />
      <Text>상태: {wakeState}</Text>
    </View>
  );
}
```

---

## 🎯 핵심 설계 원칙

### 1. 책임 분리
- 각 레이어는 **하나의 책임만**
- 레이어 간 직접 의존 최소화
- 인터페이스로 통신

### 2. 결정론적 실행
- LLM은 **결정만**
- 코드는 **실행 보장**
- 실패해도 항상 뭔가 실행

### 3. 확장성
- 새 기능 = enum or filter 추가
- 레이어 추가 없이 확장 가능
- Agent 프롬프트만 수정

---

**이 구조는 프로덕션 수준입니다.**

**팀에 넘겨도 바로 개발 가능합니다.**
