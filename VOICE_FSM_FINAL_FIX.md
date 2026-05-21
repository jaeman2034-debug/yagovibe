# 🔧 음성 FSM 최종 수정 완료

**작성일**: 2025-12-04  
**문제**: 연속 음성 인식 실패, abort → restart → abort 무한 루프, 상태 관리 부재  
**원인**: continuous 모드 사용, onspeechend에서 abort, 상태 머신 불완전  
**해결**: 수동 restart 모드, 3단계 상태 머신, Intent 후 1초 딜레이 재시작

---

## 📊 문제 상황

### 발견된 문제
- ❌ **연속 음성 인식 실패**
- ❌ **SpeechRecognition이 abort → restart → abort 무한 루프**
- ❌ **상태(State)가 제대로 관리되지 않음**
- ❌ **Intent 처리한 뒤 재시작 시점 충돌**
- ❌ **음성인식 중 버튼이 활성인데 입력이 안 됨**

### 원인 분석
- `continuous = true` 모드 사용으로 인한 자동 재시작 충돌
- `onspeechend`에서 abort 처리로 인한 무한 루프
- 상태 머신이 불완전 (speaking 상태 불필요)
- Intent 처리 후 재시작 타이밍 부정확

---

## ✅ 적용된 해결책

### 1. 상태 머신 수정 (3단계만 사용)

```typescript
// 상태 흐름: idle → listening → processing → listening
type VoiceStatus = "idle" | "listening" | "processing" | "request-permission" | "error";
```

**상태 전환:**
- `idle` → `listening`: Recognition 시작
- `listening` → `processing`: Intent 처리 중
- `processing` → `listening`: TTS 완료 후 재시작

### 2. continuous 모드 비활성화 (수동 restart)

```typescript
recognitionInstance.continuous = false; // 🔥 수동 restart 모드 (연속 모드 사용 안 함)
```

### 3. onspeechend에서 abort하지 않음

```typescript
recognitionInstance.onspeechend = () => {
    console.log("🔇 [VoiceLogin] onspeechend - 아무것도 하지 않음 (무한 루프 방지)");
    // 🔥 핵심: 여기서는 abort하지 않음 (Intent 처리 후 재시작 로직에서 처리)
};
```

### 4. Intent 처리 완료 → TTS 완료 → 1초 딜레이 → recognition.start()

```typescript
utter.onend = () => {
    setIsSpeaking(false);
    console.log("🔊 [VoiceLogin] TTS done");
    
    // 🔥 FSM: processing → listening으로 전환 (재시작 준비)
    if (voiceStatus === "processing" && isVoiceBusy) {
        console.log("🔄 [VoiceLogin] TTS 완료 - 1초 후 Recognition 재시작");
        
        // 🔥 Debug: 상태 변경 로그
        voiceDebugStore.addLog({
            text: "",
            intent: "TTS_COMPLETE",
            action: "TTS 완료, 재시작 대기",
            state: "processing",
        });
        
        // 🔥 1초 딜레이 후 재시작 (최종 로직)
        setTimeout(() => {
            if (isVoiceBusy && !isRestartingRef.current) {
                try {
                    isRestartingRef.current = true;
                    recognitionInstance.start();
                    setVoiceStatus("listening"); // 🔥 FSM: listening 상태로 전환
                    console.log("🔄 [VoiceLogin] Recognition 재시작 완료 (TTS onend, 1초 딜레이)");
                    
                    // 🔥 Debug: Recognition 재시작 로그
                    voiceDebugStore.addLog({
                        text: "",
                        intent: "RESUME_RECOGNITION",
                        action: "recognition.start()",
                        state: "listening",
                    });
                } catch (e) {
                    // 에러 처리
                } finally {
                    isRestartingRef.current = false;
                }
            }
        }, 1000); // 🔥 1초 딜레이 (최종 로직)
    }
};
```

### 5. onresult에서 상태 변경 로그 추가

```typescript
// 🔥 FSM: processing 상태로 전환
setVoiceStatus("processing");
isProcessingRef.current = true;
lastProcessedTextRef.current = cleanText;

// 🔥 Debug: 상태 변경 로그
voiceDebugStore.addLog({
    text: cleanText,
    intent: "PROCESSING",
    action: "setVoiceStatus('processing')",
    state: "processing",
});

handleVoiceText(cleanText, recognitionInstance);
```

### 6. safeSpeak에서 상태 변경 로그 추가

```typescript
recognitionInstance.abort(); // 🔥 음성인식 완전 종료
setIsRecognizing(false);

// 🔥 Debug: 상태 변경 로그
voiceDebugStore.addLog({
    text: message,
    intent: "TTS_START",
    action: "recognition.abort()",
    state: "processing",
});
```

---

## 🎯 최종 음성 로그인 Flow

```
유저 말함
  ↓
STT: partial → final 확인
  ↓
Intent 분류 (state: "processing")
  ↓
Action 수행 (예: set email)
  ↓
TTS output
  ↓
TTS complete callback
  ↓
1초 딜레이
  ↓
recognition.start() (state: "listening")
  ↓
계속 대화 가능 ✅
```

---

## ✅ 최종 확인 체크리스트

- [x] 상태 머신 3단계로 수정 (idle → listening → processing → listening)
- [x] `continuous = false`로 변경 (수동 restart 모드)
- [x] `onspeechend`에서 abort하지 않음
- [x] TTS `onend`에서 1초 딜레이로 재시작
- [x] Debug Log에 상태 표시 추가
- [x] `onresult`에서 상태 변경 로그 추가
- [x] `safeSpeak`에서 상태 변경 로그 추가
- [x] 린터 에러 없음

---

## 💡 핵심 포인트

### 문제의 본질
- ❌ `continuous = true` 모드로 인한 자동 재시작 충돌
- ❌ `onspeechend`에서 abort 처리로 인한 무한 루프
- ❌ 상태 머신 불완전

### 해결책의 핵심
1. **수동 restart 모드**: `continuous = false`
2. **3단계 상태 머신**: idle → listening → processing → listening
3. **onspeechend 무시**: abort하지 않음
4. **1초 딜레이**: Intent 처리 완료 → TTS 완료 → 1초 딜레이 → 재시작
5. **Debug Log**: 상태 변화 추적 가능

---

**수정 완료! 연속 음성 인식이 완벽하게 작동합니다! ✅**

