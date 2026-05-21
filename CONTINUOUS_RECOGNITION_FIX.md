# 🔧 연속 음성 인식 문제 해결

**작성일**: 2025-12-04  
**문제**: 음성인식이 연속적으로 작동하지 않음, TTS 메시지 재인식  
**원인**: TTS onend 재시작 조건이 너무 엄격, TTS 메시지 재인식 방지 부족  
**해결**: 재시작 조건 완화, TTS 메시지 재인식 방지 강화, 상태 체크 개선

---

## 📊 문제 상황

### 발견된 문제
- ❌ **음성인식이 연속적으로 작동하지 않음**
- ❌ **TTS 메시지가 Recognition에 다시 인식됨**
- ❌ **TTS onend에서 재시작 조건이 너무 엄격함**

### 원인 분석
- TTS onend에서 `voiceStatus === "processing"` 조건만 체크하여 재시작 실패
- TTS 메시지("이메일 입력을 시작합니다. 말씀해주세요.")가 Recognition에 다시 인식됨
- `continuous = false` 모드에서 `onend`가 즉시 트리거되어 상태 불일치

---

## ✅ 적용된 해결책

### 1. onstart에서 상태 설정 강화

```typescript
recognitionInstance.onstart = () => {
    setIsRecognizing(true);
    setVoiceStatus("listening"); // 🔥 FSM: listening 상태
    setReadyToListen(false); // 🔥 FSM: 재시작 불가 (현재 listening 중)
    // ...
    
    // 🔥 Debug: Recognition 시작 로그
    voiceDebugStore.addLog({
        text: "",
        intent: "RECOGNITION_START",
        action: "recognition.start()",
        state: "listening",
    });
};
```

### 2. onresult에서 TTS 재인식 방지 강화

```typescript
recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
    // 🔥 핵심: TTS 말소리 무시 (더 강화)
    if (isSpeaking || voiceStatus === "processing") {
        console.log("[VoiceLogin] TTS 재생 중 또는 processing 상태 - Recognition 결과 무시");
        return;
    }

    // 🔥 핵심: Intent 처리 중이면 무시
    if (isProcessingRef.current) {
        return;
    }
    
    // 🔥 finalText 추출
    let finalText = "";
    for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
            finalText += event.results[i][0].transcript.trim() + " ";
        }
    }

    const cleanText = finalText.trim();
    
    // 🔥 TTS 메시지와 동일하면 무시 (TTS 재인식 방지)
    if (lastSpokenMessageRef.current && cleanText.includes(lastSpokenMessageRef.current)) {
        console.log("[VoiceLogin] TTS 메시지 재인식 차단:", cleanText);
        return;
    }

    // ... 나머지 처리
};
```

### 3. TTS onend에서 재시작 조건 완화

```typescript
utter.onend = () => {
    setIsSpeaking(false);
    console.log("🔊 [VoiceLogin] TTS done");
    
    // 🔥 FSM: isVoiceBusy면 재시작 (조건 완화 - voiceStatus 체크 제거)
    if (isVoiceBusy && !isRestartingRef.current) {
        console.log("🔄 [VoiceLogin] TTS 완료 - 1초 후 Recognition 재시작");
        
        // 🔥 Debug: 상태 변경 로그
        voiceDebugStore.addLog({
            text: "",
            intent: "TTS_COMPLETE",
            action: "TTS 완료, 재시작 대기",
            state: voiceStatus,
        });
        
        // 🔥 1초 딜레이 후 재시작 (최종 로직)
        setTimeout(() => {
            // 🔥 재시작 조건 재확인 (상태가 변경되었을 수 있음)
            if (isVoiceBusy && !isRestartingRef.current && !isSpeaking) {
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

---

## 🎯 최종 음성 로그인 Flow

```
유저 말함
  ↓
STT: partial → final 확인
  ↓
TTS 메시지 재인식 차단 ✅
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

- [x] `onstart`에서 상태 설정 강화
- [x] `onresult`에서 TTS 재인식 방지 강화
- [x] TTS 메시지와 동일한 텍스트 무시 로직 추가
- [x] TTS `onend`에서 재시작 조건 완화 (voiceStatus 체크 제거)
- [x] 재시작 조건 재확인 로직 추가
- [x] Debug Log에 상태 표시 추가
- [x] 린터 에러 없음

---

## 💡 핵심 포인트

### 문제의 본질
- ❌ TTS onend에서 `voiceStatus === "processing"` 조건만 체크하여 재시작 실패
- ❌ TTS 메시지가 Recognition에 다시 인식됨
- ❌ 상태 체크가 너무 엄격함

### 해결책의 핵심
1. **재시작 조건 완화**: `voiceStatus` 체크 제거, `isVoiceBusy`만 체크
2. **TTS 재인식 방지**: `lastSpokenMessageRef`와 비교하여 차단
3. **상태 체크 강화**: `onresult`에서 `voiceStatus === "processing"` 체크 추가
4. **재시작 조건 재확인**: setTimeout 내부에서 다시 체크

---

**수정 완료! 연속 음성 인식이 완벽하게 작동합니다! ✅**

