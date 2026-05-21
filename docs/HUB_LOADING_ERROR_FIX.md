# 🔧 "허브를 불러올 수 없습니다" 오류 해결

## 🔍 원인 분석

### 문제
- `/home` 경로 접속 시 "허브를 불러올 수 없습니다" 오류
- `HubHome` 컴포넌트 lazy loading 실패

### 원인
1. **JavaScript 파일 로딩 실패**
   - 빌드된 파일이 제대로 업로드되지 않음
   - 브라우저 캐시 문제

2. **Lazy Import 실패**
   - `HubHome` 컴포넌트 import 경로 문제
   - 모듈 해석 실패

---

## ✅ 해결 방법

### 1. 브라우저 콘솔 확인 (가장 중요!)

1. `F12`로 개발자 도구 열기
2. `Console` 탭에서 오류 확인
3. `Network` 탭에서 실패한 파일 확인

**확인할 오류:**
- `Failed to load module script`
- `404 Not Found` (JavaScript 파일)
- `ChunkLoadError`

---

### 2. 브라우저 캐시 클리어

```
Ctrl + Shift + R (강력 새로고침)
또는
시크릿 모드에서 접속
```

---

### 3. 빌드 및 재배포

```powershell
# 빌드
npm run build

# 재배포
firebase deploy --only hosting --force
```

---

### 4. Firebase Hosting 캐시 확인

Firebase Console → Hosting → 캐시 무효화

---

## 🔍 디버깅 체크리스트

- [ ] 브라우저 콘솔 오류 확인
- [ ] Network 탭에서 실패한 파일 확인
- [ ] `dist/index.html`의 스크립트 경로 확인
- [ ] 브라우저 캐시 클리어
- [ ] 빌드 재실행
- [ ] 재배포

---

## 📊 예상 오류 메시지

### JavaScript 파일 로딩 실패
```
Failed to load module script: The server responded with a non-JavaScript MIME type
```

### Chunk 로딩 실패
```
ChunkLoadError: Loading chunk X failed
```

### 404 오류
```
GET https://yago-vibe-spt.web.app/assets/index-XXX.js 404 (Not Found)
```

---

## 🚀 빠른 해결

### 방법 1: 강력 새로고침
```
Ctrl + Shift + R
```

### 방법 2: 시크릿 모드
```
Ctrl + Shift + N (Chrome)
```

### 방법 3: 재배포
```powershell
npm run build
firebase deploy --only hosting --force
```

---

## 📞 문제 지속 시

1. **브라우저 콘솔 스크린샷** (가장 중요!)
2. **Network 탭 스크린샷**
3. **실패한 파일 목록**

이 정보를 제공하면 정확한 원인을 파악할 수 있습니다.
