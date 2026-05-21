# 🔧 배포 문제 해결 가이드

## ❌ "허브를 불러올 수 없습니다" 오류

### 증상
- 배포된 사이트 접속 시 "허브를 불러올 수 없습니다" 오류
- 네트워크 문제나 캐시 문제로 인한 페이지 로드 실패

### 원인
1. **JavaScript 파일 경로 문제**
   - 빌드된 파일의 경로가 상대 경로로 되어 있어서 문제 발생
   - Firebase Hosting의 rewrites 설정 문제

2. **Lazy Loading 실패**
   - `HubHome` 컴포넌트가 lazy load되면서 실패
   - JavaScript 파일이 제대로 로드되지 않음

3. **캐시 문제**
   - 브라우저 캐시가 오래된 파일을 사용
   - Firebase Hosting 캐시 문제

---

## ✅ 해결 방법

### 1. 브라우저 캐시 클리어
```
Ctrl + Shift + R (강력 새로고침)
또는
시크릿 모드에서 접속
```

### 2. 브라우저 콘솔 확인
1. `F12`로 개발자 도구 열기
2. `Console` 탭에서 JavaScript 오류 확인
3. `Network` 탭에서 실패한 파일 확인

### 3. Firebase Hosting 설정 확인
`firebase.json`의 `rewrites` 설정이 올바른지 확인:
```json
"rewrites": [
  {
    "source": "**",
    "destination": "/index.html"
  }
]
```

### 4. 빌드 파일 경로 확인
`dist/index.html`에서 JavaScript 파일 경로가 상대 경로(`./assets/...`)로 되어 있는지 확인

---

## 🔍 디버깅 체크리스트

- [ ] 브라우저 콘솔에서 JavaScript 오류 확인
- [ ] Network 탭에서 실패한 파일 확인
- [ ] `dist/index.html`의 스크립트 경로 확인
- [ ] Firebase Hosting의 rewrites 설정 확인
- [ ] 브라우저 캐시 클리어 후 재시도

---

## 🚀 추가 조치

### 빌드 재실행
```powershell
npm run build
firebase deploy --only hosting --force
```

### Firebase Hosting 캐시 클리어
Firebase Console → Hosting → 캐시 무효화

---

## 📞 문제 지속 시

1. 브라우저 콘솔 스크린샷
2. Network 탭 스크린샷
3. `dist/index.html` 내용 확인
4. Firebase Hosting 로그 확인
