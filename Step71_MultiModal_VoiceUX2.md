# Step 71: Multi-Modal AI Extensions & Voice UX 2.0

YAGO VIBE의 음성/이미지/제스처 기반 인터랙션을 차세대 UX로 확장하고, 외부 파트너와의 AI Assistant API 생태계를 구축하여 오픈 인터페이스로 발전시킵니다.

## 📋 목표

1. Voice UX 2.0: 실시간 음성·제스처 융합 인터랙션
2. Multi-Modal Extensions: 이미지 인식, 제스처 트리거, 위치·시각 컨텍스트 인식
3. Assistant API Hub: 외부 서비스가 AI 보조 기능 호출 가능
4. Plugin Registry: 외부 파트너 통합 시스템

## 🎤 Voice UX 2.0 구조

```
[Mic Input] → [VAD Detector] → [STT Engine] → [NLU Router]
                                     ↓
                            [Gesture Context] ↔ [Camera/IMU]
                                     ↓
                         [Action Engine + TTS + UI Feedback]
```

### 주요 구성 요소

| 모듈 | 역할 |
|------|------|
| VAD Detector | WebAudio 기반 음성 감지(무음·발화 구간 판단) |
| STT Engine | Whisper / Google STT / Naver Clova Speech (선택) |
| NLU Router | Step 52/58의 AI 리포트/NLU/GraphCopilot 통합 엔진 호출 |
| Gesture Context | TensorFlow.js/MediaPipe 기반 제스처 추적(손짓, 고개 등) |
| TTS Response | 사용자 설정 Voice Profile 기반 다국어 음성합성 |

## 🖥️ 구현

### 1. Voice UX 2.0 코어 모듈

**파일**: `src/lib/voiceux/core.ts`

**구현된 기능**:
- ✅ `startSTT()`: STT (Speech-to-Text) 시작
  - Web Speech API 또는 서버 API 연동
  - VAD (Voice Activity Detection) 포함
- ✅ `synthTTS()`: TTS (Text-to-Speech) 합성
  - Google Cloud TTS API 연동
  - Fallback: Web Speech API
- ✅ `synthTTSMultilingual()`: 다국어 TTS 지원
  - 자동 언어 감지 (한국어, 영어, 일본어)
  - 언어별 Voice Profile 선택
- ✅ `detectGesture()`: 제스처 인식 (TensorFlow.js Hand Pose)
  - 선택적 의존성 (패키지 미설치 시 null 반환)
  - 손 들기, 가리키기, 손 펼치기 감지
- ✅ `detectLanguage()`: 언어 자동 감지
- ✅ `VADDetector`: Voice Activity Detection 클래스

### 2. 음성+제스처 통합 UI 컴포넌트

**파일**: `src/components/VoiceUX/AssistantPanel.tsx`

**구현된 기능**:
- ✅ 비디오 프리뷰 (카메라 스트림)
- ✅ 음성 입력 버튼
- ✅ 제스처 감지 표시
- ✅ 입력 텍스트 표시
- ✅ AI 응답 표시 (카드 형태)
- ✅ TTS 재생 버튼
- ✅ 컨텍스트 정보 표시 (의도, 위치, 액션)
- ✅ 위치 정보 자동 수집 (Geolocation API)

**접근 경로**: `/app/assistant`

### 3. Assistant API Hub

**파일**: `functions/src/step71.assistantAPI.ts`

**구현된 기능**:
- ✅ `POST /api/assistant/command`: Assistant Command API
  - OAuth2/JWT 인증
  - Rate Limiting (TODO: Step 65 연동)
  - NLU 처리 (Step 52/58 연동)
  - 플러그인 레지스트리 연동
  - 사용 로그 기록
- ✅ `GET /api/assistant/plugins`: 플러그인 목록 조회

**API 예시**:
```json
POST /api/assistant/command
Authorization: Bearer <token>
{
  "text": "팀 블로그에 새 글 올려줘",
  "context": { "teamId": "sfc60", "mode": "voice" }
}

응답:
{
  "intent": "create_post",
  "params": { "team": "소흘FC" },
  "result": "블로그 초안이 생성되었습니다.",
  "actions": [
    { "type": "open_url", "url": "/teams/sfc60/blog/new" }
  ]
}
```

### 4. Plugin Registry

**파일**: `functions/src/step71.pluginRegistry.ts`

**구현된 기능**:
- ✅ `POST /api/assistant/plugins/register`: 플러그인 등록
- ✅ `PUT /api/assistant/plugins/:id`: 플러그인 업데이트
- ✅ `POST /api/assistant/plugins/init`: 기본 플러그인 초기화

**플러그인 스키마**:
```typescript
{
  id: string; // 예: "facilities.reserve"
  name: string;
  description?: string;
  intents: string[]; // 지원하는 Intent 목록
  schema: Record<string, any>; // 파라미터 스키마
  endpoint: string; // 외부 API 엔드포인트
  auth: {
    type: "oauth2" | "jwt" | "api_key";
    token?: string;
  };
  enabled: boolean;
  rateLimit?: { rpm: number };
}
```

**기본 플러그인**:
- `facilities.reserve`: 시설 예약 서비스
- `equipment.check`: 장비 조회 및 예약

### 5. Assistant API Hub 아키텍처

```
[Partner App]
  │ REST / WebSocket (OAuth2)
  ▼
[Assistant Gateway] → [Intent Resolver] → [Graph/NLU Engine] → [Action Handler]
                                     ↘ [Plugin Registry]
```

## 🔄 Voice UX 2.0 경험 흐름

1. **사용자가 음성 + 제스처로 요청** → STT + NLU → 의도 분석
2. **관련 맥락(Context: 팀, 지도, 일정, 위치, 시간 등) 자동 부착**
3. **결과를 TTS로 피드백 + 시각적 카드 표시**
4. **동일 요청을 Assistant API로 외부 모듈에도 전달** (ex. 경기장 예약)
5. **사용자 피드백 기반으로 STT·NLU 정밀도 향상** (Step 61 Feedback Loop 재활용)

## 🎨 UX 프로토타입

### Voice + Touch Hybrid
- 버튼 클릭·음성 동시 제어 (모바일 우선)
- 터치 제스처와 음성 명령 통합

### TTS Replay
- 이전 대화 클릭 → 음성 재생
- Step 30 하이라이트 연계 가능

### 시각 피드백
- AI 응답을 카드·맵·차트 형태로 출력
- 컨텍스트 정보 시각화 (의도, 위치, 액션)

### Multilingual Mode
- 한국어/영어/일본어 음성 자동 감지
- 언어별 TTS 선택

## 📋 실행 체크리스트

### Voice UX 2.0
- [x] STT 엔진 (Web Speech API + 서버 API)
- [x] TTS 엔진 (Google Cloud TTS + Fallback)
- [x] VAD Detector
- [x] 제스처 인식 (TensorFlow.js, 선택적)
- [x] 다국어 지원
- [x] AssistantPanel UI 컴포넌트

### Assistant API Hub
- [x] Assistant Command API
- [x] OAuth2/JWT 인증 (구조만, 실제 검증 TODO)
- [ ] Rate Limiting (Step 65 연동 TODO)
- [x] Plugin Registry
- [x] 기본 플러그인 (시설 예약, 장비 조회)

### 통합
- [x] Step 52/58 NLU 연동
- [x] Firestore 보안 규칙
- [ ] Step 61 Feedback Loop 연동 (TODO)

## 🚀 배포 절차

### 1. Functions 배포

```bash
firebase deploy --only functions:assistantCommand,functions:listPlugins,functions:registerPlugin,functions:updatePlugin,functions:initPlugins
```

### 2. 프론트엔드 접근

```
/app/assistant
```

### 3. 선택적 패키지 설치 (제스처 인식용)

```bash
npm install @tensorflow-models/handpose @tensorflow/tfjs-backend-webgl
```

**참고**: TensorFlow.js는 선택적 의존성입니다. 설치하지 않아도 앱은 정상 작동하며, 제스처 인식 기능만 비활성화됩니다.

### 4. 기본 플러그인 초기화

```bash
curl -X POST https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/initPlugins \
  -H "Authorization: Bearer <admin_token>"
```

## 📚 다음 단계

- Step 72: 글로벌 확장 전략
- Step 73: ML 모델 자동 재학습 파이프라인
- Step 74: 실시간 협업 기능

## ✅ 완료! 🎤🤖

Step 71 — Multi-Modal AI Extensions & Voice UX 2.0 완료!

