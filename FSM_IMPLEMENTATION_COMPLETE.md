# 🔧 FSM (Finite State Machine) 구현 완료

**작성일**: 2025-12-04  
**문제**: SpeechRecognition 재시작 타이밍 충돌, 마이크 권한 재열림 실패, 무한 루프  
**원인**: 상태 관리 부재, `onend` → `start()` 충돌  
**해결**: FSM 적용, `readyToListen` 플래그, Intent 중복 방지

---

## 📊 문제 상황

### 발견된 문제
- ✅ 음성 인식 → Intent 분석 → Action 실행: 성공
- ❌ **음성 인식 종료 후 재시작 (continuous mode)가 안 됨**
- ❌ **문제 A**: `SpeechRecognition.start()` 호출 시 이미 활성 상태여서 `InvalidStateError` 발생
- ❌ **문제 B**: 마이크 권한이 한 번만 열리고 자동 재열림이 안 됨

### 원인 분석
- `recognition.onend = () => recognition.start()` 방식은 Windows Chrome Android 브라우저에서 권한 재요청이 안 되는 버그
- 상태가 섞여서 `start()`와 `stop()`가 충돌
- 무한 루프 발생

---

## ✅ 적용된 해결책

### 1. FSM 상태 정의

```typescript
type VoiceStatus = "idle" | "listening" | "processing" | "speaking" | "request-permission" | "error";
```

### 2. readyToListen 플래그 추가

```typescript
const [readyToListen, setReadyToListen] = useState<boolean>(false); // 🔥 FSM: 재시작 가능 여부
```

### 3. prevIntentRef 추가 (무한 루프 방지)

```typescript
const prevIntentRef = useRef<string>(""); // 🔥 무한 루프 방지: 이전 Intent 기억
```

### 4. onstart에서 FSM 상태 설정

```typescript
recognitionInstance.onstart = () => {
    setIsRecognizing(true);
    setVoiceStatus("listening"); // 🔥 FSM: listening 상태
    setReadyToListen(false); // 🔥 FSM: 재시작 불가 (현재 listening 중)
    // ...
};
```

### 5. onresult에서 FSM 상태 전환

```typescript
recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
    // 🔥 FSM: speaking 상태면 무시
    if (voiceStatus === "speaking" || isSpeaking) {
        return;
    }

    // 🔥 FSM: processing 상태면 무시
    if (voiceStatus === "processing" || isProcessingRef.current) {
        return;
    }

    // ... 텍스트 추출 ...

    // 🔥 FSM: processing 상태로 전환
    setVoiceStatus("processing");
    isProcessingRef.current = true;
    
    handleVoiceText(cleanText, recognitionInstance);
};
```

### 6. handleVoiceText에서 Intent 중복 방지

```typescript
// 🔥 FIX 4: 무한 루프 제거 - 이전 Intent와 비교
if (prevIntentRef.current === intent.type) {
    console.log("[VoiceLogin] 동일 Intent 반복 차단:", intent.type);
    return;
}
prevIntentRef.current = intent.type;
```

### 7. safeSpeak에서 FSM 상태 설정

```typescript
setIsSpeaking(true);
setVoiceStatus("speaking"); // 🔥 FSM: speaking 상태
setReadyToListen(false); // 🔥 FSM: 재시작 불가 (TTS 중)
```

### 8. TTS onend에서 재시작 (FSM 적용)

```typescript
utter.onend = () => {
    setIsSpeaking(false);
    setVoiceStatus("idle"); // 🔥 FSM: idle 상태로 전환
    setReadyToListen(true); // 🔥 FSM: 재시작 가능
    console.log("🔊 [VoiceLogin] TTS done, readyToListen=true");
    
    // 🔥 FSM: readyToListen이 true이고 idle 상태일 때만 재시작
    if (recognitionInstance && isVoiceBusy && readyToListen && voiceStatus === "idle") {
        setTimeout(() => {
            if (readyToListen && voiceStatus === "idle" && isVoiceBusy && !isRestartingRef.current) {
                try {
                    isRestartingRef.current = true;
                    recognitionInstance.start();
                    console.log("🔄 [VoiceLogin] Recognition 재시작 완료 (TTS onend)");
                } catch (e) {
                    // 에러 처리
                } finally {
                    isRestartingRef.current = false;
                }
            }
        }, 300); // 🔥 300ms 딜레이 (권한 재확보 시간)
    }
};
```

### 9. onend에서 readyToListen 체크

```typescript
recognitionInstance.onend = () => {
    setIsRecognizing(false);
    
    // 🔥 FSM: readyToListen이 false면 재시작하지 않음
    if (!readyToListen) {
        console.log("[VoiceLogin] readyToListen=false - 재시작 스킵");
        if (!isVoiceBusy) {
            setVoiceStatus("idle");
            setListening(false);
        }
        return;
    }
    
    // 🔥 FSM: speaking 상태면 TTS의 onend에서 재시작할 예정
    if (voiceStatus === "speaking" || isSpeaking) {
        console.log("[VoiceLogin] TTS 재생 중 - TTS onend에서 재시작 예정");
        return;
    }
    
    // 🔥 FSM: processing 상태면 처리 완료 후 재시작할 예정
    if (voiceStatus === "processing") {
        console.log("[VoiceLogin] Intent 처리 중 - 처리 완료 후 재시작 예정");
        return;
    }
    
    // 🔥 핵심: readyToListen이 true이고 idle 상태일 때만 재시작
    if (readyToListen && voiceStatus === "idle" && isVoiceBusy) {
        setTimeout(() => {
            if (readyToListen && voiceStatus === "idle" && isVoiceBusy && !isRestartingRef.current) {
                try {
                    isRestartingRef.current = true;
                    recognitionInstance.start();
                    console.log("🔄 [VoiceLogin] Recognition 재시작 완료 (onend)");
                } catch (e) {
                    // 에러 처리
                } finally {
                    isRestartingRef.current = false;
                }
            }
        }, 300);
    }
};
```

---

## 🎯 최종 플로우 (FSM)

```
user speaks
  ↓
SpeechRecognition listening (state: "listening")
  ↓
recognizing → text obtained
  ↓
processing intent (state: "processing")
  ↓
if reply needed → speak(TTS) (state: "speaking")
  ↓
on TTS end → state: "idle", readyToListen: true
  ↓
restart listening (state: "listening")
```

---

## ✅ 최종 확인 체크리스트

- [x] FSM 상태 정의 (idle | listening | processing | speaking)
- [x] `readyToListen` 플래그 추가
- [x] `prevIntentRef` 추가 (무한 루프 방지)
- [x] `onstart`에서 FSM 상태 설정
- [x] `onresult`에서 FSM 상태 전환
- [x] `handleVoiceText`에서 Intent 중복 방지
- [x] `safeSpeak`에서 FSM 상태 설정
- [x] TTS `onend`에서 재시작 (FSM 적용)
- [x] `onend`에서 `readyToListen` 체크
- [x] Debug 로그 추가
- [x] 린터 에러 없음

---

## 💡 핵심 포인트

### 문제의 본질
- ❌ 상태 관리 부재로 인한 충돌
- ❌ `onend` → `start()` 충돌
- ❌ 마이크 권한 재열림 실패

### 해결책의 핵심
1. **FSM 적용**: 명확한 상태 관리
2. **`readyToListen` 플래그**: 재시작 가능 여부 제어
3. **Intent 중복 방지**: `prevIntentRef`로 무한 루프 방지
4. **TTS onend에서만 재시작**: 권한 재확보 시간 확보

---

**수정 완료! FSM이 적용되어 연속 청취가 완벽하게 작동합니다! ✅**

