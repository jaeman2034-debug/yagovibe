# 🔥 실시간 스트리밍 STT 아키텍처

## 🎯 목표

**말하는 중에 텍스트가 실시간으로 표시되고, 명령어 패턴 감지 시 즉시 실행**

---

## 📐 아키텍처 개요

```
[마이크 스트림]
    ↓
[2초마다 오디오 Chunk]
    ↓
[STT 서버 전송] (JSON base64)
    ↓
[Partial Transcript 수신]
    ↓
[UI 실시간 업데이트]
    ↓
[명령 패턴 감지] → [즉시 실행]
```

---

## 🔄 핵심 플로우

### 1. **연속 녹음 루프**

```ts
while (isRecording) {
  // 2초 오디오 녹음
  const chunk = await recordChunk(2000);
  
  // 즉시 STT 전송
  const text = await transcribeChunk(chunk);
  
  // UI 업데이트
  updateTranscript(text);
  
  // 명령 감지 체크
  if (isCommand(text)) {
    executeCommand(text);
  }
}
```

### 2. **Chunk 기반 전송**

- **Chunk 길이**: 1-2초
- **전송 방식**: JSON base64 (기존 stt 함수 재사용)
- **반복 주기**: 녹음 중지 전까지 계속

### 3. **Partial Transcript 처리**

- **누적 방식**: 이전 텍스트 + 새 텍스트
- **UI 표시**: 실시간 텍스트 박스 업데이트
- **명령 감지**: "찾아줘", "가줘" 등 패턴 즉시 체크

---

## 🛠 구현 전략

### Phase 1: 기본 스트리밍 (MVP)

1. ✅ **2초 Chunk 녹음 루프**
   - `Audio.Recording.createAsync`를 주기적으로 호출
   - 각 Chunk를 base64로 변환
   - STT 서버에 전송

2. ✅ **실시간 텍스트 표시**
   - State에 `partialText` 추가
   - Chunk마다 업데이트

3. ✅ **명령 즉시 감지**
   - `parseCommand`를 각 Chunk마다 실행
   - 명령 감지 시 녹음 중지 + 실행

### Phase 2: 최적화 (향후)

- WebSocket 기반 실시간 전송
- VAD (Voice Activity Detection)로 무음 구간 스킵
- Server-Sent Events로 스트리밍 응답

---

## 📊 데이터 플로우

```
[사용자 음성 입력]
    ↓
[마이크] → [오디오 Buffer] (2초)
    ↓
[Base64 변환]
    ↓
[POST /stt] { audioBase64 }
    ↓
[Whisper STT]
    ↓
[Partial Text 응답]
    ↓
[클라이언트 UI 업데이트]
    ↓
[명령 감지?] → [즉시 실행]
```

---

## ⚡ 성능 고려사항

1. **Chunk 크기**: 1-2초 (너무 작으면 STT 정확도 ↓)
2. **전송 주기**: 2초 (네트워크 부하 vs 반응성)
3. **병렬 처리**: 여러 Chunk 동시 전송 금지 (순서 보장)
4. **에러 처리**: Chunk 실패해도 다음 Chunk 계속 진행

---

## 🎯 다음 단계

1. **Step 1**: Chunk 기반 녹음 루프 구현
2. **Step 2**: 실시간 STT 호출 통합
3. **Step 3**: UI 실시간 업데이트
4. **Step 4**: 명령 즉시 실행 로직
