# 🧠 Voice Agent 아키텍처

**Always-listening, Tool-using, Voice Agent MVP**

---

## 📊 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                    모바일 앱 (Expo)                      │
├─────────────────────────────────────────────────────────┤
│  🎧 Wake Word Detector (Always-On)                      │
│       ↓ (Wake 감지)                                      │
│  🎙 Whisper STT Streaming (Chunk 기반)                  │
│       ↓ (침묵 감지 1.8초)                                │
│  🧠 Agent (단일 LLM 호출)                                │
│       ↓ (Action 결정)                                    │
│  🚀 Executor (Switch-case 실행)                          │
│       ↓                                                  │
│  🗺 Google Maps / 기타 Action                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│              Firebase Functions (서버)                   │
├─────────────────────────────────────────────────────────┤
│  /stt          → Whisper STT                            │
│  /agent        → LLM Agent (Intent + Reference + Select)│
│  /executeIntent → Places 검색 + 후보 선택 + 길안내       │
└─────────────────────────────────────────────────────────┘
```

---

## 🧩 핵심 설계 원칙

### 1. Agent 단일화 (STEP 7)
- ❌ Intent Parser + Reference Resolver + Selector (3번 호출)
- ✅ 단일 Agent (1번 호출)
- **효과**: LLM 호출 1회로 고정, 비용 예측 가능

### 2. 결정론적 실행 (Deterministic Execution)
- LLM은 **결정만** 담당
- 코드는 **실행 보장** 담당
- **효과**: 실패 시 항상 뭔가 실행됨 (Invisible Recovery)

### 3. 컨텍스트 메모리 (STEP 5)
- 최근 3개 Intent + 결과 저장
- 지시어 해석 ("아까", "말고" 등)
- **효과**: 대화형 UX 가능

### 4. 실패 자동 복구 (STEP 6)
- 조건 완화 검색
- NAVIGATE → SEARCH 전환
- Ultimate Fallback
- **효과**: 사용자는 실패를 인식하지 않음

---

## 📁 프로젝트 구조

### 모바일 앱 (`mobileApp/`)

```
mobileApp/
├── src/
│   └── voice/                    # Voice Agent 모듈
│       ├── types.ts              # 타입 정의
│       ├── config.ts             # 설정
│       ├── services/             # 서비스 레이어
│       │   ├── agentService.ts   # Agent 호출
│       │   ├── executeIntentService.ts
│       │   ├── sttService.ts     # STT 호출
│       │   └── mapService.ts     # Google Maps
│       ├── utils/                # 유틸리티
│       │   ├── wakeWordDetector.ts
│       │   └── commandParser.ts  # Fallback 파서
│       └── index.ts              # 모듈 export
│
├── app/
│   └── (tabs)/
│       └── index.tsx             # 메인 화면 (UI 로직)
│
└── hooks/                        # 커스텀 훅 (향후)
    └── useVoiceAgent.ts
```

### Firebase Functions (`functions/src/`)

```
functions/src/
├── stt.ts              # Whisper STT 엔드포인트
├── agent.ts            # Voice Agent (통합)
├── executeIntent.ts    # Intent 실행 (Search → Select → Navigate)
└── index.ts            # Export
```

---

## 🔄 실행 플로우

### Always-On 모드

```
1. IDLE (Wake Word 감지 중)
   ↓ "헤이" 감지
2. WAKE_LISTENING → LISTENING
   ↓ STT Streaming 시작
3. LISTENING (1.5초 chunk)
   ↓ 침묵 1.8초 감지
4. PROCESSING
   ↓ Agent 호출
5. EXECUTE (Action 실행)
   ↓ 완료
6. IDLE (Wake Word 감지 재시작)
```

### 수동 모드

```
1. 버튼 클릭
   ↓
2. LISTENING (STT Streaming)
   ↓ 침묵 감지
3. PROCESSING (Agent)
   ↓
4. EXECUTE
```

---

## 🎯 Agent 출력 스키마

```typescript
{
  action: 'SEARCH' | 'NAVIGATE' | 'REPEAT_LAST' | 'SEARCH_ALTERNATIVE' | 'NONE',
  query: string,
  filters: {
    openNow: boolean,
    parking: boolean,
    sort: 'NEAREST' | 'BEST_RATED' | 'DEFAULT'
  }
}
```

**핵심**: enum 절대 증가 금지 → 새 기능은 파라미터로 확장

---

## 🛡️ 실패 복구 전략

### 1. STT 실패
→ Fallback: 룰 기반 파서

### 2. Agent 실패
→ Fallback: 기본 SEARCH 실행

### 3. 검색 결과 0개
→ 조건 완화 (parking → openNow → sort)

### 4. 후보 선택 실패
→ Deterministic Fallback (평점 기준)

### 5. NAVIGATE 실패
→ SEARCH로 자동 전환

### 6. 완전 막힘
→ Ultimate Fallback (텍스트 그대로 검색)

**결과**: NULL 리턴 없음

---

## 📈 확장성 설계

### 새 Action 추가 (권장 안 함)
- Agent enum에 추가
- Executor switch-case에 케이스 추가

### 새 기능 추가 (권장)
- 기존 action 재사용
- filters / query 파라미터 확장

---

## 💰 비용 구조

**평균 명령 1회**:
- STT: Whisper API (서버)
- Agent: GPT-4o-mini 1회
- Places: Google Places API 1회

**총**: ~$0.01/명령 (예상)

---

## 🎯 다음 단계

### Phase 2: 프로덕션 안정화
- [ ] Reconnect 처리
- [ ] Timeout 관리
- [ ] 로깅 시스템
- [ ] 에러 모니터링

### Phase 3: UX 마무리
- [ ] 사운드 큐
- [ ] 실행 딜레이
- [ ] 자막 fade-out

### Phase 4: 확장
- [ ] 운전 모드 / 도보 모드
- [ ] 컨텍스트 메모리 진화
- [ ] 커스텀 Wake Word

---

**이 구조는 프로덕션 수준입니다.**
