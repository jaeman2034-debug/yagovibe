# 🔍 Google Cloud Console API 키 설정 분석

## 📊 현재 설정 상태

### **웹사이트 제한사항 (현재 등록된 리퍼러):**
- ✅ `http://localhost:5173/*`
- ✅ `https://www.yagovibe.com/*`
- ✅ `https://yago-vibe-spt.web.app/*`
- ✅ `https://yagovibe.com/*`

### **API 제한사항:**
- ✅ "키 제한 안함" 선택됨 (모든 API 호출 가능)

---

## ❌ 발견된 문제

### **치명적 문제: Firebase 도메인 누락**

**누락된 리퍼러:**
- ❌ `https://yago-vibe-spt.firebaseapp.com` (슬래시 없이)
- ❌ `https://yago-vibe-spt.firebaseapp.com/` (슬래시 포함) ← **이것이 오류의 직접적인 원인**
- ❌ `https://yago-vibe-spt.firebaseapp.com/*` (와일드카드)

**오류 메시지:**
```
"Requests from referer https://yago-vibe-spt.firebaseapp.com/ are blocked."
"reason": "API_KEY_HTTP_REFERRER_BLOCKED"
```

**원인:**
- Firebase 인증 핸들러가 `https://yago-vibe-spt.firebaseapp.com/`에서 요청을 보냄
- 하지만 이 도메인이 리퍼러 목록에 없어서 차단됨

---

## 🛠️ 해결 방법

### **즉시 추가해야 할 리퍼러:**

Google Cloud Console → Browser Key → 웹사이트 제한사항:

**"+ Add" 버튼 클릭 후 다음 리퍼러 추가:**

1. `https://yago-vibe-spt.firebaseapp.com` (슬래시 없이)
2. `https://yago-vibe-spt.firebaseapp.com/` (슬래시 포함) ← **최우선**
3. `https://yago-vibe-spt.firebaseapp.com/*` (와일드카드)

**추가 후:**
- 저장 버튼 클릭
- 5-10분 대기 (설정 적용 시간)
- 브라우저 캐시 삭제 (Ctrl+Shift+R)
- 재테스트

---

## 📋 최종 리퍼러 목록 (추가 후)

다음 리퍼러가 **모두** 등록되어 있어야 합니다:

```
http://localhost:5173/*
http://127.0.0.1:5173/*                    ← 추가 권장
https://www.yagovibe.com/*
https://yago-vibe-spt.firebaseapp.com      ← 추가 필요
https://yago-vibe-spt.firebaseapp.com/     ← 추가 필요 (최우선)
https://yago-vibe-spt.firebaseapp.com/*   ← 추가 필요
https://yago-vibe-spt.web.app/*
https://yagovibe.com/*
```

---

## 🎯 우선순위

### **최우선 추가:**
1. ✅ `https://yago-vibe-spt.firebaseapp.com/` (슬래시 포함) ← **이것이 오류의 직접적인 원인**

### **추가 권장:**
2. ✅ `https://yago-vibe-spt.firebaseapp.com` (슬래시 없이)
3. ✅ `https://yago-vibe-spt.firebaseapp.com/*` (와일드카드)
4. ✅ `http://127.0.0.1:5173/*` (localhost 대체)

---

## ✅ 해결 확인 방법

### **추가 후 확인:**
1. Google Cloud Console에서 리퍼러 목록 확인
2. 다음이 모두 포함되어 있는지 확인:
   - `https://yago-vibe-spt.firebaseapp.com`
   - `https://yago-vibe-spt.firebaseapp.com/`
   - `https://yago-vibe-spt.firebaseapp.com/*`

3. 저장 후 5-10분 대기
4. 브라우저 캐시 삭제
5. `http://localhost:5173/login` 접속
6. Google 로그인 버튼 클릭
7. 콘솔에서 오류 해결 확인

---

## 🚨 현재 상태

### **문제:**
- ❌ `https://yago-vibe-spt.firebaseapp.com` 관련 리퍼러 **모두 누락**
- ❌ 이것이 `403 PERMISSION_DENIED` 오류의 직접적인 원인

### **해결:**
- [ ] `https://yago-vibe-spt.firebaseapp.com/` 리퍼러 추가 (최우선)
- [ ] `https://yago-vibe-spt.firebaseapp.com` 리퍼러 추가
- [ ] `https://yago-vibe-spt.firebaseapp.com/*` 리퍼러 추가
- [ ] 저장 및 5-10분 대기
- [ ] 브라우저 캐시 삭제
- [ ] 재테스트

---

## 💡 참고사항

### **리퍼러 패턴 매칭:**
Google Cloud Console의 HTTP 리퍼러 제한은 **정확히 일치**해야 합니다:
- `https://yago-vibe-spt.firebaseapp.com/*` → `https://yago-vibe-spt.firebaseapp.com/` 매칭 안 됨
- `https://yago-vibe-spt.firebaseapp.com/` → `https://yago-vibe-spt.firebaseapp.com/` 매칭됨 ✅
- `https://yago-vibe-spt.firebaseapp.com` → `https://yago-vibe-spt.firebaseapp.com/` 매칭됨 ✅

**따라서 다음을 모두 등록해야 합니다:**
1. `https://yago-vibe-spt.firebaseapp.com` (슬래시 없이)
2. `https://yago-vibe-spt.firebaseapp.com/` (슬래시 포함) ← **필수**
3. `https://yago-vibe-spt.firebaseapp.com/*` (와일드카드)

---

## 🎯 결론

**문제가 있습니다!**

`https://yago-vibe-spt.firebaseapp.com` 관련 리퍼러가 **모두 누락**되어 있습니다.

**즉시 추가해야 합니다:**
1. `https://yago-vibe-spt.firebaseapp.com/` (슬래시 포함) ← **최우선**
2. `https://yago-vibe-spt.firebaseapp.com` (슬래시 없이)
3. `https://yago-vibe-spt.firebaseapp.com/*` (와일드카드)

**추가 후 저장하고 5-10분 대기한 다음 재테스트하세요!**

