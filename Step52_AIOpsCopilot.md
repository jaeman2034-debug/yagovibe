# Step 52: AI 운영 Copilot (Voice + Command Center)

음성/텍스트 명령으로 글로벌 관제(모델 재학습, 팀 요약, 이상 브리핑, 재튜닝 등)를 실행하고, TTS로 결과를 바로 안내하는 운영 보조원(Copilot)을 구축합니다.

## 📋 목표

1. 음성 인식(STT): 브라우저 Web Speech API로 음성 명령 입력
2. NLU 라우팅: 의도/엔티티 추출 → 서버 함수 호출
3. 액션 실행: Step 37~51의 함수/엔드포인트 연동
4. TTS 안내: 응답 요약을 자동 음성으로 재생
5. 명령 센터 UI: 최근 명령/응답 로그, 퀵 액션 버튼

## 🚀 구현 사항

### 1. Frontend - OpsCopilot 컴포넌트

**파일**: `src/components/OpsCopilot.tsx`

- **음성 인식 (STT)**:
  - Web Speech Recognition API 사용
  - 한국어 지원 (`ko-KR`)
  - 실시간 전사 결과 표시
  - 듣기/정지 버튼

- **음성 합성 (TTS)**:
  - Web Speech Synthesis API 사용
  - 응답 자동 재생
  - 한국어 지원

- **명령 입력**:
  - 텍스트 입력창
  - Enter 키로 전송
  - 퀵 액션 버튼 (팀 요약, 이상 브리핑, 재튜닝, 재학습 상태)

- **대화 로그**:
  - 사용자/어시스턴트 메시지 구분
  - 타임스탬프 표시
  - 스크롤 가능한 로그 영역

### 2. Backend - opsRouter 함수

**파일**: `functions/src/step52.opsRouter.ts`

- **엔드포인트**: `POST /opsRouter`
- **NLU 라우팅**:
  - 정규식 기반 Intent 인식
  - 지원 Intent:
    - `team_summary`: 팀 요약
    - `anomaly_brief`: 이상 브리핑
    - `retuning`: 재튜닝
    - `predict_report`: 예측 리포트
    - `model_status`: 모델 상태
    - `model_reload`: 모델 재로드
    - `global_stats`: 전체 통계

- **액션 실행**:
  - Step 51의 `getGlobalStats` 호출
  - Step 51의 `triggerActions` 호출
  - Step 40의 `predictQualityTrend` 호출
  - 응답 텍스트 생성 (TTS용)

### 3. Frontend - OpsCenter 페이지

**파일**: `src/pages/admin/OpsCenter.tsx`

- **기능**:
  - OpsCopilot 컴포넌트 통합
  - 팀 필터 선택 (선택사항)
  - 사용 가이드 표시
  - 관리자 권한 체크

### 4. 라우트 설정

**파일**: `src/App.tsx`

- 경로: `/app/admin/ops-center`
- 관리자 전용 페이지

## 📊 주요 기능

### 음성 명령 처리 흐름

1. 사용자가 "듣기" 버튼 클릭
2. Web Speech Recognition API로 음성 인식 시작
3. 전사 결과를 텍스트로 변환
4. `opsRouter` API로 명령 전송
5. Intent 인식 및 액션 실행
6. 응답 텍스트를 TTS로 재생

### 지원 명령 예시

- **팀 요약**: "팀 요약 알려줘", "소흘FC 요약"
- **이상 브리핑**: "최근 이상 브리핑 해줘", "알람 뭐 있어?"
- **재튜닝**: "재튜닝 실행해", "튜닝 시작"
- **모델 상태**: "모델 재학습 상태 알려줘", "모델 버전 확인"
- **모델 재로드**: "모델 재로드", "리로드"
- **전체 통계**: "전체 통계", "글로벌 요약"

### 퀵 액션 버튼

- 팀 요약
- 이상 브리핑
- 재튜닝
- 재학습 상태

## 🔧 배포 절차

### 1. Functions 배포

```bash
firebase deploy --only functions:opsRouter
```

### 2. 환경 변수 설정

```bash
firebase functions:config:set \
  functions.origin="https://asia-northeast3-yago-vibe-spt.cloudfunctions.net"
```

또는 `.env` 파일에 설정:
```
FUNCTIONS_ORIGIN=https://asia-northeast3-yago-vibe-spt.cloudfunctions.net
```

### 3. 프론트엔드 접근

```
/app/admin/ops-center 경로로 접근
(관리자 권한 필요)
```

## 📈 사용 시나리오

### 시나리오 1: 음성으로 팀 요약 확인

1. Ops Center 접근
2. "듣기" 버튼 클릭
3. "팀 요약 알려줘" 또는 "소흘FC 요약" 말하기
4. TTS로 결과 재생

### 시나리오 2: 텍스트로 재튜닝 실행

1. 텍스트 입력창에 "재튜닝 실행해" 입력
2. Enter 키 또는 전송 버튼 클릭
3. TTS로 실행 결과 안내

### 시나리오 3: 퀵 액션 사용

1. "재튜닝" 버튼 클릭
2. 자동으로 재튜닝 명령 실행
3. TTS로 결과 안내

## 🎨 확장 아이디어

### 1. OpenAI NLU로 업그레이드

- `gpt-4o-mini`로 의도/엔티티 인식
- 더 자연스러운 명령 처리
- 컨텍스트 이해 향상

```typescript
// 예시: OpenAI NLU 통합
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
        { role: "system", content: "You are an ops copilot. Extract intent and entities from commands." },
        { role: "user", content: text }
    ],
});
```

### 2. 멀티턴 대화 상태

- 최근 질의 맥락(팀/기간) 유지
- 후속 명령 자연 처리
- 예: "그 팀의 알람은?" → 이전 대화에서 팀 정보 참조

### 3. Slack Slash Command

- `/ops retune SOHEUL_FC` 같은 명령을 Slack에서 직접 실행
- Slack Webhook 통합

### 4. 실패 복구

- opsRouter가 실패 시 재시도
- 실패 티켓 자동 생성 (Notion/Jira)
- 알림 발송 (Slack/Email)

## 🔍 모니터링

### API 호출 모니터링

```bash
firebase functions:log --only opsRouter
```

### 브라우저 호환성

- Web Speech API 지원 브라우저:
  - Chrome/Edge (권장)
  - Safari (제한적)
  - Firefox (제한적)

### 오류 처리

- STT 실패 시 텍스트 입력으로 대체
- TTS 실패 시 로그만 표시
- API 오류 시 사용자에게 명확한 메시지 표시

## 🐛 문제 해결

### 음성 인식이 작동하지 않을 때

1. HTTPS 연결 확인 (Web Speech API는 HTTPS 필요)
2. 브라우저 권한 확인 (마이크 권한)
3. 브라우저 호환성 확인

### TTS가 작동하지 않을 때

1. 브라우저 호환성 확인
2. 음성 합성 API 지원 확인
3. 대체로 로그만 표시

### 명령이 인식되지 않을 때

1. Intent 패턴 확인 (`functions/src/step52.opsRouter.ts`)
2. 로그에서 인식된 Intent 확인
3. 명령 예시 참고

## 📚 다음 단계

- Step 53: OpenAI NLU 업그레이드
- Step 54: 멀티턴 대화 상태 관리
- Step 55: Slack Slash Command 통합

