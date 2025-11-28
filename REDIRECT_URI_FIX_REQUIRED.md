# 🔧 리디렉션 URI 수정 필요

## ❌ 현재 설정 (잘못됨)

```
https://yago-vibe-spt.web.app/_/auth/handler
https://yago-vibe-spt.firebaseapp.com/_/auth/handler
http://localhost:5174/_/auth/handler
http://localhost:5173/_/auth/handler
```

**문제**: `_/auth/handler` (언더스코어 1개)

## ✅ 올바른 설정

```
https://yago-vibe-spt.web.app/__/auth/handler
https://yago-vibe-spt.firebaseapp.com/__/auth/handler
http://localhost:5174/__/auth/handler
http://localhost:5173/__/auth/handler
```

**올바름**: `__/auth/handler` (언더스코어 2개)

## 🔧 수정 방법

1. **Google Cloud Console → APIs & Services → Credentials**
2. OAuth 2.0 클라이언트 ID 클릭
3. **"승인된 리디렉션 URI"** 섹션에서 각 URI 수정:

   **URI 1 수정:**
   - 기존: `https://yago-vibe-spt.web.app/_/auth/handler`
   - 수정: `https://yago-vibe-spt.web.app/__/auth/handler`

   **URI 2 수정:**
   - 기존: `https://yago-vibe-spt.firebaseapp.com/_/auth/handler`
   - 수정: `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`

   **URI 3 수정:**
   - 기존: `http://localhost:5174/_/auth/handler`
   - 수정: `http://localhost:5174/__/auth/handler`

   **URI 4 수정:**
   - 기존: `http://localhost:5173/_/auth/handler`
   - 수정: `http://localhost:5173/__/auth/handler`

4. **저장** 클릭

## ⚠️ 중요

- 모든 URI에서 `_/auth` → `__/auth`로 변경 (언더스코어 1개 → 2개)
- 슬래시(`/`)와 언더스코어(`_`)를 정확히 확인
- 저장 후 브라우저 새로고침 (Ctrl+Shift+R)

## 📝 수정 후 확인

1. 모든 URI가 `__/auth/handler` (언더스코어 2개)로 변경되었는지 확인
2. 저장 클릭
3. 브라우저 새로고침
4. Google 로그인 재시도

