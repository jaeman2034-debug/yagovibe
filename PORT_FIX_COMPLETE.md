# ✅ 포트 설정 불일치 해결 완료

## 🔍 발견된 문제

**포트 불일치**:
- `vite.config.ts`: 포트 `5178`로 설정
- 브라우저 접속: `localhost:5179`
- 서버 리스닝: 포트 `5179` (다른 프로세스?)

## ✅ 해결 방법

### `vite.config.ts` 포트를 5179로 변경

```typescript
server: {
  port: 5179,  // 5178 → 5179로 변경
  // ...
}
```

## 🚀 서버 재시작

### 방법 1: 수동 재시작
```bash
# 1. 현재 서버 중지 (Ctrl + C)
# 2. 재시작
npm run dev
```

### 방법 2: PowerShell 원라이너
```powershell
Get-Process node | Stop-Process -Force; Start-Sleep -Seconds 2; npm run dev
```

## ✅ 확인 사항

서버 재시작 후:
- `https://localhost:5179` 접속
- Vite 시작 메시지 확인: "VITE vX.X.X ready"
- 콘솔에 "Local: https://localhost:5179" 표시 확인

## 🐛 여전히 오류가 발생하면

1. **포트 충돌 확인**
   ```powershell
   netstat -ano | findstr :5179
   ```
   - 다른 프로세스가 사용 중이면 종료

2. **HTTPS 인증서 문제**
   - `localhost-key.pem`, `localhost.pem` 파일 확인
   - 인증서 재생성 필요 시:
     ```bash
     # mkcert 사용 (설치되어 있는 경우)
     mkcert -install
     mkcert localhost 127.0.0.1
     ```

3. **캐시 클리어**
   ```powershell
   Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
   npm run dev
   ```

---

**포트 설정을 5179로 통일했습니다!**
서버를 재시작하면 정상 작동할 것입니다.

