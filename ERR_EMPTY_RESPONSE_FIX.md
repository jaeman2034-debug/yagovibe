# 🔥 ERR_EMPTY_RESPONSE 에러 해결 가이드

## ❌ 현재 문제

**에러:**
```
ERR_EMPTY_RESPONSE
localhost 데이터를 보내지 않았습니다.
```

**포트 상태:**
- 포트 5173: LISTENING (서버 실행 중)
- PID: 9528
- 하지만 응답하지 않음

**원인:**
- 서버가 요청을 받지만 응답하지 않음
- 서버 크래시 또는 무한 루프 가능성
- Vite HMR 문제

---

## ✅ 해결 방법 (순서대로)

### 1단계: 기존 서버 프로세스 종료

```powershell
taskkill /PID 9528 /F
```

**확인:**
```powershell
netstat -ano | findstr :5173
```
→ 아무것도 안 나오면 성공

---

### 2단계: Vite 캐시 삭제

```powershell
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
```

---

### 3단계: 개발 서버 재시작

```powershell
npm run dev
```

**성공 시 보여야 할 메시지:**
```
➜ Local: https://localhost:5173/
➜ Network: use --host to expose
```

---

### 4단계: 브라우저 접속 확인

```
✅ https://localhost:5173/app/map
✅ https://localhost:5173/app/market
```

**주의:**
- `http://` ❌
- `https://` ✅ (Vite가 HTTPS 사용)

---

## 🚨 여전히 문제가 있다면

### 추가 확인 사항

1. **터미널에서 서버 로그 확인**
   - 에러 메시지가 있는지 확인
   - 빌드 실패 메시지 확인

2. **포트 충돌 확인**
   ```powershell
   netstat -ano | findstr :5173
   ```
   - 다른 프로세스가 사용 중인지 확인

3. **SSL 인증서 문제**
   - 브라우저에서 인증서 경고가 있는지 확인
   - "고급" → "계속 진행" 클릭

4. **브라우저 캐시 완전 삭제**
   - F12 → Application → Storage → Clear site data
   - 강력 새로고침 (Ctrl + Shift + R)

---

## 💡 참고

### ERR_EMPTY_RESPONSE 의미

- 서버가 요청을 받았지만 응답을 보내지 않음
- 서버가 크래시되었거나
- 서버가 무한 루프에 빠졌거나
- Vite HMR 문제

### 일반적인 해결책

1. **서버 재시작** (가장 효과적)
2. **Vite 캐시 삭제** (HMR 문제)
3. **포트 확인** (다른 프로세스가 사용 중인지)
4. **브라우저 캐시 삭제** (옛날 연결 정보)

---

## ✅ 체크리스트

- [ ] 기존 서버 프로세스 종료
- [ ] Vite 캐시 삭제
- [ ] 개발 서버 재시작
- [ ] 서버 로그 확인 (에러 없음)
- [ ] 브라우저에서 https://localhost:5173 접속 확인
- [ ] /app/map, /app/market 접속 테스트
