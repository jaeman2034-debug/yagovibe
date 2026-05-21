# 🚀 Whisper-cloud 빠른 시작 가이드

**작성일**: 2025-12-04  
**목표**: 내일 바로 시작할 수 있도록 준비 완료!

---

## ✅ 준비 체크리스트 (5분 안에 확인)

### 1. OpenAI API Key 발급
- [ ] OpenAI 계정이 있는가? 
  - 없으면: https://platform.openai.com/signup
  - 있으면: https://platform.openai.com/api-keys

- [ ] API Key 발급 완료
  - "Create new secret key" 클릭
  - Key 복사 (한 번만 보여줌!)
  - 예시: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 2. 환경 변수 설정
- [ ] `.env.local` 파일에 추가
  ```env
  # OpenAI API Key (서버용)
  OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```

### 3. 패키지 설치 준비
- [ ] `socket.io` 설치 필요
  ```bash
  npm install socket.io socket.io-client
  ```

### 4. 현재 상태 확인
- [x] Express 서버 존재 (`server/index.js`)
- [x] OpenAI 패키지 설치됨 (`openai@6.6.0`)
- [x] BFF 서버 실행 가능 (`npm run dev:bff`)

---

## 📝 내일 첫 작업 (30분)

### Step 1: 환경 변수 설정 (5분)

**파일**: `.env.local` (프로젝트 루트)

```env
# OpenAI API Key
OPENAI_API_KEY=sk-proj-your-key-here
```

### Step 2: 패키지 설치 (2분)

```bash
npm install socket.io socket.io-client multer
```

### Step 3: 서버 엔드포인트 추가 (20분)

**파일**: `server/index.js`

```javascript
import { OpenAI } from 'openai';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Whisper 엔드포인트
app.post('/api/voice/transcribe', multer().single('audio'), async (req, res) => {
  try {
    const audioFile = req.file;
    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Whisper API 호출
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile.buffer,
      model: 'whisper-1',
      language: 'ko',
    });

    res.json({ transcript: transcription.text });
  } catch (error) {
    console.error('Whisper error:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket 연결
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('audio-chunk', async (data) => {
    // 실시간 스트리밍 처리
    // TODO: 구현
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// 서버 시작 (포트 변경)
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 BFF 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`🎤 Whisper 엔드포인트: http://localhost:${PORT}/api/voice/transcribe`);
});
```

### Step 4: 테스트 (3분)

```bash
# 서버 시작
npm run dev:bff

# 다른 터미널에서
curl -X POST http://localhost:4000/api/voice/transcribe \
  -F "audio=@test-audio.mp3"
```

---

## 🎯 구현 우선순위

### Phase 1 (Day 1): 기본 동작
1. ✅ 서버 엔드포인트 추가
2. ✅ 간단한 파일 업로드 테스트
3. ✅ Whisper API 연동 확인

### Phase 2 (Day 2): 스트리밍
1. ✅ WebSocket 연결
2. ✅ 오디오 chunk 전송
3. ✅ 실시간 transcript 수신

### Phase 3 (Day 3): 프론트엔드
1. ✅ WebAudio API 마이크 캡처
2. ✅ Whisper 서비스 통합
3. ✅ LoginPage 전환

### Phase 4 (Day 4): 최적화
1. ✅ VAD 구현
2. ✅ Intent 시스템 통합
3. ✅ 모바일 테스트

---

## 🔗 필수 링크

- **OpenAI API Keys**: https://platform.openai.com/api-keys
- **Whisper API 문서**: https://platform.openai.com/docs/guides/speech-to-text
- **Socket.io 문서**: https://socket.io/docs/v4/
- **WebAudio API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

---

## 💡 핵심 포인트

1. **API Key는 서버에서만 사용**
   - 프론트엔드에 노출하지 않기
   - `.env.local`에만 저장

2. **비용 관리**
   - Whisper: $0.006/분
   - 테스트 시 사용량 모니터링

3. **에러 처리**
   - 네트워크 오류 대응
   - API 실패 시 fallback

---

## ✅ 준비 완료 체크

- [ ] OpenAI API Key 발급 완료
- [ ] `.env.local`에 API Key 추가
- [ ] 패키지 설치 준비 완료
- [ ] 서버 코드 구조 확인
- [ ] 다음 단계 계획 확인

**모든 체크 완료 시 → 내일 바로 시작 가능! 🚀**

