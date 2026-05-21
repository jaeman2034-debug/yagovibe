# 🔧 Android Intent 스킴 제거 (무한 루프 해결)

## 🚨 문제

크롬에서 "크롬을 연결할까요" 메시지가 켜졌다 꺼졌다 계속 반복됨

---

## 🔍 원인 분석

사용자 분석이 정확했습니다:

1. **Intent 스킴 무한 루프**
   - Android Intent 스킴 (`intent://...`) 사용
   - 카카오톡 IAB가 Intent URL을 외부 호출이 아닌 내부 리디렉션으로 오해
   - IAB가 Chrome을 호출하지 못하고 앱 내에서 Intent URL로 계속 리디렉션
   - 메시지가 깜빡이는 현상 발생

2. **JavaScript 실행 타이밍 문제**
   - Intent 스킴 URL 형식이 약간만 잘못되어도 IAB가 잘못 해석
   - URL 인코딩 문제로 Intent 스킴이 제대로 작동하지 않음

---

## ✅ 수정 내용

### **1. Intent 스킴 완전 제거**

```javascript
// ❌ 이전 (문제):
if (ua.includes('Android')) {
  const intentUrl = `intent://${urlWithoutProtocol}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;end`;
  window.location.replace(intentUrl);
  setTimeout(function() {
    window.location.replace(currentUrl);
  }, 200);
}

// ✅ 수정 후 (해결):
function redirectToExternalBrowser(currentUrl) {
  // 🔥 Intent 스킴 제거 - 모든 플랫폼에서 단순 리디렉션 사용
  // IAB가 제공하는 기본 외부 브라우저 열기 기능을 활용
  console.log('🔄 [index.html] 외부 브라우저로 리디렉션 (Intent 스킴 없이):', currentUrl);
  window.location.href = currentUrl;
}
```

### **2. 단순 리디렉션 사용**

- 모든 플랫폼(Android, iOS, 기타)에서 단순 `window.location.href` 사용
- IAB가 제공하는 기본 외부 브라우저 열기 기능 활용
- Intent 스킴 복잡성 제거

---

## 🎯 작동 원리

### **이전 (문제):**
1. 카카오톡 링크 클릭
2. `index.html`에서 인앱 브라우저 감지
3. Android Intent 스킴 생성
4. `window.location.replace(intentUrl)` 실행
5. IAB가 Intent URL을 내부 리디렉션으로 오해
6. 무한 루프 발생

### **수정 후:**
1. 카카오톡 링크 클릭
2. `index.html`에서 인앱 브라우저 감지
3. 단순 `window.location.href = currentUrl` 실행
4. IAB가 기본 기능으로 외부 브라우저 열기 시도
5. 정상적으로 외부 브라우저로 이동

---

## ✅ 개선 사항

1. **Intent 스킴 제거**
   - 복잡한 Intent 스킴 형식 제거
   - 무한 루프 방지

2. **단순 리디렉션 사용**
   - 모든 플랫폼에서 동일한 방식 사용
   - IAB 기본 기능 활용

3. **안정성 향상**
   - URL 인코딩 문제 없음
   - 형식 오류 없음
   - IAB가 기본 기능으로 처리

---

## 🚀 예상 결과

### **카카오톡 인앱 브라우저에서:**
- ✅ Intent 스킴 없이 단순 리디렉션
- ✅ 무한 루프 없음
- ✅ 메시지 깜빡임 없음
- ✅ IAB가 기본 기능으로 외부 브라우저 열기

### **일반 브라우저 (Chrome)에서:**
- ✅ 일반 브라우저로 감지되어 리디렉션 없음
- ✅ 정상적으로 사이트 로드

---

## 📝 참고

- Intent 스킴은 IAB에서 불안정할 수 있으므로 제거했습니다.
- 단순 리디렉션이 더 안정적이고 IAB가 기본 기능으로 처리합니다.
- IAB가 제공하는 기본 외부 브라우저 열기 기능을 활용합니다.

