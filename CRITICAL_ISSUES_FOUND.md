# 🚨 발견된 치명적 문제 및 해결 방법

## 📊 이미지에서 확인된 문제

### **문제 1: 포트 5173이 이미 사용 중**
- **오류**: `Error: Port 5173 is already in use`
- **PID**: 24524
- **상태**: 해결 중

### **문제 2: Google API 키 HTTP 리퍼러 차단 (치명적)**
- **오류**: `403 PERMISSION_DENIED`
- **메시지**: `"Requests from referer https://yago-vibe-spt.firebaseapp.com/are blocked."`
- **원인**: `API_KEY_HTTP_REFERRER_BLOCKED`
- **API**: `identitytoolkit.googleapis.com`
- **리퍼러**: `https://yago-vibe-spt.firebaseapp.com/`

---

## 🔍 문제 2 상세 분석

### **오류 메시지:**
```json
{
  "error": {
    "code": 403,
    "message": "Requests from referer https://yago-vibe-spt.firebaseapp.com/are blocked.",
    "status": "PERMISSION_DENIED",
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        "reason": "API_KEY_HTTP_REFERRER_BLOCKED",
        "domain": "googleapis.com",
        "metadata": {
          "service": "identitytoolkit.googleapis.com",
          "httpReferrer": "https://yago-vibe-spt.firebaseapp.com/"
        }
      }
    ]
  }
}
```

### **원인:**
Google Cloud Console의 Browser Key HTTP 리퍼러 제한에 `https://yago-vibe-spt.firebaseapp.com/` (슬래시 없이 끝나는 경로)가 포함되지 않았거나, 와일드카드 패턴이 제대로 작동하지 않음.

---

## 🛠️ 해결 방법

### **1단계: 포트 5173 해제 (완료)**

기존 프로세스를 종료했습니다. 이제 새로 서버를 시작할 수 있습니다.

---

### **2단계: Google Cloud Console HTTP 리퍼러 설정 확인 및 수정 (필수)**

#### **A. Google Cloud Console 접속**
1. https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt
2. Browser Key 선택

#### **B. 웹사이트 제한사항 확인**
현재 등록된 리퍼러:
- `http://localhost:5173/*`
- `http://127.0.0.1:5173/*`
- `https://www.yagovibe.com/*`
- `https://yago-vibe-spt.firebaseapp.com/*`
- `https://yago-vibe-spt.web.app/*`
- `https://yagovibe.com/*`

#### **C. 문제 해결: 추가 리퍼러 등록**

**현재 문제:**
- `https://yago-vibe-spt.firebaseapp.com/*` (와일드카드 포함)만 등록됨
- 하지만 실제 요청은 `https://yago-vibe-spt.firebaseapp.com/` (슬래시 없이)에서 옴

**해결 방법:**
다음 리퍼러를 **추가**로 등록해야 합니다:

1. **`https://yago-vibe-spt.firebaseapp.com`** (슬래시 없이)
2. **`https://yago-vibe-spt.firebaseapp.com/`** (슬래시 포함)
3. **`https://yago-vibe-spt.firebaseapp.com/*`** (이미 등록됨, 확인)

**또는 더 안전한 방법:**
와일드카드 패턴이 제대로 작동하지 않을 수 있으므로, 다음을 모두 등록:

```
https://yago-vibe-spt.firebaseapp.com
https://yago-vibe-spt.firebaseapp.com/
https://yago-vibe-spt.firebaseapp.com/*
https://yago-vibe-spt.firebaseapp.com/__/auth/handler
https://yago-vibe-spt.firebaseapp.com/_/auth/handler
```

---

### **3단계: Firebase Console Authorized domains 확인**

1. Firebase Console → Authentication → Settings → Authorized domains
2. 다음 도메인이 모두 추가되어 있는지 확인:
   - `yago-vibe-spt.firebaseapp.com`
   - `yago-vibe-spt.web.app`
   - `localhost`

---

## 🎯 즉시 해결 체크리스트

### **Google Cloud Console:**
- [ ] Browser Key 선택
- [ ] 웹사이트 제한사항 → 다음 리퍼러 추가:
  - [ ] `https://yago-vibe-spt.firebaseapp.com` (슬래시 없이)
  - [ ] `https://yago-vibe-spt.firebaseapp.com/` (슬래시 포함)
  - [ ] `https://yago-vibe-spt.firebaseapp.com/*` (이미 있으면 확인)
- [ ] 저장 클릭
- [ ] 5-10분 대기 (설정 적용 시간)

### **Firebase Console:**
- [ ] Authentication → Settings → Authorized domains
- [ ] `yago-vibe-spt.firebaseapp.com` 추가 확인
- [ ] `yago-vibe-spt.web.app` 추가 확인
- [ ] `localhost` 추가 확인

---

## 📝 테스트 방법

### **설정 완료 후:**
1. 브라우저 캐시 삭제 (Ctrl+Shift+R)
2. `http://localhost:5173/login` 접속
3. Google 로그인 버튼 클릭
4. 콘솔에서 다음 오류가 없어야 함:
   - ❌ `403 PERMISSION_DENIED`
   - ❌ `API_KEY_HTTP_REFERRER_BLOCKED`
   - ❌ `Requests from referer https://yago-vibe-spt.firebaseapp.com/are blocked.`

---

## ✅ 예상 결과

### **설정 완료 후:**
- ✅ Google 로그인 버튼 클릭 시 오류 없음
- ✅ Firebase 인증 핸들러 정상 작동
- ✅ Google 계정 선택 화면 표시
- ✅ 로그인 성공 후 `/sports-hub`로 리디렉션

---

## 🚨 중요 참고사항

### **리퍼러 패턴 매칭:**
Google Cloud Console의 HTTP 리퍼러 제한은 다음과 같이 작동합니다:
- `https://yago-vibe-spt.firebaseapp.com/*` → `https://yago-vibe-spt.firebaseapp.com/` 매칭 안 됨 (슬래시 없이 끝나는 경로)
- `https://yago-vibe-spt.firebaseapp.com` → `https://yago-vibe-spt.firebaseapp.com/` 매칭됨
- `https://yago-vibe-spt.firebaseapp.com/` → `https://yago-vibe-spt.firebaseapp.com/` 매칭됨

**따라서 다음을 모두 등록해야 합니다:**
1. `https://yago-vibe-spt.firebaseapp.com` (슬래시 없이)
2. `https://yago-vibe-spt.firebaseapp.com/` (슬래시 포함)
3. `https://yago-vibe-spt.firebaseapp.com/*` (와일드카드)

---

## 🎯 최종 해결 방법

**Google Cloud Console → Browser Key → 웹사이트 제한사항:**

다음 리퍼러를 **모두** 등록:
```
https://yago-vibe-spt.firebaseapp.com
https://yago-vibe-spt.firebaseapp.com/
https://yago-vibe-spt.firebaseapp.com/*
```

**저장 후 5-10분 대기 → 브라우저 캐시 삭제 → 재테스트**
