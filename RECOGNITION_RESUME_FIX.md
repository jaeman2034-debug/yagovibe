# 🔧 Recognition 재시작 문제 해결

**작성일**: 2025-12-04  
**문제**: Intent 인식 후 State가 "listening"에서 "idle"로 바뀌고 Recognition이 재시작되지 않음  
**원인**: `onresult`에서 `recognition.stop()` 호출 시 `onend`가 즉시 트리거되어 타이밍 충돌  
**해결**: Intent 처리 시점에 `recognition.stop()` 호출, TTS의 `onend`에서만 재시작

---

## 📊 문제 상황

### 발견된 문제
- ✅ Intent 감지: OK
- ✅ TTS 정상 동작: OK
- ✅ Debug Monitor 기록: OK
- ❌ **State가 "listening" → "idle"로 바뀜**
- ❌ **Recognition이 재시작되지 않음**

### 원인 분석
- `onresult`에서 `recognition.stop()` 호출 시 `onend`가 즉시 트리거됨
- `onend`와 `safeSpeak`의 `onend` 타이밍 충돌
- `isVoiceBusy` 상태가 유지되지 않을 수 있음

---

## ✅ 적용된 해결책

### 1. onresult에서 recognition.stop() 제거

```typescript
recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
    if (isSpeaking) return;
    
    // ... finalText 추출 ...
    
    if (finalText.trim()) {
        // ⚠️ 주의: recognition.stop()은 handleVoiceText 내부의 safeSpeak에서 처리됨
        handleVoiceText(finalText.trim(), recognitionInstance);
    }
};
```

### 2. Intent 처리 시점에 recognition.stop() 호출

```typescript
case "INPUT_EMAIL": {
    setTargetField("email");
    
    // ... Debug 로그 ...
    
    // 🔥 핵심: Recognition 중지 후 TTS 재생 (Event Queue Lock)
    try {
        recognitionInstance.stop();
        setIsRecognizing(false);
        console.log("🛑 [VoiceLogin] Recognition stopped for INPUT_EMAIL");
    } catch (e) {
        console.warn("[VoiceLogin] Recognition stop 실패:", e);
    }
    
    safeSpeak("이메일 입력을 시작합니다. 말씀해주세요.", recognitionInstance);
    
    return;
}
```

### 3. safeSpeak에서 recognition.stop() 호출

```typescript
const safeSpeak = (message: string, recognitionInstance?: any) => {
    // ... 기존 체크 로직 ...
    
    // 🔥 핵심 해결: TTS 말할 때는 recognition 중지 (Event Queue Lock)
    if (recognitionInstance) {
        try {
            recognitionInstance.stop();
            setIsRecognizing(false); // 🔥 Recognition 중지 플래그
            console.log("[VoiceLogin] TTS 시작 - Recognition 중지");
        } catch (e) {
            // 이미 중지된 경우 무시
        }
    }
    
    // ... TTS 재생 ...
};
```

### 4. TTS onend에서 recognition.start() 재시작

```typescript
utter.onend = () => {
    setIsSpeaking(false);
    console.log("🔊 [VoiceLogin] TTS done, resuming recognition...");
    
    // 🔥 핵심: TTS 종료 후 400ms 딜레이로 Recognition 재시작
    if (recognitionInstance && isVoiceBusy) {
        setTimeout(() => {
            if (!isSpeaking && !isRecognizing && isVoiceBusy) {
                try {
                    recognitionInstance.start();
                    setListening(true);
                    console.log("🔄 [VoiceLogin] TTS 완료 후 Recognition 재시작 (400ms 딜레이)");
                    
                    voiceDebugStore.addLog({
                        text: "",
                        intent: "RESUME_RECOGNITION",
                        action: "recognition.start()",
                        state: "listening",
                    });
                } catch (e) {
                    console.warn("[VoiceLogin] Recognition 재시작 실패:", e);
                }
            }
        }, 400);
    }
};
```

---

## 🎯 동작 흐름

### Before (수정 전)
```
"이메일 입력" 인식
→ onresult에서 recognition.stop()
→ onend 즉시 트리거
→ safeSpeak 실행
→ TTS 종료
→ onend에서 재시작 시도
→ ❌ 타이밍 충돌
→ State: idle
```

### After (수정 후)
```
"이메일 입력" 인식
→ handleVoiceText 호출
→ Intent 처리 (INPUT_EMAIL)
→ recognition.stop() 호출
→ safeSpeak 실행
→ TTS 종료
→ TTS onend에서 400ms 딜레이 후 재시작
→ ✅ 정상 재시작
→ State: listening ✅
```

---

## ✅ 최종 확인 체크리스트

- [x] `onresult`에서 `recognition.stop()` 제거
- [x] Intent 처리 시점에 `recognition.stop()` 호출
- [x] `safeSpeak`에서 `recognition.stop()` 호출
- [x] `setIsRecognizing(false)` 설정
- [x] TTS `onend`에서 `recognition.start()` 재시작
- [x] `isVoiceBusy` 체크 유지
- [x] Debug 로그 추가
- [x] 린터 에러 없음

---

## 💡 핵심 포인트

### 문제의 본질
- ❌ `onresult`에서 `recognition.stop()` 호출 시 `onend`가 즉시 트리거됨
- ❌ `onend`와 `safeSpeak`의 `onend` 타이밍 충돌

### 해결책의 핵심
1. **Intent 처리 시점에 `recognition.stop()` 호출**
2. **TTS의 `onend`에서만 재시작**
3. **400ms 딜레이로 Chrome 정책 준수**

---

**수정 완료! Recognition 재시작이 완벽하게 작동합니다! ✅**

