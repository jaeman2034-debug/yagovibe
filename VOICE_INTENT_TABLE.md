# 🎯 Voice Intent Table (확정)

**작성일**: 2025-12-04  
**목적**: 음성 명령 → Intent → Action 매핑 테이블

---

## 📋 Intent Table

| Intent Name | Trigger Voice | Action | Debug Log |
|-------------|---------------|--------|-----------|
| `INPUT_EMAIL` | "이메일", "메일 주소" | `setTargetField("email")` → `setEmail(value)` | ✅ |
| `INPUT_PASSWORD` | "비밀번호", "패스워드" | `setTargetField("password")` → `setPassword(value)` | ✅ |
| `CLICK_LOGIN` | "로그인", "로그인 해줘", "로그인 버튼" | `handleLogin()` | ✅ |
| `DISALLOWED` | "구글 로그인" | `alert & block` | ✅ |
| `IGNORE` | "로그인 완료" | `none` (무시) | ✅ |
| `CANCEL` | "취소" | `stop listening` | 🔜 |
| `HELP` | "도움말", "메뉴" | `TTS 설명` | 🔜 |

---

## 🔍 Intent 처리 흐름

### 1. INPUT_EMAIL
```
음성: "이메일"
→ Intent: INPUT_EMAIL
→ Action: setTargetField("email")
→ State: listening
→ 다음: 사용자가 이메일 주소 말함
→ Action: setEmail(processedText)
```

### 2. INPUT_PASSWORD
```
음성: "비밀번호"
→ Intent: INPUT_PASSWORD
→ Action: setTargetField("password")
→ State: listening
→ 다음: 사용자가 비밀번호 말함
→ Action: setPassword(processedPassword)
```

### 3. CLICK_LOGIN
```
음성: "로그인"
→ Intent: CLICK_LOGIN
→ Action: handleLogin()
→ TTS: "로그인 시도할게요!"
→ Firebase 로그인 실행
```

### 4. DISALLOWED
```
음성: "구글 로그인"
→ Intent: DISALLOWED
→ Action: block
→ TTS: "구글 로그인을 음성으로 지원하지 않아요..."
```

### 5. IGNORE
```
음성: "로그인 완료"
→ Intent: IGNORE
→ Action: none
→ 무시됨
```

---

## 🧪 테스트 시나리오

| 당신의 말 | Intent | Action | 결과 |
|-----------|--------|--------|------|
| "이메일" | `INPUT_EMAIL` | `setTargetField("email")` | 이메일 입력 모드 시작 |
| "test@example.com" | `INPUT_EMAIL` | `setEmail("test@example.com")` | 이메일 필드에 입력됨 |
| "비밀번호" | `INPUT_PASSWORD` | `setTargetField("password")` | 비밀번호 입력 모드 시작 |
| "1234" | `INPUT_PASSWORD` | `setPassword("1234")` | 비밀번호 필드에 입력됨 |
| "로그인" | `CLICK_LOGIN` | `handleLogin()` | Firebase 로그인 실행 |
| "구글 로그인" | `DISALLOWED` | `block` | 차단됨 |
| "로그인 완료" | `IGNORE` | `none` | 무시됨 |

---

## 📊 Debug Monitor에서 확인 가능한 정보

각 Intent 처리 시 다음 정보가 Debug Monitor에 표시됩니다:

- 🎤 **Recognized**: 인식된 음성 텍스트
- 📌 **Intent**: 매칭된 Intent 이름
- ⚙️ **Action**: 실행된 액션
- 🔄 **State**: 현재 상태
- 🔊 **TTS**: 재생된 TTS 메시지
- ❌ **Error**: 에러 발생 시

---

**Intent Table 확정 완료! ✅**

