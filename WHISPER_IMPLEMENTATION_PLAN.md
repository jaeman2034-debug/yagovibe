# 🎤 Whisper-cloud 전환 구현 계획

**작성일**: 2025-12-04  
**목표**: WebSpeech API → Whisper-cloud 기반 음성 인식으로 전환

---

## 📊 현재 상태 vs 목표

### 현재 상태 (WebSpeech API)
- ❌ 한국어 + 모바일 환경에서 불안정
- ❌ `no-speech` 에러 빈번 발생
- ❌ `AbortError` 발생
- ✅ 브라우저 내장 (설정 불필요)

### 목표 상태 (Whisper-cloud)
- ✅ 한국어 완벽 지원
- ✅ 모바일 안정적 동작
- ✅ 노이즈 강함 (환경 소음에 강함)
- ✅ 정확도 최고
- ✅ 빠른 응답 속도

---

## ✅ 준비 체크리스트

### 1. OpenAI API Key 준비
- [ ] OpenAI 계정 생성/로그인
- [ ] API Key 발급 (https://platform.openai.com/api-keys)
- [ ] API Key 환경 변수 설정 (`.env.local`)

### 2. 서버 인프라 확인
- [x] Express 서버 존재 (`server/index.js`)
- [x] BFF 서버 실행 중 (`npm run dev:bff`)
- [ ] Whisper 엔드포인트 추가 준비

### 3. 스트리밍 인프라
- [ ] socket.io 설치 필요
- [ ] WebSocket 연결 로직 구현
- [ ] 마이크 스트리밍 로직 구현

---

## 🎯 구현 계획 (단계별)

### Phase 1: 서버 인프라 구축

#### 1-1. Express 서버에 Whisper 엔드포인트 추가

**파일**: `server/index.js`

**추가할 기능**:
```javascript
// POST /api/voice/transcribe
// - audio chunks 수신
// - Whisper API 호출
// - transcript 반환
```

**필요 패키지**:
- `openai` (이미 설치됨 ✅)
- `multer` 또는 `form-data` (오디오 파일 업로드용)
- `socket.io` (스트리밍용)

#### 1-2. 환경 변수 설정

**파일**: `.env.local`

```env
# OpenAI API Key
OPENAI_API_KEY=sk-xxx

# Whisper 설정
WHISPER_MODEL=whisper-1
```

**파일**: `server/index.js` (환경 변수 로드)

```javascript
import dotenv from 'dotenv';
dotenv.config();
```

---

### Phase 2: 프론트엔드 스트리밍 구현

#### 2-1. WebAudio API로 마이크 캡처

**파일**: `src/services/whisperService.ts` (신규 생성)

**기능**:
- WebAudio API로 마이크 접근
- 오디오 chunk 생성 (PCM 형식)
- WebSocket으로 서버에 전송
- 실시간 transcript 수신

**주요 함수**:
```typescript
- startRecording(): 마이크 시작
- stopRecording(): 마이크 중지
- sendAudioChunk(chunk: ArrayBuffer): 서버로 전송
- onTranscript(callback): transcript 수신
```

#### 2-2. WebSocket 연결 관리

**파일**: `src/services/whisperService.ts`

**WebSocket 프로토콜**:
```typescript
// 클라이언트 → 서버
{
  type: 'audio-chunk',
  data: ArrayBuffer
}

// 서버 → 클라이언트
{
  type: 'transcript',
  text: string,
  isFinal: boolean
}
```

---

### Phase 3: VAD (Voice Activity Detection) 적용

#### 3-1. 음성 끝 감지

**파일**: `src/utils/vad.ts` (신규 생성)

**기능**:
- 오디오 레벨 모니터링
- 조용한 시간 측정 (2초)
- 자동 인식 종료

**알고리즘**:
```typescript
- 음성 레벨 임계값 설정
- 연속 조용함 시간 측정
- 2초 이상 조용하면 종료
```

#### 3-2. Intent 자동 실행

**파일**: `src/pages/SportsHubPage.tsx`

**통합**:
- Whisper transcript 수신
- 기존 `parseVoiceCommand` 함수 재사용
- Intent 실행

---

### Phase 4: 기존 시스템 통합

#### 4-1. LoginPage 음성 로그인 전환

**파일**: `src/pages/LoginPage.tsx`

**변경사항**:
- WebSpeech API 제거
- Whisper 서비스로 교체
- 동일한 UX 유지

#### 4-2. SportsHub 음성 명령 전환

**파일**: `src/pages/SportsHubPage.tsx`

**변경사항**:
- 기존 VoiceCommandHandler 대신 Whisper 사용
- Intent 시스템은 그대로 유지

---

## 📁 파일 구조

```
yago-vibe-spt/
├── server/
│   ├── index.js              # ✏️ Whisper 엔드포인트 추가
│   └── whisper.js            # 🆕 Whisper 로직 분리
├── src/
│   ├── services/
│   │   ├── whisperService.ts # 🆕 Whisper 클라이언트 서비스
│   │   └── vad.ts            # 🆕 VAD 유틸리티
│   └── pages/
│       ├── LoginPage.tsx     # ✏️ Whisper로 전환
│       └── SportsHubPage.tsx # ✏️ Whisper로 전환
└── package.json              # ✏️ socket.io 추가
```

---

## 🔧 기술 스택

| 기술 | 용도 | 상태 |
|------|------|------|
| **OpenAI Whisper API** | STT (Speech-to-Text) | 설치 필요 |
| **socket.io** | 실시간 스트리밍 | 설치 필요 |
| **WebAudio API** | 마이크 캡처 | 브라우저 내장 |
| **Express** | 서버 엔드포인트 | ✅ 이미 있음 |
| **기존 Intent 시스템** | 명령 파싱 | ✅ 재사용 |

---

## 💰 비용 예상

### OpenAI Whisper API 요금 (2024 기준)
- **$0.006 / 분** (오디오 입력 기준)
- 예시:
  - 1일 100회 사용 (평균 5초/회) = 약 $0.05/일
  - 1개월 = 약 $1.5/월

**예상 비용**: 매우 저렴 ($1-5/월)

---

## 🚀 구현 순서 (우선순위)

### Day 1: 서버 구축
1. ✅ Express 서버에 Whisper 엔드포인트 추가
2. ✅ OpenAI API 연동 테스트
3. ✅ 환경 변수 설정

### Day 2: 프론트엔드 기본 구현
1. ✅ WebAudio API로 마이크 캡처
2. ✅ socket.io로 서버 연결
3. ✅ 기본 스트리밍 테스트

### Day 3: VAD 및 통합
1. ✅ VAD 구현
2. ✅ 기존 Intent 시스템 통합
3. ✅ LoginPage 전환

### Day 4: 최적화 및 테스트
1. ✅ 에러 처리 강화
2. ✅ 모바일 테스트
3. ✅ 성능 최적화

---

## 🎯 예상 결과

### 대화 흐름 예시

```
사용자: "헤이 야고"
→ 앱이 깨어남

사용자: "오늘 EPL 경기 뭐 있어?"
→ Whisper STT → Intent 분석 → ESPN API → 응답
→ "오늘 EPL 경기 2개 있어요."

사용자: "손흥민 경기만!"
→ Whisper STT → 선수 엔티티 매핑 → 경기 필터링
→ "손흥민 경기 1개 있어요."

사용자: "하이라이트 보여줘"
→ YouTube API 검색 → 링크 제공
```

---

## ⚠️ 주의사항

1. **API Key 보안**
   - 절대 프론트엔드에 노출하지 않기
   - 서버에서만 OpenAI API 호출

2. **비용 관리**
   - 사용량 모니터링
   - 필요시 요금제 제한 설정

3. **에러 처리**
   - 네트워크 오류 대응
   - API 실패 시 fallback (WebSpeech로 복귀?)

4. **모바일 최적화**
   - 배터리 소모 고려
   - 데이터 사용량 최소화

---

## 📝 다음 단계

1. **환경 변수 설정**
   - OpenAI API Key 발급
   - `.env.local`에 추가

2. **패키지 설치**
   ```bash
   npm install socket.io socket.io-client multer
   ```

3. **서버 엔드포인트 구현**
   - `server/index.js`에 Whisper 엔드포인트 추가

4. **프론트엔드 서비스 구현**
   - `src/services/whisperService.ts` 생성

5. **통합 테스트**
   - LoginPage에서 테스트
   - SportsHub에서 테스트

---

## 🔗 참고 자료

- [OpenAI Whisper API 문서](https://platform.openai.com/docs/guides/speech-to-text)
- [WebAudio API 가이드](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Socket.io 문서](https://socket.io/docs/v4/)

---

**준비 완료! 내일 바로 구현 시작! 🚀**

