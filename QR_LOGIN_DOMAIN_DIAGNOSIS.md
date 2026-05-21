# 🔍 QR 로그인 도메인 연결 문제 진단 가이드

## ✅ 코드 레벨 확인 완료

### 1. Firebase Hosting 설정 ✅ **정상**

**파일:** `firebase.json`

```json
{
  "rewrites": [
    {
      "source": "**",
      "destination": "/index.html"
    }
  ]
}
```

**결과:** ✅ **정상**
- SPA 라우팅을 위한 표준 설정
- 쿼리 스트링(`?sessionId=xxx`)을 보존해야 함
- 코드 레벨에서는 문제 없음

---

### 2. React Router 설정 ✅ **정상**

**파일:** `src/App.tsx:713`

```tsx
<Route path="/qr-login" element={<PublicRoute><QRPhoneLoginPage /></PublicRoute>} />
```

**결과:** ✅ **정상**
- `/qr-login` 라우트 올바르게 설정됨
- `PublicRoute`로 인증 없이 접근 가능

---

### 3. QR URL 생성 ✅ **정상**

**파일:** `src/lib/qrPhoneLogin.ts`

```typescript
const baseUrl = import.meta.env.VITE_APP_BASE_URL || "https://yagovibe.com";
return `${baseUrl}/qr-login?sessionId=${sessionId}`;
```

**결과:** ✅ **정상**
- `yagovibe.com`으로 고정됨
- 쿼리 스트링 포함

---

## 🔴 문제 원인 추정 (인프라 레벨)

코드 레벨에서는 문제가 없으므로, **인프라/도메인 레벨에서 문제가 발생**하고 있습니다.

### 가장 유력한 원인 (90%)

**`yagovibe.com` → 실제 앱(`/`)으로 리다이렉트는 되지만, 쿼리 스트링(`/qr-login?sessionId=xxx`)이 보존되지 않음**

---

## 🔍 즉시 확인해야 할 사항

### Step 1: PC 브라우저 직접 테스트 (가장 중요)

**주소창에 직접 입력:**
```
https://yagovibe.com/qr-login?sessionId=test123
```

**결과 확인:**

| 결과 | 판정 | 다음 액션 |
|------|------|----------|
| ✅ 전화번호 로그인 화면 표시 | 정상 | 다른 원인 확인 |
| ❌ 홈/지도 화면으로 튐 | 🔥 **이게 원인** | 아래 Step 2-4 확인 |

---

### Step 2: Firebase Hosting Custom Domain 확인

**Firebase Console → Hosting → Custom domains**

확인 사항:
- [ ] `yagovibe.com` → **Connected** ✅
- [ ] `www.yagovibe.com` → **Connected** ✅
- [ ] SSL 인증서 → **Active** ✅

**하나라도 Pending이면 → QR 테스트 무의미**

---

### Step 3: Cloudflare 설정 확인 (사용 중인 경우)

**Cloudflare Dashboard → DNS → Records**

확인 사항:

| 항목 | 권장 설정 | 문제 설정 |
|------|----------|----------|
| Proxy status | **DNS only (회색 구름)** | ❌ Proxied (주황 구름) |
| Always Use HTTPS | ❌ OFF | ⚠️ ON (쿼리 스트링 날릴 수 있음) |
| Automatic Redirects | ❌ OFF | ⚠️ ON |
| Page Rules | ❌ query strip 없음 | ⚠️ query strip 있음 |

**주황 구름(Proxied)이면:**
- Cloudflare가 URL rewrite 하면서 쿼리 스트링을 날릴 수 있음
- **DNS only (회색 구름)**으로 변경 필요

---

### Step 4: Firebase Hosting Redirect 확인

**`firebase.json`에 redirect 절대 있으면 안 됨**

❌ 이런 설정이 있으면 바로 문제:

```json
"redirects": [
  {
    "source": "/**",
    "destination": "/",
    "type": 301
  }
]
```

**현재 상태:** ✅ **redirect 없음** (정상)

---

## 🎯 최종 진단 체크리스트

### 즉시 확인 (필수)

1. [ ] PC 브라우저에서 `https://yagovibe.com/qr-login?sessionId=test` 접속
   - 결과: 전화번호 화면 표시 ✅ / 홈으로 튐 ❌
2. [ ] Cloudflare 사용 여부
   - YES / NO
3. [ ] Cloudflare Proxy 상태
   - DNS only (회색 구름) ✅ / Proxied (주황 구름) ❌

---

## 🔧 예상 수정 사항 (결과에 따라)

### 케이스 A: PC 브라우저에서 홈으로 튐

**원인:** Cloudflare 또는 DNS 레벨에서 쿼리 스트링 제거

**수정:**
1. Cloudflare → DNS only (회색 구름)로 변경
2. Cloudflare → Page Rules에서 query strip 제거
3. Cloudflare → Always Use HTTPS OFF

---

### 케이스 B: PC 브라우저에서 정상 표시

**원인:** 모바일 브라우저/스캐너 앱 문제

**수정:**
- 인앱 브라우저 감지 로직 추가 완료 ✅
- 추가 UX 개선 필요할 수 있음

---

## 👉 다음 액션

**아래 결과만 알려주세요:**

1. **PC 브라우저에서 `https://yagovibe.com/qr-login?sessionId=test` 접속 결과**
   - 전화번호 화면 표시 ✅
   - 홈으로 튐 ❌
   - 다른 화면 (어디로 가는지)

2. **Cloudflare 사용 여부**
   - YES / NO

3. **Cloudflare Proxy 상태** (사용 중인 경우)
   - DNS only (회색 구름) ✅
   - Proxied (주황 구름) ❌

---

**결과를 알려주시면 정확한 수정 지점을 안내하겠습니다.** 🔧
