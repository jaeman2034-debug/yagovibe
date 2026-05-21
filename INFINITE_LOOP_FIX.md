# 🔧 무한 루프 및 연속 연결 문제 해결

**작성일**: 2025-12-04  
**문제**: 음성인식이 연속 연결이 안되고 무한 루프 작동  
**원인**: `onend`와 TTS의 `onend`에서 동시에 `recognition.start()` 호출, Intent 처리 시점의 중복 `stop()` 호출  
**해결**: `onend`에서 재시작 로직 제거, TTS의 `onend`에서만 재시작, Intent 처리 시점의 중복 `stop()` 제거

---

## 📊 문제 상황

### 발견된 문제
- ❌ **음성인식이 연속 연결이 안됨**
- ❌ **음성인식 중 무한 루프 작동**

### 원인 분석
1. **`onend`에서 `recognition.start()` 호출**
   - `onend`가 트리거될 때마다 재시작 시도
   - TTS의 `onend`와 동시에 재시작 시도하여 충돌

2. **Intent 처리 시점의 중복 `stop()` 호출**
   - Intent 처리 시점에 `recognition.stop()` 호출
   - `safeSpeak` 내부에서도 `recognition.stop()` 호출
   - 중복 호출로 인한 타이밍 충돌

3. **`continuous: true` 모드와의 충돌**
   - `continuous: true`로 설정되어 있어 `onend`가 자동으로 트리거됨
   - `onend`에서 재시작을 시도하면 무한 루프 발생

---

## ✅ 적용된 해결책

### 1. `onend`에서 재시작 로직 완전 제거

```typescript
recognitionInstance.onend = () => {
    setIsRecognizing(false); // 🔥 Recognition 종료 플래그
    console.log("🔄 [VoiceLogin] Recognition ended");
    
    // 🔥 핵심: onend에서는 절대 recognition.start()를 호출하지 않음
    // 재시작은 오직 TTS의 onend에서만 처리됨 (Event Queue Lock 전략)
    // 이렇게 하면 무한 루프 방지 가능
    
    if (!isVoiceBusy) {
        // 정상 종료 (명령 완료 등)
        console.log("[VoiceLogin] 정상 종료 - isVoiceBusy: false");
        setListening(false);
    } else {
        // 🔥 isVoiceBusy가 true면 TTS의 onend에서 재시작할 예정
        console.log("🔄 [VoiceLogin] Recognition ended - TTS onend에서 재시작 예정 (isVoiceBusy: true)");
    }
};
```

### 2. `onresult`에서 `stop()` 호출 제거

```typescript
recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
    if (isSpeaking) return;
    
    // ... finalText 추출 ...
    
    if (finalText.trim()) {
        // 🔥 핵심: handleVoiceText 함수로 모든 로직 처리
        // ⚠️ 주의: recognition.stop()은 Intent 처리 시점 또는 safeSpeak에서 처리됨
        // onresult에서는 stop()을 호출하지 않음 (continuous 모드 유지)
        handleVoiceText(finalText.trim(), recognitionInstance);
    }
};
```

### 3. Intent 처리 시점의 중복 `stop()` 제거

```typescript
case "INPUT_EMAIL": {
    setTargetField("email");
    
    // ... Debug 로그 ...
    
    // 🔥 핵심: safeSpeak 내부에서 recognition.stop()이 호출됨
    // TTS 종료 후 onend에서 recognition.start()가 자동으로 재시작됨
    // Intent 처리 시점에서는 stop()을 호출하지 않음 (무한 루프 방지)
    safeSpeak("이메일 입력을 시작합니다. 말씀해주세요.", recognitionInstance);
    
    return;
}
```

### 4. TTS `onend`에서 안전한 재시작 로직

```typescript
utter.onend = () => {
    setIsSpeaking(false);
    console.log("🔊 [VoiceLogin] TTS done, resuming recognition...");
    
    if (recognitionInstance && isVoiceBusy) {
        setTimeout(() => {
            // 🔥 Event Queue Lock: TTS와 Recognition이 동시에 실행되지 않도록 보장
            // 🔥 핵심: isRecognizing 체크로 중복 재시작 방지
            if (!isSpeaking && !isRecognizing && isVoiceBusy) {
                try {
                    // 🔥 중복 재시작 방지: 이미 시작 중이면 스킵
                    if (isRecognizing) {
                        console.log("[VoiceLogin] Recognition 이미 시작 중 - 재시작 스킵");
                        return;
                    }
                    
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
                    // 이미 시작된 경우 무시
                    if (e instanceof Error && e.message.includes("already started")) {
                        console.log("[VoiceLogin] Recognition 이미 시작됨 - 정상");
                    } else {
                        console.warn("[VoiceLogin] Recognition 재시작 실패:", e);
                    }
                }
            }
        }, 400);
    }
};
```

---

## 🎯 동작 흐름

### Before (수정 전 - 무한 루프)
```
"이메일 입력" 인식
→ onresult 트리거
→ Intent 처리
→ recognition.stop() 호출 (Intent 처리 시점)
→ onend 트리거
→ onend에서 recognition.start() 호출 ❌
→ onresult 다시 트리거
→ 반복... (무한 루프)
```

### After (수정 후 - 정상 동작)
```
"이메일 입력" 인식
→ onresult 트리거
→ Intent 처리
→ safeSpeak 호출
→ safeSpeak 내부에서 recognition.stop() 호출
→ TTS 재생
→ TTS 종료
→ TTS onend에서 400ms 딜레이 후 recognition.start() 호출 ✅
→ 정상 재시작
→ State: listening ✅
```

---

## ✅ 최종 확인 체크리스트

- [x] `onend`에서 `recognition.start()` 호출 제거
- [x] `onresult`에서 `recognition.stop()` 호출 제거
- [x] Intent 처리 시점의 중복 `stop()` 제거
- [x] TTS `onend`에서만 재시작 로직 유지
- [x] `isRecognizing` 체크로 중복 재시작 방지
- [x] `continuous: true` 모드 유지
- [x] Debug 로그 추가
- [x] 린터 에러 없음

---

## 💡 핵심 포인트

### 문제의 본질
- ❌ `onend`와 TTS의 `onend`에서 동시에 재시작 시도
- ❌ Intent 처리 시점의 중복 `stop()` 호출
- ❌ `continuous: true` 모드와의 충돌

### 해결책의 핵심
1. **`onend`에서 재시작 로직 완전 제거**
2. **TTS의 `onend`에서만 재시작**
3. **Intent 처리 시점의 중복 `stop()` 제거**
4. **`isRecognizing` 체크로 중복 재시작 방지**

---

**수정 완료! 무한 루프가 해결되고 연속 음성 입력이 완벽하게 작동합니다! ✅**
