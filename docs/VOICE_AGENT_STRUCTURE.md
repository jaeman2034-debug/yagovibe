# 🏗️ Voice Agent 프로덕션 구조

**프로덕션 수준 모듈화 구조**

---

## 📂 전체 구조도

```
yago-vibe-spt/
├── mobileApp/
│   ├── src/
│   │   └── voice/                      # Voice Agent 모듈
│   │       ├── types.ts                # 타입 정의
│   │       ├── config.ts               # 설정값
│   │       ├── index.ts                # 모듈 export
│   │       │
│   │       ├── services/               # 서비스 레이어
│   │       │   ├── agentService.ts     # Agent 호출
│   │       │   ├── executeIntentService.ts
│   │       │   ├── sttService.ts       # STT 호출
│   │       │   └── mapService.ts       # Google Maps
│   │       │
│   │       ├── utils/                  # 유틸리티
│   │       │   ├── wakeWordDetector.ts
│   │       │   └── commandParser.ts    # Fallback 파서
│   │       │
│   │       └── hooks/                  # 커스텀 훅
│   │           ├── useVoiceAgent.ts    # Voice Agent 상태/로직
│   │           ├── useWakeWord.ts      # Wake Word 감지
│   │           └── index.ts
│   │
│   └── app/
│       └── (tabs)/
│           └── index.tsx               # UI (서비스 레이어 사용)
│
├── functions/src/
│   ├── stt.ts                          # Whisper STT
│   ├── agent.ts                        # Voice Agent
│   ├── executeIntent.ts                # Intent 실행
│   └── index.ts                        # Export
│
└── docs/
    ├── VOICE_AGENT_ARCHITECTURE.md     # 아키텍처 문서
    ├── TEAM_DEVELOPMENT_GUIDE.md       # 개발 가이드
    ├── PRODUCTION_CHECKLIST.md         # 프로덕션 체크리스트
    └── VOICE_AGENT_STRUCTURE.md        # 이 파일
```

---

## 🔗 의존성 흐름

```
index.tsx (UI)
    ↓
useVoiceAgent (Hook)
    ↓
agentService / executeIntentService / sttService / mapService
    ↓
Firebase Functions (서버)
```

**원칙**: UI → Hook → Service → Server

---

## 📦 모듈별 책임

### `types.ts`
- 모든 타입 정의
- 프로젝트 전체에서 공유

### `config.ts`
- 설정값 중앙 관리
- 환경별 분기 가능

### `services/`
- **순수 함수**로 작성
- 사이드 이펙트 최소화
- 테스트 용이

### `utils/`
- 헬퍼 함수
- 순수 함수

### `hooks/`
- React 상태 관리
- 로직 캡슐화
- UI와 분리

---

## 🚀 사용 예시

### 기본 사용

```typescript
import { useVoiceAgent } from '@/voice/hooks';

function VoiceScreen() {
  const {
    wakeState,
    isStreaming,
    liveText,
    startStreaming,
    stopStreaming,
  } = useVoiceAgent();

  return (
    <View>
      <Text>{liveText}</Text>
      <Button onPress={startStreaming}>시작</Button>
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
    setIsAlwaysOn,
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
      <Switch
        value={isAlwaysOn}
        onValueChange={setIsAlwaysOn}
      />
    </View>
  );
}
```

---

## 🎯 확장 가이드

### 새 서비스 추가

1. `services/`에 새 파일 생성
2. 순수 함수로 작성
3. `index.ts`에서 export

### 새 훅 추가

1. `hooks/`에 새 파일 생성
2. React 패턴 준수
3. `index.ts`에서 export

### 새 타입 추가

1. `types.ts`에 추가
2. 전체 프로젝트에서 사용 가능

---

## ✅ 검증 기준

### 모듈화
- [ ] 타입 정의 분리 완료
- [ ] 서비스 레이어 분리 완료
- [ ] 훅 분리 완료
- [ ] UI와 로직 분리 완료

### 재사용성
- [ ] 다른 컴포넌트에서 사용 가능
- [ ] 테스트 용이
- [ ] 문서화 완료

---

**이 구조는 프로덕션 수준입니다.**
