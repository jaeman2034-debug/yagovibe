# 🧠 Voice Agent 모듈

**Always-listening, Tool-using, Voice Agent MVP**

---

## 🚀 빠른 시작

```typescript
import { useVoiceAgent } from '@/voice/hooks';

function MyScreen() {
  const { startStreaming, liveText, isStreaming } = useVoiceAgent();

  return (
    <View>
      <Text>{liveText}</Text>
      <Button onPress={startStreaming}>시작</Button>
    </View>
  );
}
```

---

## 📦 모듈 구조

```
src/voice/
├── types.ts           # 타입 정의
├── config.ts          # 설정
├── services/          # 서비스 레이어
├── utils/             # 유틸리티
├── hooks/             # 커스텀 훅
└── index.ts           # Export
```

---

## 🧩 주요 컴포넌트

### Services
- `agentService`: Agent 호출
- `executeIntentService`: Intent 실행
- `sttService`: STT 호출
- `mapService`: Google Maps

### Hooks
- `useVoiceAgent`: Voice Agent 상태/로직
- `useWakeWord`: Wake Word 감지

### Utils
- `wakeWordDetector`: Wake Word 감지
- `commandParser`: Fallback 파서

---

## 📚 문서

- [아키텍처 문서](../../docs/VOICE_AGENT_ARCHITECTURE.md)
- [구조 문서](../../docs/VOICE_AGENT_STRUCTURE.md)
- [개발 가이드](../../docs/TEAM_DEVELOPMENT_GUIDE.md)

---

**프로덕션 수준 모듈**
