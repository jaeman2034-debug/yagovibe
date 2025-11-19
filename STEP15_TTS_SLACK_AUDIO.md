# Step 15: AI TTS 음성 리포트 자동 생성 및 Slack 오디오 재생 통합

## ✅ 구현 완료 사항

### 1. TTS 자동 생성 트리거
`functions/src/reportTTSGenerator.ts` 생성:
- `generateVoiceReport`: 리포트 생성 시 TTS로 요약 낭독 음성 파일 자동 생성
- OpenAI TTS API 사용 (`tts-1` 모델, `alloy` 음성)
- Firebase Storage에 MP3 파일 저장
- Firestore 문서에 `ttsUrl`, `audioUrl` 자동 업데이트

### 2. Slack 메시지 업데이트
`functions/src/reportSlackNotifier.ts` 업데이트:
- Slack 메시지에 **Attachments** 형식으로 버튼 추가
- **📄 PDF 보기** 버튼 (Primary 스타일)
- **🔊 음성 듣기** 버튼 (TTS URL)
- 버튼 클릭 시 Firebase Storage의 MP3 파일 즉시 재생

## 🔄 전체 자동화 플로우

```
[리포트 생성] (수동 또는 스케줄러)
  ↓
[Firestore reports 컬렉션에 문서 추가]
  ↓
[동시 트리거 실행]
  ├─ generateVoiceReport → 🎧 TTS 음성 파일 생성 (Step 15)
  │   ├─ OpenAI TTS API 호출
  │   ├─ MP3 파일 생성
  │   ├─ Firebase Storage 업로드 (audio/reports/{id}.mp3)
  │   └─ Firestore에 ttsUrl, audioUrl 업데이트
  │
  ├─ onReportCreateEmail → 📧 이메일 발송 (Step 12)
  ├─ notifySlack → 💬 Slack 알림 (Step 13)
  └─ triggerN8nWorkflow → 🚀 n8n 워크플로우 트리거 (Step 14)
```

## 🎧 TTS 생성 과정

### 1. 텍스트 구성
- 리포트 제목 + 요약
- KPI 정보 (총 판매, 평균 평점)
- TOP 상품 정보 (최대 3개)
- 최종 안내 문구

### 2. OpenAI TTS API 호출
```typescript
const speech = await openai.audio.speech.create({
  model: "tts-1",
  voice: "alloy",
  input: ttsText,
  response_format: "mp3",
});
```

### 3. Firebase Storage 저장
- 경로: `audio/reports/{reportId}.mp3`
- Content-Type: `audio/mpeg`
- Signed URL 생성 (7일 유효)

### 4. Firestore 업데이트
```typescript
{
  ttsUrl: "https://storage.googleapis.com/...",
  audioUrl: "https://storage.googleapis.com/...",
  ttsGeneratedAt: Timestamp,
  mp3Path: "audio/reports/{id}.mp3"
}
```

## 💬 Slack 메시지 형식

### 메시지 구조
```
📢 *AI 리포트 생성됨*

*제목:* 주간 AI 리포트 - 2024-11-18
*작성자:* YAGO VIBE AI
*생성일:* 2024-11-18

*요약:*
총 예상 판매는 128개, 평균 평점은 4.5점입니다...

[📄 PDF 보기] [🔊 음성 듣기]
```

### Attachments 형식
```json
{
  "text": "...",
  "attachments": [
    {
      "fallback": "PDF 보기",
      "actions": [
        {
          "type": "button",
          "text": "📄 PDF 보기",
          "url": "https://...",
          "style": "primary"
        }
      ]
    },
    {
      "fallback": "음성 리포트 듣기",
      "actions": [
        {
          "type": "button",
          "text": "🔊 음성 듣기",
          "url": "https://storage.googleapis.com/..."
        }
      ]
    }
  ]
}
```

## ⚙️ 환경 변수 설정

### Firebase Functions

```bash
cd functions

# OpenAI API 키 설정 (TTS 생성용)
firebase functions:secrets:set OPENAI_API_KEY
# 또는
firebase functions:config:set openai.key="sk-..."
```

## 🚀 배포 및 테스트

### 1. Firebase Functions 배포

```bash
cd functions
npm run build
firebase deploy --only functions:generateVoiceReport,functions:notifySlack
```

### 2. 테스트

```bash
# 리포트 생성 (Firebase Console 또는 API)
# 또는 ReportsPage에서 "리포트 생성" 버튼 클릭

# logs 확인
firebase functions:log --only generateVoiceReport

# reports-log 확인
# Firestore → reports-log 컬렉션에서 tts_generated 이벤트 확인
```

### 3. Slack에서 확인

1. 리포트 생성 후 Slack 채널 확인
2. **🔊 음성 듣기** 버튼 클릭
3. 브라우저에서 MP3 파일 재생 또는 다운로드

## 📊 Firestore 구조

### reports 컬렉션 업데이트
```javascript
{
  id: "report-id",
  title: "주간 AI 리포트 - 2024-11-18",
  summary: "...",
  pdfUrl: "https://storage.googleapis.com/.../report.pdf",
  audioUrl: "https://storage.googleapis.com/.../report.mp3", // ✅ TTS 추가
  ttsUrl: "https://storage.googleapis.com/.../report.mp3", // ✅ TTS 추가
  ttsGeneratedAt: Timestamp, // ✅ 생성 시간
  mp3Path: "audio/reports/report-id.mp3", // ✅ Storage 경로
  // ... 기타 필드
}
```

### reports-log 컬렉션
```javascript
{
  at: Timestamp,
  event: "tts_generated",
  reportId: "report-id",
  date: "2024-11-18",
  title: "주간 AI 리포트 - 2024-11-18",
  mp3Path: "audio/reports/report-id.mp3",
  status: "success"
}
```

## ✅ 체크리스트

- ✅ `reportTTSGenerator.ts` 생성 및 배포
- ✅ OpenAI API 키 설정 (`OPENAI_API_KEY`)
- ✅ `reportSlackNotifier.ts` 업데이트 (Attachments 버튼 추가)
- ✅ Firebase Storage 보안 규칙 확인 (`audio/reports/**` 읽기 허용)
- ✅ TTS 생성 테스트 (리포트 생성 → MP3 파일 확인)
- ✅ Slack 메시지 버튼 테스트 (버튼 클릭 → MP3 재생 확인)
- ✅ `reports-log`에서 TTS 생성 로그 확인

## 🎉 완성!

**이제 리포트 생성 시 TTS 음성 파일이 자동 생성되고, Slack에서 바로 재생할 수 있습니다!** 🚀

## 💡 추가 팁

### 1. TTS 음성 옵션
OpenAI TTS 모델에서 사용 가능한 음성:
- `alloy` - 균형잡힌 목소리 (기본)
- `echo` - 명확하고 밝은 목소리
- `fable` - 따뜻하고 부드러운 목소리
- `onyx` - 깊고 진지한 목소리
- `nova` - 밝고 활기찬 목소리
- `shimmer` - 부드럽고 우아한 목소리

### 2. TTS 모델 선택
- `tts-1` - 표준 속도 ($15 / 1M characters)
- `tts-1-hd` - 고품질 ($30 / 1M characters)

### 3. 중복 생성 방지
`generateVoiceReport` 트리거는 이미 `audioUrl` 또는 `ttsUrl`이 있으면 건너뜁니다:
```typescript
if (report.audioUrl || report.ttsUrl) {
  logger.info("ℹ️ 이미 음성 리포트가 존재합니다. 건너뜁니다:", reportId);
  return;
}
```

### 4. 텍스트 길이 제한
요약 텍스트는 최대 1000자로 제한됩니다 (TTS 비용 및 생성 시간 고려):
```typescript
const summary = report.summary.length > 1000
  ? report.summary.slice(0, 1000) + "..."
  : report.summary;
```

### 5. Signed URL 유효기간
MP3 파일의 Signed URL은 7일 동안 유효합니다:
```typescript
const [ttsUrl] = await storage.file(mp3Path).getSignedUrl({
  action: "read",
  expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7일
});
```

