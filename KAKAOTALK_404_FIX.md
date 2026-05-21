# 🚨 카카오톡 링크 접근 시 404 오류 해결

## 📊 문제 분석

### **현재 상황:**
- 카카오톡에서 주소 링크로 연결 시 "페이지를 찾을 수 없습니다" (404) 오류 발생
- `spt.web.app`에서 `NoMatch` 컴포넌트가 표시됨

### **원인 분석:**

#### **1. 라우팅 문제 (가능성 높음)**
- 카카오톡에서 특정 경로로 접근했을 때 해당 경로가 라우팅에 없음
- 예: 카카오톡 링크가 `/some-path`로 설정되어 있지만 라우팅에 없음

#### **2. 인앱 브라우저 차단 로직 미작동 (가능성 중간)**
- `LoginPage`의 인앱 브라우저 차단 로직이 작동하지 않음
- 라우팅이 실패해서 `LoginPage`가 렌더링되기 전에 404 발생

#### **3. Firebase Hosting 설정 문제 (가능성 낮음)**
- Firebase Hosting의 리다이렉션 설정이 잘못됨
- 모든 경로를 `index.html`로 리다이렉션하지 않음

---

## 🛠️ 해결 방법

### **방법 1: 라우팅 개선 (최우선)**

카카오톡에서 접근할 수 있는 모든 경로를 라우팅에 추가:

1. **루트 경로 (`/`) 처리**
   - 루트 경로는 이미 `/sports-hub`로 리다이렉션됨
   - 하지만 인앱 브라우저에서는 차단 UI를 먼저 표시해야 함

2. **인앱 브라우저 감지 우선 처리**
   - 라우팅 전에 인앱 브라우저를 감지하고 차단 UI 표시
   - `App.tsx`에서 인앱 브라우저 감지 로직 추가

---

### **방법 2: Firebase Hosting 설정 확인**

Firebase Hosting의 `firebase.json`에서 모든 경로를 `index.html`로 리다이렉션하는지 확인:

```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

---

### **방법 3: 인앱 브라우저 차단 로직 강화**

`App.tsx`에서 인앱 브라우저를 감지하고 차단 UI를 먼저 표시:

```typescript
// App.tsx
function AppContent() {
  const { type: inAppBrowserType, isInApp } = useInAppBrowser();
  
  // 🔥 인앱 브라우저 감지 시 차단 UI 먼저 표시
  if (isInApp && inAppBrowserType !== 'none') {
    return <InAppBrowserBlocker type={inAppBrowserType} />;
  }
  
  // 나머지 라우팅 로직...
}
```

---

## 📋 구현 계획

### **1단계: Firebase Hosting 설정 확인**

`firebase.json` 파일 확인 및 수정:

```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

---

### **2단계: App.tsx에 인앱 브라우저 차단 로직 추가**

라우팅 전에 인앱 브라우저를 감지하고 차단 UI 표시:

```typescript
// App.tsx
import { useInAppBrowser } from "@/hooks/useInAppBrowser";
import InAppBrowserBlocker from "@/components/InAppBrowserBlocker";

function AppContent() {
  const { type: inAppBrowserType, isInApp } = useInAppBrowser();
  
  // 🔥 인앱 브라우저 감지 시 차단 UI 먼저 표시 (라우팅 전)
  if (isInApp && inAppBrowserType !== 'none') {
    return <InAppBrowserBlocker type={inAppBrowserType} />;
  }
  
  // 나머지 라우팅 로직...
}
```

---

### **3단계: NoMatch 컴포넌트 개선**

404 페이지에서도 인앱 브라우저를 감지하고 차단 UI 표시:

```typescript
// NoMatch.tsx
export default function NoMatch() {
  const { type: inAppBrowserType, isInApp } = useInAppBrowser();
  
  // 🔥 인앱 브라우저 감지 시 차단 UI 표시
  if (isInApp && inAppBrowserType !== 'none') {
    return <InAppBrowserBlocker type={inAppBrowserType} />;
  }
  
  // 기존 404 UI...
}
```

---

## ✅ 예상 결과

### **수정 후:**
- ✅ 카카오톡에서 링크 접근 시 인앱 브라우저 차단 UI 표시
- ✅ 404 오류 대신 외부 브라우저로 열기 안내
- ✅ 사용자 경험 개선

---

## 🎯 우선순위

1. **최우선**: Firebase Hosting 설정 확인 (`firebase.json`)
2. **중간**: `App.tsx`에 인앱 브라우저 차단 로직 추가
3. **저장**: `NoMatch` 컴포넌트 개선

---

## 💡 추가 고려사항

### **1. Firebase Hosting 리다이렉션**
- 모든 경로를 `index.html`로 리다이렉션해야 SPA가 정상 작동
- `rewrites` 설정이 없으면 404 발생

### **2. 인앱 브라우저 감지 타이밍**
- 라우팅 전에 인앱 브라우저를 감지해야 함
- `App.tsx`에서 먼저 처리하는 것이 가장 안전

### **3. 사용자 경험**
- 404 오류 대신 인앱 브라우저 차단 UI를 표시하는 것이 더 나은 UX
- 외부 브라우저로 열기 안내 제공

---

## 🚀 다음 단계

1. **Firebase Hosting 설정 확인**: `firebase.json` 파일 확인
2. **코드 수정**: `App.tsx`에 인앱 브라우저 차단 로직 추가
3. **테스트**: 카카오톡에서 링크 접근 테스트
4. **검증**: 인앱 브라우저 차단 UI 표시 확인

---

## ✅ 결론

**카카오톡 링크 접근 시 404 오류의 주요 원인:**

1. **라우팅 문제**: 특정 경로가 라우팅에 없음
2. **인앱 브라우저 차단 로직 미작동**: 라우팅 전에 인앱 브라우저를 감지하지 않음
3. **Firebase Hosting 설정 문제**: 모든 경로를 `index.html`로 리다이렉션하지 않음

**해결 방법:**
1. Firebase Hosting 설정 확인 (`firebase.json`)
2. `App.tsx`에 인앱 브라우저 차단 로직 추가
3. `NoMatch` 컴포넌트 개선

**예상 결과:**
- ✅ 카카오톡에서 링크 접근 시 인앱 브라우저 차단 UI 표시
- ✅ 404 오류 대신 외부 브라우저로 열기 안내
- ✅ 사용자 경험 개선

