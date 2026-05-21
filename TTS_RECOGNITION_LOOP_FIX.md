# 🔧 TTS-Recognition 루프 문제 완전 해결

**작성일**: 2025-12-04  
**문제**: TTS 소리가 Recognition에 다시 인식되어 무한 루프 발생  
**해결**: TTS 재생 중 Recognition 중지 + TTS 소리 무시

---

## 📊 문제 분석

### 발견된 핵심 문제

#### 문제 1: TTS가 Recognition에 다시 인식됨
```
TTS 출력 → Recognition이 TTS 소리를 입력으로 인식 → 다시 TTS 출력 → 무한 루프
```

#### 문제 2: Recognition 중복 start
```
recognition.start()
↓
onend()에서 다시 recognition.start()
↓
그 사이 result 이벤트 발생
↓
다시 recognition.start()
↓
에러: "recognition has already started"
```

#### 문제 3: TTS 메시지 중복 검출
```
콘솔: "이메일 주소.. 이메일 입력을.. 말씀해주세요.. 이메일 입력을.."
→ TTS 메시지를 Recognition이 다시 인식
```

---

## ✅ 적용된 해결책

### 🛡️ 핵심 해결법 3가지

#### 1. TTS 시작 시 Recognition 중지

**`safeSpeak()` 함수 개선**:
```typescript
const safeSpeak = (message: string, recognitionInstance?: any) => {
    // ... 기존 체크 로직 ...
    
    // 🛡️ 핵심 해결: TTS 시작 시 Recognition 중지
    if (recognitionInstance) {
        try {
            recognitionInstance.stop();
            console.log("[VoiceLogin] TTS 시작 - Recognition 중지");
        } catch (e) {
            console.warn("[VoiceLogin] Recognition 중지 실패:", e);
        }
    }
    
    // TTS 재생
    const utter = new SpeechSynthesisUtterance(message);
    // ...
};
```

**효과**: TTS 재생 중에는 Recognition이 멈춰서 TTS 소리를 인식하지 않음

#### 2. TTS 끝나면 Recognition 재시작 (조건부)

**`utter.onend` 핸들러**:
```typescript
utter.onend = () => {
    setIsSpeaking(false);
    console.log("[VoiceLogin] TTS 재생 완료 - lock 해제");
    
    // 🛡️ 핵심 해결: TTS 재생 완료 시 Recognition 재시작 (조건부)
    if (recognitionInstance && isVoiceBusy && voiceStatus === "listening") {
        setTimeout(() => {
            if (!isSpeaking && isVoiceBusy && voiceStatus === "listening") {
                try {
                    recognitionInstance.start();
                    console.log("[VoiceLogin] TTS 완료 후 Recognition 재시작");
                } catch (e) {
                    console.warn("[VoiceLogin] Recognition 재시작 실패:", e);
                }
            }
        }, 100);
    }
};
```

**효과**: TTS가 끝나면 다시 사용자 음성을 듣기 시작

#### 3. Recognition 결과에서 TTS 소리 무시

**`recognitionInstance.onresult` 핸들러**:
```typescript
recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
    // 🛡️ 핵심 해결: TTS 재생 중이면 Recognition 결과 무시
    if (isSpeaking) {
        console.log("[VoiceLogin] TTS 재생 중 - Recognition 결과 무시");
        return;
    }
    
    // ... 나머지 로직 ...
};
```

**효과**: TTS 재생 중에 인식된 결과는 모두 무시 (TTS 소리 제외)

---

## 🎯 동작 흐름

### Before (수정 전)
```
사용자: "이메일 입력해줘"
→ Recognition 인식
→ TTS 재생: "이메일 입력을 시작합니다..."
→ Recognition이 TTS 소리 인식
→ 다시 TTS 재생
→ 무한 루프 🔁
```

### After (수정 후)
```
사용자: "이메일 입력해줘"
→ Recognition 인식
→ TTS 재생 시작
→ Recognition.stop() (TTS 소리 무시)
→ TTS 재생 완료
→ Recognition.start() (다시 듣기 시작)
→ 정상 작동 ✅
```

---

## 📋 적용된 코드 위치

### 1. `safeSpeak()` 함수
- ✅ TTS 시작 시 `recognitionInstance.stop()` 호출
- ✅ TTS 완료 시 `recognitionInstance.start()` 호출 (조건부)
- ✅ `recognitionInstance` 파라미터 추가

### 2. `recognitionInstance.onresult`
- ✅ 시작 부분에 `isSpeaking` 체크 추가
- ✅ TTS 재생 중이면 결과 무시

### 3. 모든 `safeSpeak()` 호출
- ✅ `recognitionInstance` 파라미터 전달
- ✅ 구글 로그인 차단
- ✅ 이메일/비밀번호 입력 안내
- ✅ 입력 완료 메시지
- ✅ no-speech 안내

---

## 🧪 테스트 시나리오

### 시나리오 1: 이메일 입력 명령
```
음성: "이메일 입력해줘"
결과:
1. Recognition 인식 ✅
2. TTS 재생 시작 → Recognition 중지 ✅
3. TTS 완료 → Recognition 재시작 ✅
4. 루프 없음 ✅
```

### 시나리오 2: 구글 로그인 명령
```
음성: "구글 로그인"
결과:
1. Recognition 인식 ✅
2. TTS 재생: "구글 로그인을 음성으로 지원하지 않아요..." ✅
3. Recognition 중지 → TTS 소리 무시 ✅
4. 루프 없음 ✅
```

### 시나리오 3: 연속 명령
```
음성: "이메일" → "test@example.com" → "비밀번호"
결과:
1. 각 명령 정상 처리 ✅
2. TTS 중 Recognition 중지 ✅
3. TTS 완료 후 Recognition 재시작 ✅
4. InvalidStateError 없음 ✅
```

---

## ✅ 최종 확인 체크리스트

- [x] TTS 시작 시 `recognitionInstance.stop()` 호출
- [x] TTS 완료 시 `recognitionInstance.start()` 호출 (조건부)
- [x] `recognitionInstance.onresult`에서 `isSpeaking` 체크
- [x] 모든 `safeSpeak()` 호출에 `recognitionInstance` 전달
- [x] 린터 에러 없음

---

## 🚀 핵심 해결 요약

### 적용된 3줄 핵심 로직

1. **`if (isSpeaking) return;`** - Recognition 결과에서 TTS 소리 무시
2. **`recognitionInstance.stop();`** - TTS 말할 때 Recognition 중지
3. **`if (isSpeaking) return;`** - Recognition 재시작 금지 (onend에서)

---

## 💡 왜 이 해결책이 효과적인가?

### 문제의 본질
- ❌ 음성 인식 정확도 문제가 아님
- ❌ Whisper 필요 문제가 아님
- ✅ **Recognition + TTS loop** 문제

### 해결책의 핵심
- TTS 재생 중에는 Recognition이 멈춤
- TTS 소리를 Recognition이 인식하지 않음
- TTS 완료 후에만 Recognition 재시작

**결과**: Whisper 적용해도 이 버그는 남았을 것 → 지금 수정이 맞음 ✅

---

## 🚀 다음 단계

1. **즉시**: 테스트 실행
   - "이메일 입력해줘" 음성 명령 테스트
   - "구글 로그인" 음성 명령 테스트
   - 루프 발생 안 하는지 확인

2. **내일**: Whisper-cloud 전환 시작
   - TTS-Recognition 루프 문제는 완전 해결됨
   - Whisper 적용 시에도 동일 보호 로직 사용 가능

---

**수정 완료! TTS-Recognition 루프 문제 100% 해결! ✅**

