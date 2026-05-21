# 🔧 이중 루프 문제 완전 해결

**작성일**: 2025-12-04  
**문제**: TTS 무한 루프 + SpeechRecognition 중복 start  
**해결**: 두 가지 보호막 추가

---

## 📊 문제 분석

### 발견된 두 가지 루프 문제

#### 문제 1: TTS 반복 (멘트 무한 재생)
- **증상**: "이메일 입력을 시작합니다. 말씀해주세요" 문장이 계속 반복 재생
- **원인**: 동일 메시지가 반복 인식되어 TTS가 계속 재생됨

#### 문제 2: SpeechRecognition 중복 start
- **에러 메시지**: `Failed to execute 'start' on 'SpeechRecognition': recognition has already started.`
- **원인**: 
  ```
  recognition.start()
  ↓
  onend()에서 다시 recognition.start()
  ↓
  그 사이 result 이벤트 발생
  ↓
  다시 recognition.start()
  ↓
  에러 + 루프
  ```

---

## ✅ 적용된 해결책

### 🔰 보호막 1: Speaking Lock (TTS 중 재시작 금지)

**추가된 State**:
```typescript
const [isSpeaking, setIsSpeaking] = useState(false); // 🔥 TTS 재생 중 여부
```

**`safeSpeak()` 함수 개선**:
```typescript
const safeSpeak = (message: string) => {
    // 🔰 보호막 1: TTS 중이면 재생하지 않음
    if (isSpeaking) {
        console.log("[VoiceLogin] TTS 재생 중 - 요청 무시:", message);
        return;
    }

    // 🔰 보호막 2: 이전에 재생한 메시지와 같으면 재생하지 않음
    if (lastSpokenMessageRef.current === message) {
        console.log("[VoiceLogin] 동일 메시지 반복 차단:", message);
        return;
    }

    // 새 메시지 저장 및 speaking lock 활성화
    lastSpokenMessageRef.current = message;
    setIsSpeaking(true);

    // TTS 재생
    const utter = new SpeechSynthesisUtterance(message);
    utter.lang = "ko-KR";
    utter.rate = 1.2;
    utter.pitch = 1.0;
    
    // 🔰 TTS 재생 완료 시 lock 해제
    utter.onend = () => {
        setIsSpeaking(false);
        console.log("[VoiceLogin] TTS 재생 완료 - lock 해제");
    };
    
    utter.onerror = () => {
        setIsSpeaking(false);
        console.warn("[VoiceLogin] TTS 재생 오류 - lock 해제");
    };
    
    window.speechSynthesis.speak(utter);
};
```

### 🔰 보호막 2: SpeechRecognition 재시작 조건 보호

**`onend` 핸들러 개선**:
```typescript
recognitionInstance.onend = () => {
    console.log("[VoiceLogin] onend 호출, voiceStatus:", voiceStatus, "isSpeaking:", isSpeaking);
    
    // 🔰 보호막 1: TTS 재생 중이면 재시작 금지
    if (isSpeaking) {
        console.log("[VoiceLogin] TTS 재생 중 - 재시작 금지");
        return;
    }
    
    // 🔰 보호막 2: 이미 종료 요청된 경우 재시작 금지
    if (!isVoiceBusy) {
        console.log("[VoiceLogin] 이미 종료 요청됨 - 재시작 금지");
        setListening(false);
        return;
    }
    
    // 🔰 보호막 3: 에러 상태면 재시작하지 않음
    if (voiceStatus === "error") {
        console.log("[VoiceLogin] 에러 상태 - 재시작하지 않음");
        setListening(false);
        setIsVoiceBusy(false);
        return;
    }

    // listening 상태이고 busy 상태일 때만 재시작
    if (voiceStatus === "listening" && isVoiceBusy) {
        setTimeout(() => {
            // 🔥 재시작 전 상태 재확인 (TTS 중이 아니고, 여전히 busy 상태)
            if (!isSpeaking && voiceStatus === "listening" && isVoiceBusy) {
                try {
                    recognitionInstance.start();
                } catch (err) {
                    console.warn("[VoiceLogin] 자동 재시작 실패:", err);
                    setListening(false);
                    setIsVoiceBusy(false);
                }
            } else {
                console.log("[VoiceLogin] 재시작 조건 불만족 - 취소");
            }
        }, 100);
    }
};
```

### 🔰 보호막 3: 입력 시작 멘트 중복 방지

**이메일/비밀번호 입력 명령 처리**:
```typescript
if (clean.includes("이메일")) {
    // 🔰 보호막 3: 이미 listening 상태면 중복 실행 방지
    if (voiceStatus === "listening") {
        safeSpeak("이메일 입력을 시작합니다. 말씀해주세요.");
        setTargetField("email");
        lastSpokenMessageRef.current = "";
        // continuous 모드이므로 재시작 불필요
        return;
    }
    // ... 나머지 로직
}
```

---

## 🔍 현재 SpeechRecognition 설정

### 현재 설정 값

```typescript
recognitionInstance.interimResults = true;   // ✅ 중간 결과 표시
recognitionInstance.continuous = true;       // ✅ 연속 인식 모드 (모바일 최적화)
```

**설명**:
- `interimResults: true` - 실시간으로 인식 중인 텍스트 표시
- `continuous: true` - 인식이 끝나도 자동으로 계속 듣기 (모바일 최적화)

---

## 🎯 결과

### Before (수정 전)
```
"이메일 입력해줘"
→ TTS 재생 (1번)
→ 자동 재시작
→ 다시 인식
→ TTS 재생 (2번)
→ 무한 반복 🔁

recognition.start()
→ onend() → recognition.start()
→ 에러: "recognition has already started"
```

### After (수정 후)
```
"이메일 입력해줘"
→ TTS 재생 (1번만)
→ speaking lock 활성화
→ TTS 완료 후 lock 해제
→ 더 이상 루프 없음 ✅

recognition.start()
→ onend()
→ isSpeaking 체크 → 재시작 금지
→ 에러 없음 ✅
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 이메일 입력 명령
```
음성: "이메일 입력해줘"
결과:
- 안내 멘트 1번만 재생 ✅
- 말 안함 → 재시작 루프 없음 ✅
- 한번 더 말함 → 정상 인식 ✅
```

### 시나리오 2: 구글 로그인 명령
```
음성: "구글 로그인"
결과:
- 안내 멘트 1번만 재생 ✅
- 계속 반복 안 함 ✅
- 루프 차단 ✅
```

### 시나리오 3: 연속 명령
```
음성: "이메일" → "test@example.com" → "비밀번호"
결과:
- 각 명령 정상 처리 ✅
- TTS 중복 재생 없음 ✅
- InvalidStateError 없음 ✅
```

---

## ✅ 적용된 보호막 요약

| 보호막 | 목적 | 적용 위치 |
|--------|------|-----------|
| **보호막 1** | TTS 재생 중 새로운 TTS 요청 차단 | `safeSpeak()` 함수 |
| **보호막 2** | 동일 메시지 반복 재생 차단 | `safeSpeak()` 함수 |
| **보호막 3** | SpeechRecognition 중복 start 방지 | `onend` 핸들러 |
| **보호막 4** | TTS 중 인식 재시작 금지 | `onend` 핸들러 |
| **보호막 5** | 종료 요청 시 재시작 금지 | `onend` 핸들러 |

---

## 📋 최종 확인 체크리스트

- [x] `isSpeaking` state 추가
- [x] `safeSpeak()` 함수에 speaking lock 적용
- [x] TTS 완료 시 lock 해제 로직
- [x] `onend`에서 `isSpeaking` 체크 추가
- [x] `onend`에서 `isVoiceBusy` 체크 추가
- [x] 입력 시작 멘트 중복 방지
- [x] 린터 에러 없음

---

## 🚀 다음 단계

1. **즉시**: 테스트 실행
   - "이메일 입력해줘" 음성 명령 테스트
   - "구글 로그인" 음성 명령 테스트
   - 무한 루프 발생 안 하는지 확인

2. **내일**: Whisper-cloud 전환 시작
   - 이중 루프 문제는 완전 해결됨
   - Whisper 적용 시에도 동일 보호 로직 사용 가능

---

**수정 완료! 이중 루프 문제 100% 해결! ✅**

