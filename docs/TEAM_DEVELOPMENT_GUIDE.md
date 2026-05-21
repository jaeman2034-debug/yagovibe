# 👥 팀 개발 가이드

**Voice Agent 개발을 위한 실전 가이드**

---

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# 모바일 앱
cd mobileApp
npm install
npm start

# Firebase Functions
cd functions
npm install
firebase deploy --only functions
```

### 2. 필수 환경 변수

#### 모바일 앱
없음 (하드코딩된 엔드포인트 사용)

#### Firebase Functions
- `OPENAI_API_KEY`: OpenAI API 키
- `GMAPS_API_KEY`: Google Maps API 키 (Optional, Places 검색용)

---

## 📁 프로젝트 구조

### 모바일 앱

```
mobileApp/
├── src/
│   └── voice/              # Voice Agent 모듈
│       ├── types.ts        # 타입 정의
│       ├── config.ts       # 설정값
│       ├── services/       # 서비스 레이어
│       ├── utils/          # 유틸리티
│       └── hooks/          # 커스텀 훅
│
└── app/
    └── (tabs)/
        └── index.tsx       # 메인 화면
```

### Firebase Functions

```
functions/src/
├── stt.ts              # Whisper STT
├── agent.ts            # Voice Agent
├── executeIntent.ts    # Intent 실행
└── index.ts            # Export
```

---

## 🧠 핵심 개념

### 1. Agent 패턴
- **단일 LLM 호출**: Intent + Reference + Select를 한 번에 처리
- **결정론적 실행**: LLM은 결정만, 코드는 실행만

### 2. 메모리 시스템
- 최근 3개 Intent + 결과 저장
- 지시어 해석 ("아까", "말고" 등)

### 3. 실패 복구
- 단계별 Fallback 체인
- 항상 뭔가 실행됨 (NULL 리턴 없음)

---

## 🔧 개발 워크플로우

### 새 기능 추가

#### 1. Action 추가 (권장 안 함)
```typescript
// agent.ts: enum에 추가
enum: ["SEARCH", "NAVIGATE", "REPEAT_LAST", "SEARCH_ALTERNATIVE", "NEW_ACTION"]

// index.tsx: switch-case에 추가
case 'NEW_ACTION':
  // 실행 로직
  break;
```

#### 2. 파라미터 확장 (권장)
```typescript
// types.ts: filters 확장
filters: {
  openNow: boolean;
  parking: boolean;
  sort: 'NEAREST' | 'BEST_RATED' | 'DEFAULT';
  newParam?: string; // 새 파라미터 추가
}

// Agent 프롬프트 업데이트
// 자동으로 인식됨
```

### 디버깅

#### 로그 확인
```typescript
console.log('✅ Agent 결정:', agentResult);
console.log('🗺 실행:', result);
```

#### 상태 추적
```typescript
// useVoiceAgent hook 사용
const { wakeState, isStreaming, liveText } = useVoiceAgent({
  onStateChange: (state) => {
    console.log('State:', state);
  }
});
```

---

## 🐛 트러블슈팅

### STT 실패
- **증상**: 텍스트가 안 나옴
- **원인**: 네트워크, 마이크 권한
- **해결**: Fallback으로 자동 처리됨

### Agent 실패
- **증상**: "NONE" 반환
- **원인**: 프롬프트 불명확
- **해결**: 기본 검색으로 Fallback

### Wake Word 안 감지
- **증상**: Always-On 모드에서 반응 안 함
- **원인**: 키워드 매칭 실패
- **해결**: `wakeKeywords` 배열 확인

---

## 📊 성능 최적화

### 비용 관리
- LLM 호출 1회로 고정 (Agent 단일화)
- STT는 Whisper (서버 비용)
- Places API는 선택적

### 배터리 최적화
- Wake Word: 3초 간격 (초저전력)
- STT Streaming: 1.5초 간격
- Always-On OFF 시 모든 루프 중지

---

## 🧪 테스트

### 수동 테스트

#### Always-On 모드
1. Always-On ON
2. "헤이" 또는 "야고" 말하기
3. 명령 말하기
4. 자동 실행 확인

#### 수동 모드
1. "실시간 STT 시작" 클릭
2. 명령 말하기
3. 자동 실행 확인

### 시나리오 테스트

#### 시나리오 1: 기본 검색
- 입력: "강남역 카페 찾아줘"
- 예상: Google Maps 검색

#### 시나리오 2: 자동 길안내
- 입력: "강남역 카페 안내해줘"
- 예상: Places 검색 → 선택 → 길안내

#### 시나리오 3: 지시어 해석
- 입력 1: "강남역 카페 찾아줘"
- 입력 2: "아까 그 데 다시"
- 예상: 이전 결과 재안내

---

## 📝 코드 컨벤션

### 타입 정의
- `types.ts`에 모두 정의
- `interface` 사용 (type alias 지양)

### 서비스 레이어
- 순수 함수로 작성
- 사이드 이펙트 최소화

### 훅
- 커스텀 훅으로 로직 캡슐화
- UI와 분리

---

## 🚨 주의사항

### Agent enum 절대 증가 금지
- 새 기능은 파라미터로 확장
- enum 증가 = 복잡도 증가

### Fallback 체인 유지
- 모든 경로에서 실행 보장
- NULL 리턴 금지

### 메모리 관리
- 최대 3개만 유지
- 세션 단위 (앱 재시작 시 초기화)

---

## 📚 참고 문서

- [Voice Agent 아키텍처](./VOICE_AGENT_ARCHITECTURE.md)
- [프로젝트 구조](../ARCHITECTURE_SUMMARY.md)

---

**이 가이드로 누구든 Voice Agent 개발 가능합니다.**
