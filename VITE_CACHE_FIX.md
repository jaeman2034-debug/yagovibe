# 🔥 Vite Lazy Import 캐시 문제 해결 가이드

## ❌ 현재 문제

**에러:**
```
Failed to fetch dynamically imported module: https://localhost:5173/app/market
```

**확인된 설정:**
- ✅ `vite.config.ts`: `base: '/'`, alias 설정됨
- ✅ `tsconfig.app.json`: paths 설정됨
- ✅ MarketPage: lazy import + catch 에러 처리
- ✅ MarketPage 파일 존재 (`src/pages/market/MarketPage.tsx`)

---

## 🔧 해결 방법 (우선순위 순)

### 1단계: Vite 캐시 삭제 + 서버 재시작 (가장 중요)

```bash
# 1. 개발 서버 종료 (Ctrl + C)

# 2. Vite 캐시 삭제
rm -rf node_modules/.vite
# 또는 Windows PowerShell:
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue

# 3. 개발 서버 재시작
npm run dev
```

**예상 결과:**
- Vite가 모든 chunk 파일을 다시 생성
- lazy import 정상 작동

---

### 2단계: 브라우저 캐시 완전 삭제

**방법 1: 개발자 도구**
1. **F12 (개발자 도구 열기)**
2. **Application 탭**
3. **Storage → Clear site data**
4. **강력 새로고침 (Ctrl + Shift + R)**

**방법 2: 브라우저 설정**
- Chrome: 설정 → 개인정보 보호 및 보안 → 인터넷 사용 기록 삭제
- Edge: 설정 → 개인정보, 검색 및 서비스 → 검색 데이터 지우기

---

### 3단계: Network 탭에서 chunk 파일 확인

1. **F12 → Network 탭**
2. **페이지 새로고침**
3. **JS 파일 필터**
4. **다음 파일들 확인:**
   - `chunk-xxxx.js` (404 여부)
   - `MarketPage.xxxx.js` (404 여부)
   - `index-xxxx.js` (404 여부)

**문제 발견 시:**
- 404 에러 → chunk 파일 경로 문제
- CORS 에러 → Vite 서버 설정 문제
- 타임아웃 → 네트워크 문제

---

### 4단계: MarketPage 직접 import로 테스트 (임시)

**App.tsx 수정:**

```typescript
// lazy import 제거
import MarketPage from "./pages/market/MarketPage";

// Route에서
<Route path="/app/market" element={<MarketPage />} />
```

**이게 작동하면:**
- ✅ lazy import 문제 확정
- ✅ Vite chunk 생성 문제

---

## 🎯 빠른 해결 스크립트

**PowerShell (Windows):**

```powershell
# Vite 캐시 삭제
Write-Host "🧹 Vite 캐시 삭제 중..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
Write-Host "✅ 캐시 삭제 완료" -ForegroundColor Green
Write-Host "`n🚀 개발 서버 재시작: npm run dev" -ForegroundColor Cyan
```

**Bash (Mac/Linux):**

```bash
# Vite 캐시 삭제
echo "🧹 Vite 캐시 삭제 중..."
rm -rf node_modules/.vite
echo "✅ 캐시 삭제 완료"
echo ""
echo "🚀 개발 서버 재시작: npm run dev"
```

---

## 📝 참고

### Vite HMR 캐시 문제

- Vite는 개발 모드에서 HMR(Hot Module Replacement)을 사용
- chunk 파일이 변경되면 자동으로 재생성되어야 함
- 하지만 캐시 문제로 옛날 chunk를 참조할 수 있음

### 해결 원리

1. **Vite 캐시 삭제**: `node_modules/.vite` 폴더 삭제
2. **브라우저 캐시 삭제**: 옛날 chunk 파일 참조 제거
3. **서버 재시작**: 모든 chunk 파일 재생성

---

## ✅ 체크리스트

- [ ] Vite 캐시 삭제 (`node_modules/.vite`)
- [ ] 브라우저 캐시 삭제 (Application → Clear site data)
- [ ] 개발 서버 재시작 (`npm run dev`)
- [ ] 강력 새로고침 (Ctrl + Shift + R)
- [ ] Network 탭에서 chunk 파일 확인 (404 없음)
- [ ] MarketPage 정상 로드 확인

---

## 🚨 여전히 문제가 있다면

1. **Network 탭 스크린샷** 보내주세요
2. **콘솔 에러 전체** 복사해주세요
3. **Vite 서버 로그** 확인해주세요
